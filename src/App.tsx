import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Editor, { useMonaco } from '@monaco-editor/react';
import { 
  Folder, File, FileCode, FileJson, FileText, ChevronRight, ChevronDown, 
  Plus, FolderPlus, ListCollapse, X, Play, Settings, GitBranch, 
  MessageSquare, Send, Loader2, Check, Terminal as TerminalIcon, MessageSquareCode,
  Trash2, Edit2
} from 'lucide-react';

const getLanguageFromExtension = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'py': return 'python';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'html': return 'html';
    case 'css': return 'css';
    default: return 'plaintext';
  }
};

const getFileIcon = (filename: string) => {
  if (filename.endsWith('.js') || filename.endsWith('.ts')) return <FileCode size={16} className="text-yellow-400" />;
  if (filename.endsWith('.py')) return <FileCode size={16} className="text-blue-400" />;
  if (filename.endsWith('.json')) return <FileJson size={16} className="text-green-400" />;
  if (filename.endsWith('.md')) return <FileText size={16} className="text-blue-300" />;
  if (filename.endsWith('.html')) return <FileCode size={16} className="text-orange-400" />;
  if (filename.endsWith('.css')) return <FileCode size={16} className="text-blue-300" />;
  return <File size={16} className="text-gray-400" />;
};

const initialFiles: Record<string, { content: string, language: string }> = {
  '/index.js': {
    language: 'javascript',
    content: `// A small async fetch function with a bug
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`https://jsonplaceholder.typicode.com/users/\${userId}\`);
    const data = await response.json(); // Fixed the bug here for demonstration
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Click the "Run" button in the top right to execute this code!
fetchUserData(1).then(user => {
  console.log("Fetched User:", user.name);
});
`
  },
  '/utils.py': {
    language: 'python',
    content: `def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def is_even(n):
    return n % 2 == 0
`
  },
  '/README.md': {
    language: 'markdown',
    content: `# My Project
This is a sample project loaded in the AI IDE.
Feel free to ask the AI agent to explain or improve the code!

## Features
- Monaco Editor integration
- Real file management (Create, Rename, Delete)
- Run JavaScript code directly in the browser
- AI Assistant powered by Gemini
`
  }
};

export default function App() {
  const [files, setFiles] = useState<Record<string, { content: string, language: string }>>(initialFiles);
  const [activeFile, setActiveFile] = useState<string | null>('/index.js');
  const [openFiles, setOpenFiles] = useState<string[]>(['/index.js', '/utils.py', '/README.md']);
  
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [aiPanelWidth, setAiPanelWidth] = useState(350);
  const [terminalHeight, setTerminalHeight] = useState(200);
  
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingAi, setIsResizingAi] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);

  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI coding assistant. How can I help you with your code today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const monaco = useMonaco();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput, isTerminalOpen]);

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('my-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1e1e1e',
        }
      });
      monaco.editor.setTheme('my-dark');
    }
  }, [monaco]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        setSidebarWidth(Math.max(150, Math.min(e.clientX, 400)));
      } else if (isResizingAi) {
        setAiPanelWidth(Math.max(250, Math.min(window.innerWidth - e.clientX, 600)));
      } else if (isResizingTerminal) {
        setTerminalHeight(Math.max(100, Math.min(window.innerHeight - e.clientY - 30, 600)));
      }
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingAi(false);
      setIsResizingTerminal(false);
    };
    if (isResizingSidebar || isResizingAi || isResizingTerminal) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingAi, isResizingTerminal]);

  const handleFileClick = (filename: string) => {
    if (!openFiles.includes(filename)) {
      setOpenFiles([...openFiles, filename]);
    }
    setActiveFile(filename);
  };

  const handleCloseFile = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(f => f !== filename);
    setOpenFiles(newOpenFiles);
    if (activeFile === filename) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!activeFile || value === undefined) return;
    setFiles({
      ...files,
      [activeFile]: { ...files[activeFile], content: value }
    });
  };

  const handleNewFile = () => {
    const name = prompt('Enter new file name (e.g., script.js):');
    if (name) {
      const path = name.startsWith('/') ? name : '/' + name;
      if (!files[path]) {
        setFiles({ ...files, [path]: { content: '', language: getLanguageFromExtension(name) } });
        setOpenFiles([...openFiles, path]);
        setActiveFile(path);
      } else {
        alert('File already exists!');
      }
    }
  };

  const handleDeleteFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${path}?`)) {
      const newFiles = { ...files };
      delete newFiles[path];
      setFiles(newFiles);
      
      const newOpenFiles = openFiles.filter(f => f !== path);
      setOpenFiles(newOpenFiles);
      if (activeFile === path) {
        setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
      }
    }
  };

  const handleRenameFile = (e: React.MouseEvent, oldPath: string) => {
    e.stopPropagation();
    const newName = prompt(`Rename ${oldPath} to:`, oldPath.replace('/', ''));
    if (newName) {
      const newPath = newName.startsWith('/') ? newName : '/' + newName;
      if (newPath === oldPath) return;
      if (files[newPath]) {
        alert('A file with that name already exists!');
        return;
      }
      
      const newFiles = { ...files };
      newFiles[newPath] = { ...newFiles[oldPath], language: getLanguageFromExtension(newName) };
      delete newFiles[oldPath];
      setFiles(newFiles);
      
      const newOpenFiles = openFiles.map(f => f === oldPath ? newPath : f);
      setOpenFiles(newOpenFiles);
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      }
    }
  };

  const runCode = async () => {
    if (!activeFile || files[activeFile].language !== 'javascript') {
      alert('Only JavaScript files can be run in the browser.');
      return;
    }
    
    setIsTerminalOpen(true);
    setTerminalOutput(prev => [...prev, `> Running ${activeFile}...`]);
    
    const code = files[activeFile].content;
    
    const originalLog = console.log;
    const originalError = console.error;
    
    const logs: string[] = [];
    console.log = (...args) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      originalLog(...args);
    };
    console.error = (...args) => {
      logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      originalError(...args);
    };
    
    try {
      // Create an async function to allow top-level await in the eval-like execution
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const execute = new AsyncFunction(code);
      
      await execute();
      setTerminalOutput(prev => [...prev, ...logs, '> Execution finished successfully.']);
    } catch (err: any) {
      logs.push('[ERROR] ' + String(err));
      setTerminalOutput(prev => [...prev, ...logs, '> Execution finished with errors.']);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    
    try {
      const currentFile = activeFile ? files[activeFile] : null;
      
      // Build context of all files
      const allFilesContext = Object.entries(files).map(([path, file]: [string, any]) => {
        return `File: ${path}\n\`\`\`${file.language}\n${file.content}\n\`\`\``;
      }).join('\n\n');

      const systemInstruction = `You are an expert coding assistant embedded in an IDE. 
The user's current active file is ${activeFile || 'none'}.
Here is the complete file system context:
${allFilesContext}

Help them write, debug, explain, and improve their code.
If you suggest code replacements, format them clearly in markdown code blocks.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents = messages.filter(m => m.role !== 'assistant' || m.content).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: userMsg }] });
      
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-pro-preview',
        contents,
        config: { systemInstruction }
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      let fullText = '';
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = fullText;
          return newMsgs;
        });
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ AI unavailable: ' + error.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyCode = (code: string) => {
    if (activeFile) {
      setFiles({
        ...files,
        [activeFile]: { ...files[activeFile], content: code }
      });
    }
  };

  const renderMessage = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const lang = match ? match[1] : '';
        const code = match ? match[2] : part.slice(3, -3);
        
        return (
          <div key={index} className="my-4 rounded-md overflow-hidden border border-[#3e3e3e]">
            <div className="flex justify-between items-center bg-[#2d2d30] px-3 py-1.5 text-xs text-[#cccccc]">
              <span className="font-mono">{lang || 'code'}</span>
              <button 
                onClick={() => applyCode(code)}
                className="flex items-center gap-1.5 hover:text-white text-[#007acc] transition-colors"
                title="Replace current file content"
              >
                <Check size={14} /> Apply to Editor
              </button>
            </div>
            <pre className="p-3 bg-[#1e1e1e] overflow-x-auto text-[13px] font-mono text-[#d4d4d4]">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return <p key={index} className="whitespace-pre-wrap text-[14px] leading-relaxed mb-2">{part}</p>;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <div 
          style={{ width: sidebarWidth }} 
          className="flex-shrink-0 bg-[#252526] border-r border-[#3e3e3e] flex flex-col"
        >
          <div className="px-4 py-2 text-xs font-semibold tracking-wider text-[#cccccc] uppercase flex justify-between items-center">
            <span>Explorer</span>
            <div className="flex gap-2">
              <Plus size={14} className="cursor-pointer hover:text-white" onClick={handleNewFile} title="New File" />
              <ListCollapse size={14} className="cursor-pointer hover:text-white" title="Collapse All" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-2 flex items-center gap-1 text-sm font-bold text-white mb-1 cursor-pointer">
              <ChevronDown size={16} />
              <span>MY-PROJECT</span>
            </div>
            <div className="pl-6">
              {Object.keys(files).sort().map(path => (
                <div 
                  key={path}
                  onClick={() => handleFileClick(path)}
                  className={`group flex items-center justify-between px-2 py-1 text-sm cursor-pointer hover:bg-[#2a2d2e] ${activeFile === path ? 'bg-[#37373d] text-white' : 'text-[#cccccc]'}`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {getFileIcon(path)}
                    <span className="truncate">{path.replace('/', '')}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 
                      size={14} 
                      className="hover:text-white" 
                      onClick={(e) => handleRenameFile(e, path)}
                      title="Rename"
                    />
                    <Trash2 
                      size={14} 
                      className="hover:text-red-400" 
                      onClick={(e) => handleDeleteFile(e, path)}
                      title="Delete"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Resizer */}
        <div 
          className="w-1 cursor-col-resize hover:bg-[#007acc] active:bg-[#007acc] z-10 transition-colors"
          onMouseDown={() => setIsResizingSidebar(true)}
        />

        {/* Editor & Terminal Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Tabs & Actions */}
          <div className="flex bg-[#252526] justify-between items-center pr-4">
            <div className="flex overflow-x-auto no-scrollbar">
              {openFiles.map(path => (
                <div 
                  key={path}
                  onClick={() => setActiveFile(path)}
                  className={`group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-t-2 min-w-fit ${activeFile === path ? 'bg-[#1e1e1e] border-[#007acc] text-white' : 'bg-[#2d2d2d] border-transparent text-[#969696] hover:bg-[#2b2b2b]'}`}
                >
                  {getFileIcon(path)}
                  <span>{path.replace('/', '')}</span>
                  <X 
                    size={14} 
                    className={`ml-1 rounded hover:bg-[#444444] ${activeFile === path ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => handleCloseFile(e, path)}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              {activeFile && files[activeFile].language === 'javascript' && (
                <button 
                  onClick={runCode}
                  className="flex items-center gap-1.5 text-xs bg-[#007acc] hover:bg-[#005c99] text-white px-2 py-1 rounded transition-colors"
                >
                  <Play size={12} /> Run
                </button>
              )}
              <button 
                onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${isTerminalOpen ? 'bg-[#4d4d4d] text-white' : 'text-[#cccccc] hover:bg-[#333333]'}`}
              >
                <TerminalIcon size={12} /> Terminal
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 relative">
            {activeFile ? (
              <Editor
                height="100%"
                language={files[activeFile].language}
                theme="my-dark"
                value={files[activeFile].content}
                onChange={handleCodeChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  formatOnPaste: true,
                }}
              />
            ) : (
              <div className="flex-1 h-full flex items-center justify-center text-[#858585]">
                <div className="text-center">
                  <MessageSquareCode size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Select a file to start coding</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          {isTerminalOpen && (
            <>
              {/* Terminal Resizer */}
              <div 
                className="h-1 cursor-row-resize hover:bg-[#007acc] active:bg-[#007acc] z-10 transition-colors"
                onMouseDown={() => setIsResizingTerminal(true)}
              />
              <div 
                style={{ height: terminalHeight }}
                className="bg-[#1e1e1e] border-t border-[#3e3e3e] flex flex-col"
              >
                <div className="px-4 py-1.5 border-b border-[#3e3e3e] flex justify-between items-center text-xs text-[#cccccc] uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <TerminalIcon size={14} />
                    <span>Output</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTerminalOutput([])} className="hover:text-white" title="Clear Output">
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => setIsTerminalOpen(false)} className="hover:text-white" title="Close Terminal">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 font-mono text-[13px] text-[#cccccc] whitespace-pre-wrap">
                  {terminalOutput.length === 0 ? (
                    <span className="text-[#858585] italic">No output yet. Run a JavaScript file to see results here.</span>
                  ) : (
                    terminalOutput.map((line, i) => (
                      <div key={i} className={line.startsWith('[ERROR]') ? 'text-red-400' : line.startsWith('>') ? 'text-[#007acc]' : 'text-[#cccccc]'}>
                        {line}
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* AI Panel Resizer */}
        <div 
          className="w-1 cursor-col-resize hover:bg-[#007acc] active:bg-[#007acc] z-10 transition-colors"
          onMouseDown={() => setIsResizingAi(true)}
        />

        {/* AI Panel */}
        <div 
          style={{ width: aiPanelWidth }}
          className="flex-shrink-0 bg-[#1f1f2e] border-l border-[#3e3e3e] flex flex-col"
        >
          <div className="px-4 py-3 border-b border-[#3e3e3e] flex items-center gap-2 font-medium text-white">
            <TerminalIcon size={16} className="text-[#007acc]" />
            AI Agent
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] rounded-lg px-4 py-3 ${msg.role === 'user' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d3d] text-[#cccccc]'}`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-[14px]">{msg.content}</p>
                  ) : (
                    <div className="ai-message">
                      {msg.content ? renderMessage(msg.content) : <Loader2 size={16} className="animate-spin text-[#007acc]" />}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-[#3e3e3e] bg-[#1f1f2e]">
            <div className="flex items-end gap-2 bg-[#2d2d3d] rounded-md border border-[#3e3e3e] focus-within:border-[#007acc] p-2 transition-colors">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about your code..."
                className="flex-1 bg-transparent resize-none outline-none text-[14px] max-h-32 min-h-[24px] text-white placeholder-[#858585]"
                rows={1}
                style={{ height: '24px' }}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="p-1.5 rounded text-white bg-[#007acc] hover:bg-[#005c99] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-xs font-medium select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded">
            <GitBranch size={12} />
            <span>main</span>
          </div>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded">
            <X size={12} />
            <span>0</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {activeFile && (
            <>
              <div className="cursor-pointer hover:bg-white/20 px-1 rounded capitalize">
                {files[activeFile].language}
              </div>
            </>
          )}
          <div className="cursor-pointer hover:bg-white/20 px-1 rounded">
            UTF-8
          </div>
        </div>
      </div>
    </div>
  );
}
