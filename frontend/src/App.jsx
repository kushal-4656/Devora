import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Mic, Copy, Volume2, VolumeX, Plus, MessageSquare, Menu, X, Play, Pause, Edit2, LogOut } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import './styles/index.css';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [personality, setPersonality] = useState('Friend');
  const [mode, setMode] = useState('Normal Mode');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentlySpeaking, setCurrentlySpeaking] = useState(null);
  const [speakState, setSpeakState] = useState('stopped'); // 'playing', 'paused', 'stopped'
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const chatAreaRef = useRef(null);
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState('');
  const [editingMessageIdx, setEditingMessageIdx] = useState(null);
  const inputRef = useRef(null);

  // Stop speech when window is closed or refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      window.speechSynthesis.cancel();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [token]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // Load chats when authenticated
  useEffect(() => {
    document.title = 'Chat | Devora';
    if (token) {
      fetchChats();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [token]);

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_BASE}/chats`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setChats(data.chats || []);
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  const loadChat = async (chatId) => {
    try {
      const res = await fetch(`${API_BASE}/chat/${chatId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load chat");
      const data = await res.json();
      setCurrentChatId(data.chat_id);
      setMessages(data.messages || []);
      // Auto-close sidebar on mobile after selecting a chat
      if (window.innerWidth <= 768) setSidebarOpen(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error(err);
    }
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    // Auto-close sidebar on mobile after starting new chat
    if (window.innerWidth <= 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handlePersonalityChange = async (e) => {
    const val = e.target.value;
    setPersonality(val);
    await fetch(`${API_BASE}/set-personality`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ personality: val })
    });
  };

  const handleModeChange = async (e) => {
    const val = e.target.value;
    setMode(val);
    await fetch(`${API_BASE}/set-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ mode: val })
    });
  };

  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText !== null ? overrideText : input;
    if (!textToSend.trim()) return;

    // ALWAYS stop speaking when generating a new response, just in case
    window.speechSynthesis.cancel();
    if (currentlySpeaking !== null || speakState === 'playing') {
      setCurrentlySpeaking(null);
      setSpeakState('stopped');
    }

    let targetChatId = currentChatId;
    let newMessagesList = [...messages];

    // Handle Edit Mode
    if (editingMessageIdx !== null && messages[editingMessageIdx]) {
      const msgId = messages[editingMessageIdx].id;
      if (msgId && targetChatId) {
        await fetch(`${API_BASE}/truncate-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ message_id: msgId, chat_id: targetChatId })
        }).catch(console.error);
      }
      newMessagesList = messages.slice(0, editingMessageIdx);
      setEditingMessageIdx(null);
    }

    const userMessage = { role: 'user', content: textToSend };
    newMessagesList.push(userMessage);
    setMessages(newMessagesList);
    if (overrideText === null) setInput('');
    setIsTyping(true);
    setScreenReaderAnnouncement('Generating response...');

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          chat_id: targetChatId
        })
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantMessage = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.chat_id && currentChatId !== data.chat_id) {
                setCurrentChatId(data.chat_id);
                fetchChats(); // Refresh sidebar
              }
              if (data.chunk) {
                assistantMessage.content += data.chunk;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...assistantMessage };
                  return newMsgs;
                });
              }
              if (data.done) {
                setIsTyping(false);
                setScreenReaderAnnouncement('Response completed.');
              }
            } catch (e) {
              console.error("Error parsing SSE:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
      setScreenReaderAnnouncement('Error generating response.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSpeak = async (idx, text) => {
    if (currentlySpeaking === idx && speakState === 'playing') {
      window.speechSynthesis.cancel();
      setSpeakState('stopped');
      setCurrentlySpeaking(null);
    } else {
      // Force stop any existing speech before starting new
      window.speechSynthesis.cancel();
      
      setCurrentlySpeaking(idx);
      setSpeakState('playing');
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setCurrentlySpeaking(prev => {
          if (prev === idx) {
            setSpeakState('stopped');
            return null;
          }
          return prev;
        });
      };
      utterance.onerror = (e) => {
        console.error("Speech error", e);
        setCurrentlySpeaking(prev => {
          if (prev === idx) {
            setSpeakState('stopped');
            return null;
          }
          return prev;
        });
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = async () => {
    try {
      setIsRecording(true);
      const res = await fetch(`${API_BASE}/listen`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
            handleSend(data.text);
        }
      }
    } catch (e) {
      console.error("Listen error", e);
    } finally {
      setIsRecording(false);
    }
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      {/* Mobile overlay backdrop */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      {/* Screen Reader Live Region */}
      <div aria-live="polite" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>
        {screenReaderAnnouncement}
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Chat with Devora</h2>
          <div style={{display: 'flex', gap: '8px'}}>
            <button className="sidebar-toggle-btn" onClick={() => { setToken(null); localStorage.removeItem('token'); navigate('/login'); }} aria-label="Logout" title="Logout">
              <LogOut size={20} />
            </button>
            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(false)} aria-label="Close Sidebar" title="Close Sidebar">
              <X size={20} />
            </button>
          </div>
        </div>
        <button className="new-chat-btn" onClick={startNewChat}>
          <Plus size={18} /> New Chat
        </button>
        <div className="chat-list">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
              onClick={() => loadChat(chat.id)}
            >
              <MessageSquare size={14} style={{display: 'inline', marginRight: '8px'}} />
              {chat.title}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {!sidebarOpen && (
          <button className="sidebar-toggle-btn absolute-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open Sidebar" style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
            <Menu size={24} />
          </button>
        )}
        <div className="chat-area" ref={chatAreaRef}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
              <h3>How can I help you today?</h3>
              <p>Select a personality and mode, then start chatting!</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message-wrapper ${msg.role}`}>
                <h3 className="sr-only">{msg.role === 'user' ? 'You said:' : 'AI Assistant said:'}</h3>
                <div className={`message ${msg.role}`}>
                  <div className={`markdown-body ${isTyping && idx === messages.length - 1 && msg.role === 'assistant' ? 'typing' : ''}`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({node, inline, className, children, ...props}) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline ? (
                              <div className="code-block-wrapper">
                                <div className="code-block-header">
                                  <span className="code-language">{match ? match[1] : 'code'}</span>
                                  <button 
                                    className="code-copy-btn"
                                    onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}
                                    title="Copy code"
                                  >
                                    <Copy size={14} /> Copy
                                  </button>
                                </div>
                                <pre className={className} {...props}>
                                  <code>{children}</code>
                                </pre>
                              </div>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {msg.content || ' '}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                  
                  {/* Actions for Assistant */}
                  {msg.role === 'assistant' && (
                    <div className="message-actions">
                      <button className="action-btn" onClick={() => copyToClipboard(msg.content)} aria-label="Copy message">
                        <Copy size={16} />
                      </button>
                      <button className={`action-btn ${currentlySpeaking === idx ? 'speaking' : ''}`} onClick={() => toggleSpeak(idx, msg.content)} aria-label={currentlySpeaking === idx && speakState === 'playing' ? "Pause speaking" : "Listen to message"}>
                        {currentlySpeaking === idx && speakState === 'playing' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    </div>
                  )}

                  {/* Actions for User */}
                  {msg.role === 'user' && (
                    <div className="message-actions user-actions">
                      <button className="action-btn" onClick={() => copyToClipboard(msg.content)} aria-label="Copy message">
                        <Copy size={16} />
                      </button>
                      <button 
                        className="action-btn" 
                        aria-label="Edit message"
                        onClick={() => {
                          setInput(msg.content);
                          setEditingMessageIdx(idx);
                          inputRef.current?.focus();
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="input-area">
          <div className="bottom-controls">
            <select aria-label="Select Personality" value={personality} onChange={handlePersonalityChange}>
              <option value="Teacher">Teacher</option>
              <option value="Friend">Friend</option>
              <option value="Mentor">Mentor</option>
            </select>
            <select aria-label="Select Mode" value={mode} onChange={handleModeChange}>
              <option value="Exam Mode">Exam Mode</option>
              <option value="Deep Mode">Deep Mode</option>
              <option value="Normal Mode">Normal Mode</option>
            </select>
          </div>
          <div className="input-container">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={editingMessageIdx !== null ? "Edit your message..." : "Type your message here..."}
              rows={1}
              style={{ minHeight: '24px' }}
              aria-label="Chat input"
            />
            <button 
              className={`mic-btn ${isRecording ? 'recording' : ''}`} 
              aria-label="Voice input"
              onClick={startListening}
              disabled={isRecording}
            >
              <Mic size={20} />
            </button>
            <button className="send-btn" onClick={() => handleSend(null)} disabled={isTyping || (!input.trim() && !isRecording)} aria-label="Send message">
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
