import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Mic, Copy, Volume2, VolumeX, Plus, MessageSquare, Menu, X, Play, Pause, Edit2, LogOut } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import * as speechSdk from 'microsoft-cognitiveservices-speech-sdk';
import './styles/index.css';
import { API_BASE } from './config';
import { speak, stopSpeak, playPersonalityChime, getPersonalityConfig, PERSONALITY_PROFILES } from './speech';

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
  const recognizerRef = useRef(null);
  const newChatBtnRef = useRef(null);


  // Focus management for sidebar
  useEffect(() => {
    if (sidebarOpen) {
      setTimeout(() => newChatBtnRef.current?.focus(), 100);
    }
  }, [sidebarOpen]);

  // Stop speech when window is closed or refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopSpeak();
      if (recognizerRef.current) {
        recognizerRef.current.close();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopSpeak();
    };
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
    stopSpeak();
    setCurrentlySpeaking(null);
    setSpeakState('stopped');
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
    stopSpeak();
    setCurrentlySpeaking(null);
    setSpeakState('stopped');
    setCurrentChatId(null);
    setMessages([]);
    // Auto-close sidebar on mobile after starting new chat
    if (window.innerWidth <= 768) setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handlePersonalityChange = async (e) => {
    const val = e.target.value;
    setPersonality(val);
    try {
      await fetch(`${API_BASE}/set-personality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personality: val })
      });
    } catch (err) {
      console.warn("Could not sync personality with server:", err);
    }
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

    // ALWAYS stop speaking when generating a new response
    stopSpeak();
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
      stopSpeak();
      setSpeakState('stopped');
      setCurrentlySpeaking(null);
    } else {
      stopSpeak();
      setCurrentlySpeaking(idx);
      setSpeakState('playing');

      try {
        let tokenData = null;
        try {
          const tokenRes = await fetch(`${API_BASE}/api/speech-token`, { 
            headers: token ? { 'Authorization': `Bearer ${token}` } : {} 
          });
          if (tokenRes.ok) {
            tokenData = await tokenRes.json();
          }
        } catch (fetchErr) {
          console.warn("Could not retrieve Azure speech token, using browser speech engine fallback:", fetchErr);
        }

        await speak(text, {
          personality: personality,
          token: tokenData?.token,
          region: tokenData?.region,
          onStart: () => {
            setSpeakState('playing');
          },
          onEnd: () => {
            setCurrentlySpeaking(prev => (prev === idx ? null : prev));
            setSpeakState('stopped');
          }
        });
      } catch (e) {
        console.error("Audio playback error:", e);
        setSpeakState('stopped');
        setCurrentlySpeaking(null);
      }
    }
  };


  const startListening = async () => {
    if (isRecording) {
      if (recognizerRef.current) {
        try { recognizerRef.current.close?.() || recognizerRef.current.stop?.(); } catch (_) {}
        recognizerRef.current = null;
      }
      setIsRecording(false);
      return;
    }
    try {
      setIsRecording(true);
      
      let tokenData = null;
      try {
        const tokenRes = await fetch(`${API_BASE}/api/speech-token`, { 
          headers: token ? { 'Authorization': `Bearer ${token}` } : {} 
        });
        if (tokenRes.ok) {
          tokenData = await tokenRes.json();
        }
      } catch (_) {}
      
      if (tokenData && tokenData.token) {
        const speechConfig = speechSdk.SpeechConfig.fromAuthorizationToken(tokenData.token, tokenData.region);
        speechConfig.speechRecognitionLanguage = 'en-US';
        const audioConfig = speechSdk.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new speechSdk.SpeechRecognizer(speechConfig, audioConfig);
        recognizerRef.current = recognizer;
        
        recognizer.recognizeOnceAsync(result => {
          if (result.reason === speechSdk.ResultReason.RecognizedSpeech) {
            handleSend(result.text);
          } else {
            console.error("Speech not recognized: ", result);
          }
          try { recognizer.close(); } catch (_) {}
          if (recognizerRef.current === recognizer) recognizerRef.current = null;
          setIsRecording(false);
        }, err => {
          console.error("Speech recognition error: ", err);
          try { recognizer.close(); } catch (_) {}
          if (recognizerRef.current === recognizer) recognizerRef.current = null;
          setIsRecording(false);
        });
      } else {
        // Fallback to browser SpeechRecognition if available
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.lang = 'en-US';
          rec.continuous = false;
          rec.interimResults = false;
          recognizerRef.current = rec;
          rec.onresult = (evt) => {
            const transcript = evt.results?.[0]?.[0]?.transcript;
            if (transcript) handleSend(transcript);
            setIsRecording(false);
          };
          rec.onerror = () => setIsRecording(false);
          rec.onend = () => setIsRecording(false);
          rec.start();
        } else {
          alert("Speech recognition is not supported in this browser or backend speech token is unavailable.");
          setIsRecording(false);
        }
      }
    } catch (e) {
      console.error("Listen error", e);
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
        <button ref={newChatBtnRef} className="new-chat-btn" onClick={startNewChat}>
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
                <h3 className="sr-only">{msg.role === 'user' ? 'You said:' : 'Devora said:'}</h3>
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
                      <button 
                        className={`action-btn ${currentlySpeaking === idx ? 'speaking' : ''}`} 
                        onClick={() => toggleSpeak(idx, msg.content)} 
                        aria-label={currentlySpeaking === idx && speakState === 'playing' ? `Pause speaking` : `Listen with ${personality} sound & voice`}
                        title={currentlySpeaking === idx && speakState === 'playing' ? `Pause speaking` : `Play message with ${personality} sound & voice`}
                      >
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
              aria-label={isRecording ? "Stop recording" : "Voice input"}
              onClick={startListening}
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
