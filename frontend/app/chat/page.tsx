'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, RefreshCcw, MessageSquare, ImagePlus, X } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';

const SUGGESTIONS = [
  'What causes Citrus Canker?',
  'How to improve orange quality score?',
  'Best harvest time in Maharashtra?',
  'Melanose vs Black Spot differences?',
  'Export grading standards for oranges?',
];

const WELCOME_MESSAGE = (name?: string): Message => ({
  id: 'welcome',
  role: 'bot',
  content: `Namaste${name ? ` ${name}` : ''}! 🙏 I am **Dr.Orange**, your AI expert for orange diseases, farming, and quality management.\n\nAsk me anything about citrus health, treatment protocols, harvest timing, or your scan results!`,
});

// ─── TYPING DOTS ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3 max-w-[75%]"
    >
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
        style={{
          background: 'rgba(255,140,0,0.15)',
          border: '1px solid rgba(255,140,0,0.2)',
        }}
      >
        🍊
      </div>
      <div
        className="flex items-center gap-1.5"
        style={{
          padding: '14px 18px',
          borderRadius: '4px 16px 16px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,140,0,0.15)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full block"
            style={{
              background: '#FF8C00',
              animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <span className="ml-1.5 text-xs text-[#FF8C00] font-medium" style={{ opacity: 0.8 }}>Thinking...</span>
      </div>
    </motion.div>
  );
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex gap-3.5 max-w-[78%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
        style={
          isUser
            ? { background: 'linear-gradient(135deg, #FF8C00, #FF4500)', color: '#fff' }
            : { background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.2)' }
        }
      >
        {isUser ? 'You' : '🍊'}
      </div>

      {/* Bubble */}
      <div
        className="text-sm leading-relaxed react-markdown-content"
        style={{
          padding: '14px 18px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'linear-gradient(135deg, #FF8C00, #FF4500)'
            : 'rgba(255,255,255,0.04)',
          border: isUser ? 'none' : '1px solid rgba(255,140,0,0.15)',
          color: isUser ? '#fff' : '#FAF5E4',
          backdropFilter: isUser ? undefined : 'blur(12px)',
          WebkitBackdropFilter: isUser ? undefined : 'blur(12px)',
        }}
      >
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    </motion.div>
  );
}

// ─── SIDEBAR SESSION ITEM ─────────────────────────────────────────────────────
function SessionItem({
  session,
  isActive,
  onClick,
}: {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-200 flex items-center gap-2.5"
      style={{
        padding: '12px 20px',
        cursor: 'pointer',
        background: isActive ? 'rgba(255,140,0,0.1)' : 'transparent',
        border: 'none',
        borderRight: isActive ? '2px solid #FF8C00' : '2px solid transparent',
      }}
    >
      <MessageSquare
        size={13}
        style={{ color: isActive ? '#FF8C00' : '#8A7F70', flexShrink: 0 }}
      />
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-medium truncate"
          style={{ color: isActive ? '#FAF5E4' : '#8A7F70' }}
        >
          {session.title || 'Conversation'}
        </div>
        <div className="font-mono text-[10px] mt-0.5" style={{ color: '#8A7F70' }}>
          {new Date(session.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
          })}
        </div>
      </div>
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ChatPage() {
  // ── State ──
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE()]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [images, setImages] = useState<File[]>([]);

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth token (reads from cookie or localStorage) ──
  const getToken = (): string | null => {
    if (typeof document === 'undefined') return null;
    const cookieMatch = document.cookie.match(/dr_orange_token=([^;]+)/);
    const localToken = localStorage.getItem('dr_orange_token') || localStorage.getItem('token');
    return cookieMatch ? cookieMatch[1] : localToken;
  };

  const authHeader = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Load sessions on mount ──
  useEffect(() => {
    fetchSessions();
  }, []);

  // ── Fetch sessions ──
  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await axios.get(`${API_BASE}/api/chat/conversations`, {
        headers: authHeader(),
      });
      setSessions(res.data.conversations || []);
    } catch {
      // Silently fail — user may not be logged in or backend may be down
    } finally {
      setLoadingSessions(false);
    }
  };

  // ── Fetch messages for a session ──
  const fetchMessages = async (convId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/api/chat/${convId}`, {
        headers: authHeader(),
      });
      const dbMsgs: Array<{ id: number; message: string; response: string }> =
        res.data.messages || [];

      const formatted: Message[] = [];
      dbMsgs.forEach((m) => {
        formatted.push({ id: `u_${m.id}`, role: 'user', content: m.message });
        formatted.push({ id: `b_${m.id}`, role: 'bot', content: m.response });
      });
      setMessages(formatted.length > 0 ? formatted : [WELCOME_MESSAGE()]);
      setShowSuggestions(false);
    } catch {
      setMessages([WELCOME_MESSAGE()]);
    }
  };

  // ── Select a session ──
  const selectSession = (id: number) => {
    setActiveSession(id);
    fetchMessages(id);
  };

  // ── New chat ──
  const createNewChat = () => {
    setActiveSession(null);
    setMessages([WELCOME_MESSAGE()]);
    setInput('');
    setImages([]);
    setShowSuggestions(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  // ── Image Upload Handlers ──
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (images.length + newFiles.length > 3) {
        alert("Maximum 3 images allowed.");
        return;
      }
      setImages((prev) => [...prev, ...newFiles].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Send message ──
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && images.length === 0) || isTyping) return;

    setShowSuggestions(false);

    // Optimistic UI — add user message immediately
    const userMsgContent = images.length > 0 
      ? (trimmed ? trimmed + `\n\n*[Attached ${images.length} image(s)]*` : `*[Attached ${images.length} image(s)]*`)
      : trimmed;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: userMsgContent,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    
    // Clear images UI immediately
    const currentImages = [...images];
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let currentConvId = activeSession;

    try {
      // If no active session, create one first
      if (!currentConvId) {
        const titleSource = trimmed || "Image Analysis";
        const createRes = await axios.post(
          `${API_BASE}/api/chat/conversation`,
          { title: titleSource.substring(0, 50) },
          { headers: authHeader() }
        );
        currentConvId = createRes.data.conversation?.id ?? null;
        if (currentConvId) {
          setActiveSession(currentConvId);
        }
      }

      // Send message to backend
      const endpoint = currentConvId
        ? `${API_BASE}/api/chat/${currentConvId}`
        : `${API_BASE}/api/chat`;

      const formData = new FormData();
      if (trimmed) formData.append('message', trimmed);
      currentImages.forEach((img) => formData.append('images', img));

      const res = await axios.post(
        endpoint,
        formData,
        { 
          headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } 
        }
      );

      const botMsg: Message = {
        id: `b_${Date.now()}`,
        role: 'bot',
        content: res.data.response || 'I could not generate a response. Please try again.',
      };
      setMessages((prev) => [...prev, botMsg]);

      // Refresh sidebar
      fetchSessions();
    } catch (err: unknown) {
      // Fallback response
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'bot',
        content:
          'Oops! Something went wrong connecting to the server. Please check your internet connection and try again. 🍊',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Handle keyboard ──
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Auto-resize textarea ──
  const handleTextareaInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="relative z-[2]">
      {/* Typing bounce keyframe injected once */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-7px); }
        }
        .react-markdown-content h1, .react-markdown-content h2, .react-markdown-content h3 { font-weight: bold; margin-bottom: 8px; margin-top: 16px; }
        .react-markdown-content h1 { font-size: 1.25em; }
        .react-markdown-content h2 { font-size: 1.15em; }
        .react-markdown-content h3 { font-size: 1.05em; }
        .react-markdown-content p { margin-bottom: 12px; }
        .react-markdown-content p:last-child { margin-bottom: 0; }
        .react-markdown-content ul { list-style-type: disc; padding-left: 20px; margin-bottom: 12px; }
        .react-markdown-content ol { list-style-type: decimal; padding-left: 20px; margin-bottom: 12px; }
        .react-markdown-content li { margin-bottom: 4px; }
        .react-markdown-content strong { font-weight: 700; color: inherit; }
      `}</style>

      <div
        className="grid"
        style={{
          gridTemplateColumns: '260px 1fr',
          height: 'calc(100vh - 72px)',
          marginTop: 72,
        }}
      >
        {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
        <div
          className="hidden md:flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderRight: '1px solid rgba(255,140,0,0.18)',
          }}
        >
          {/* New Chat button */}
          <div className="p-4 flex-shrink-0">
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #FF8C00, #FF4500)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              New Chat
            </button>
          </div>

          {/* Session list header */}
          <div className="flex justify-between items-center px-5 mb-2 flex-shrink-0">
            <span
              className="font-mono text-[10px] uppercase tracking-[2px]"
              style={{ color: '#8A7F70' }}
            >
              Recent
            </span>
            <button
              onClick={fetchSessions}
              className="transition-colors duration-200 bg-transparent border-none p-1 rounded"
              style={{ color: '#8A7F70', cursor: 'pointer' }}
              title="Refresh sessions"
            >
              <RefreshCcw
                size={12}
                className={loadingSessions ? 'animate-spin' : ''}
              />
            </button>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={activeSession === session.id}
                  onClick={() => selectSession(session.id)}
                />
              ))
            ) : (
              <div
                className="px-5 py-8 text-xs text-center"
                style={{ color: '#8A7F70' }}
              >
                {loadingSessions ? 'Loading...' : 'No past chats yet.\nStart a new conversation!'}
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN CHAT AREA ─────────────────────────────────────────────── */}
        <div
          className="flex flex-col"
          style={{ background: '#080808', minWidth: 0 }}
        >
          {/* Top bar */}
          <div
            className="flex items-center gap-3 flex-shrink-0"
            style={{
              padding: '18px 32px',
              borderBottom: '1px solid rgba(255,140,0,0.18)',
            }}
          >
            {/* Orange logo */}
            <svg width={36} height={36} viewBox="0 0 38 38" aria-hidden>
              <defs>
                <radialGradient id="chat-orange-grad" cx="38%" cy="32%">
                  <stop offset="0%" stopColor="#FFD580" />
                  <stop offset="45%" stopColor="#FF8C00" />
                  <stop offset="100%" stopColor="#CC4400" />
                </radialGradient>
              </defs>
              <circle cx="19" cy="23" r="13" fill="url(#chat-orange-grad)" />
              <path d="M19 10 C19 10 15 3 9 4.5 C13 6 16.5 10 19 10Z" fill="#2D7A3A" />
              <path d="M19 10 C19 10 24 2 31 4 C25 6 21 9 19 10Z" fill="#3D9A4A" />
            </svg>

            <div>
              <div className="font-playfair text-[17px] font-bold text-[#FAF5E4]">
                Dr.Orange
              </div>
              <div
                className="text-xs flex items-center gap-1.5"
                style={{ color: '#8A7F70' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: '#2D8A4E',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
                Your Orange Expert · Powered by Dr. Orange AI
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto flex flex-col gap-5 relative"
            style={{ padding: '28px 32px' }}
          >
            {/* Suggestion pills — shown only on fresh chat */}
            <AnimatePresence>
              {showSuggestions && messages.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-wrap gap-2 justify-center mt-8"
                >
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,140,0,0.18)',
                        color: '#8A7F70',
                        padding: '8px 16px',
                        borderRadius: 40,
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor = '#FF8C00';
                        (e.target as HTMLButtonElement).style.color = '#FF8C00';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor =
                          'rgba(255,140,0,0.18)';
                        (e.target as HTMLButtonElement).style.color = '#8A7F70';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {/* Typing indicator */}
              {isTyping && <TypingDots key="typing" />}
            </AnimatePresence>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input container */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{
              padding: '0 32px 20px',
              borderTop: '1px solid rgba(255,140,0,0.18)',
              background: '#080808'
            }}
          >
            {/* Image Previews */}
            {images.length > 0 && (
              <div className="flex gap-3 pt-4 pb-2 px-1 overflow-x-auto border-b border-[rgba(255,140,0,0.1)]">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-[rgba(255,140,0,0.3)] shadow-sm">
                    <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)} 
                      className="absolute top-1 right-1 bg-black/60 p-0.5 rounded-full hover:bg-black transition-colors backdrop-blur-sm shadow-md"
                      title="Remove image"
                    >
                      <X size={12} color="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className={`flex gap-3 items-end ${images.length === 0 ? 'pt-4' : 'pt-3'}`}>
              <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                title="Upload image"
                aria-label="Upload image"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || images.length >= 3}
                className="flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:bg-[rgba(255,140,0,0.1)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,140,0,0.2)',
                  color: isTyping || images.length >= 3 ? '#8A7F70' : '#FF8C00',
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  cursor: isTyping || images.length >= 3 ? 'not-allowed' : 'pointer'
                }}
                title={images.length >= 3 ? "Max 3 images limit reached" : "Upload Image"}
              >
                <ImagePlus size={20} />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleTextareaInput}
                rows={1}
                placeholder="Ask about orange diseases, farming, or your scan results…"
                className="flex-1 outline-none resize-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,140,0,0.2)',
                  borderRadius: 12,
                  padding: '13px 18px',
                  color: '#FAF5E4',
                  fontSize: 14,
                  fontFamily: 'DM Sans, sans-serif',
                  lineHeight: 1.5,
                  minHeight: 48,
                  maxHeight: 120,
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = '#FF8C00')
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = 'rgba(255,140,0,0.2)')
                }
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={(!input.trim() && images.length === 0) || isTyping}
                className="flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #FF8C00, #FF4500)',
                  color: '#fff',
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  border: 'none',
                  cursor: (!input.trim() && images.length === 0) || isTyping ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}