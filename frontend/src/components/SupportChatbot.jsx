import React, { useState, useRef, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const SUGGESTED = [
  'List available donations',
  'Get my tax report for this month',
  'How many kg rescued this month?',
];

const SupportChatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "👋 Hi! I'm the ResQ Plate assistant. I can help you check donations, generate tax reports, and more. Try asking something!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await api.post('/chatbot/message', { message: msg });
      const { reply, downloadUrl } = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: reply,
          downloadUrl: downloadUrl || null,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: '⚠️ Sorry, I ran into an issue. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        id="chatbot-fab"
        className="chatbot-fab"
        onClick={() => setOpen((o) => !o)}
        title="Open AI Assistant"
        aria-label="Open AI Assistant"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="chatbot-panel">
          {/* Header */}
          <div className="chatbot-header">
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0,
            }}>
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text-main)' }}>
                ResQ Assistant
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
                AI-Powered · MCP Connected
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div>{m.text}</div>
                {m.downloadUrl && (
                  <a
                    href={m.downloadUrl}
                    download
                    style={{
                      display: 'inline-block', marginTop: '0.5rem',
                      background: 'var(--color-primary)', color: 'white',
                      padding: '0.35rem 0.9rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
                    }}
                  >
                    📥 Download Report
                  </a>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-msg bot">
                <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ animation: 'pulse-dot 1s 0s infinite', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-muted)', display: 'inline-block' }} />
                  <span style={{ animation: 'pulse-dot 1s 0.2s infinite', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-muted)', display: 'inline-block' }} />
                  <span style={{ animation: 'pulse-dot 1s 0.4s infinite', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-muted)', display: 'inline-block' }} />
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only shown when no user messages yet) */}
          {messages.length === 1 && (
            <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    textAlign: 'left', background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.15)', borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.8rem', fontSize: '0.78rem', color: 'var(--color-primary)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.06)'}
                >
                  💬 {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-row">
            <input
              id="chatbot-input"
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              style={{ borderRadius: 'var(--radius-md)' }}
            />
            <button
              id="chatbot-send-btn"
              className="chatbot-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatbot;
