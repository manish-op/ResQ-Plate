import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';
import api from '../services/api';

const ChatWindow = ({ claim, onClose }) => {
  const { user } = useContext(AuthContext);
  const { wsService } = useContext(WebSocketContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef(null);

  // Determine chat partner name
  const partnerName = user.role === 'DONOR' ? claim.claimantName : claim.storeName;

  useEffect(() => {
    // 1. Fetch History
    const fetchHistory = async () => {
      try {
        const response = await api.get(`/chat/history/${claim.id}`);
        if (response.data.success) {
          setMessages(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch chat history", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();

    // 2. Subscribe to news
    // wsService.subscribe returns an unsubscribe function
    const unsubscribe = wsService.subscribe('/user/queue/messages', (msg) => {
      // Only add to this chat if the message belongs to this claim
      if (msg.claimId === claim.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => unsubscribe();
  }, [claim.id, wsService]);

  useEffect(() => {
    // Scroll to bottom on updates
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const resp = await api.post('/chat/send', {
        claimId: claim.id,
        content: newMessage
      });
      if (resp.data.success) {
        // We set it locally if the WS doesn't echo back to sender (actually our service does echo to sender)
        // So the WS listener will add it.
        setNewMessage('');
      }
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  return (
    <div 
      className="glass-panel" 
      style={{ 
        position: 'fixed', bottom: '2rem', right: '5rem', 
        width: '380px', height: '540px', zIndex: 1000,
        display: 'flex', flexDirection: 'column', padding: 0,
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--color-bg-base)'
      }}>
        <div className="flex-col">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Chat Coordination
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>{partnerName}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>&times;</button>
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        {isLoading ? (
          <div className="flex-center" style={{ height: '100%', color: 'var(--color-text-muted)' }}>Loading history...</div>
        ) : messages.length === 0 ? (
          <div className="flex-center" style={{ height: '100%', color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            No messages yet.<br/>Start coordination for this claim.
          </div>
        ) : (
          messages.map((m, i) => (
            <div 
              key={m.id || i}
              style={{ 
                alignSelf: m.senderId === user.id ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex', flexDirection: 'column',
                alignItems: m.senderId === user.id ? 'flex-end' : 'flex-start'
              }}
            >
              <div 
                style={{ 
                  padding: '0.75rem 1rem', 
                  borderRadius: 'var(--radius-md)',
                  background: m.senderId === user.id ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                  color: m.senderId === user.id ? 'white' : 'var(--color-text-main)',
                  fontSize: '0.9rem',
                  boxShadow: m.senderId === user.id ? '0 4px 12px var(--color-primary-glow)' : 'none'
                }}
              >
                {m.content}
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input row */}
      <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
        <input 
          type="text" 
          placeholder="Type coordination message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ flex: 1, borderRadius: 'var(--radius-md)' }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '0 1.25rem', height: '44px' }}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
