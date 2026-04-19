import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';

const DonorDashboard = () => {
  const [rawText, setRawText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [donations, setDonations] = useState([]);
  const [error, setError] = useState(null);

  const [notifications, setNotifications] = useState([]);

  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const { wsService, isConnected } = useContext(WebSocketContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return; // Wait for auth check

    if (!user || user.role !== 'DONOR') {
      navigate('/auth');
      return;
    }
    fetchDonations();
  }, [user, navigate, authLoading]);

  // ––– WebSocket Subscriptions –––
  useEffect(() => {
    if (isConnected && wsService) {
      // 1. Listen for global status changes (CLAIMED, COMPLETED, etc.)
      const statusSub = wsService.subscribe('/topic/donations/status', (update) => {
        setDonations((prev) =>
          prev.map((d) =>
            d.id === update.donationId ? { ...d, status: update.status } : d
          )
        );
      });

      // 2. Listen for private notifications (e.g., "Someone has claimed your item")
      const notifySub = wsService.subscribe('/user/queue/notifications', (note) => {
        setNotifications((prev) => [...prev, { id: Date.now(), ...note }]);
        // Refresh full list if statuses change significantly
        fetchDonations();

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.slice(1));
        }, 5000);
      });

      return () => {
        if (statusSub) statusSub.unsubscribe();
        if (notifySub) notifySub.unsubscribe();
      };
    }
  }, [isConnected, wsService]);

  const fetchDonations = async () => {
    try {
      const res = await api.get('/donations/my-donations');
      setDonations(res.data.data);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      console.error("Failed to fetch donations:", msg, e.response?.data);
      setError("Failed to fetch your listings: " + msg);
    }
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setAiLoading(true);
    setError(null);
    try {
      await api.post('/donations/ai-listing', { rawText });
      setRawText('');
      fetchDonations(); // refresh list
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to process AI listing. Check console.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="container page-wrapper">
      {/* Real-time Notifications Toast Area */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notifications.map(n => (
          <div key={n.id} className="glass-panel animate-slide-up" style={{
            background: 'var(--color-primary)',
            color: 'white',
            padding: '1rem',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
            border: 'none',
            maxWidth: '300px'
          }}>
            {n.message}
          </div>
        ))}
      </div>

      <header className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="heading-lg text-gradient">Donor Dashboard</h1>
          <p className="text-muted">Welcome back, {user?.name} | {isConnected ? '🟢 Live' : '🔴 Connection Offline'}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            title="View Orders & Claims"
            style={{ position: 'relative', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
            onClick={() => navigate('/donor/orders')}
          >
            🔔
            {donations.filter(d => d.status === 'CLAIMED').length > 0 && (
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px',
                background: 'var(--color-primary)', color: 'white',
                fontSize: '0.7rem', padding: '2px 6px', borderRadius: '50%', fontWeight: 'bold'
              }}>
                {donations.filter(d => d.status === 'CLAIMED').length}
              </span>
            )}
          </button>
          <button className="btn-secondary" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </header>

      {/* Futuristic AI Input Section */}
      <section className="glass-panel animate-slide-up" style={{ marginBottom: '3rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>✨ AI Frictionless Listing</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Describe your surplus food. Our AI handles the categorization and expiry math.
        </p>

        {error && <div className="btn-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleAiSubmit} style={{ position: 'relative' }}>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="e.g. 10 trays of vegeterian pasta expiring tonight."
            rows={4}
            style={{ width: '100%', fontSize: '1.1rem', resize: 'vertical' }}
            disabled={aiLoading}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}
            disabled={aiLoading || !rawText.trim()}
          >
            {aiLoading ? 'Processing...' : 'Auto-List'}
          </button>
        </form>
      </section>

      {/* Active Listings */}
      <section>
        <h3 className="heading-lg" style={{ marginBottom: '1.5rem', fontSize: '1.8rem' }}>Your Active Listings</h3>

        {donations.length === 0 ? (
          <p className="text-muted text-center">No active listings right now.</p>
        ) : (
          <div className="grid-cols-auto">
            {donations.map((d) => (
              <div
                key={d.id}
                className={`glass-panel animate-fade-in ${d.status === 'CLAIMED' ? 'pulse-border' : ''}`}
                style={{
                  padding: '1.5rem',
                  border: d.status === 'CLAIMED' ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <span style={{
                    background: d.status === 'CLAIMED' ? 'var(--color-primary)' : 'rgba(16, 185, 129, 0.1)',
                    color: d.status === 'CLAIMED' ? 'white' : 'var(--color-primary)',
                    padding: '0.2rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {d.category?.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    color: d.status === 'AVAILABLE' ? 'var(--color-primary)' : '#9ca3af'
                  }}>
                    {d.status}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{d.itemDescription}</h4>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                  {d.quantity} items (~{d.estimatedWeightKg} kg)
                </p>

                {(d.status === 'CLAIMED' || d.status === 'COMPLETED') && d.claimantName && (
                  <div className="glass-panel" style={{
                    background: 'rgba(16, 185, 129, 0.05)',
                    padding: '0.8rem',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    border: '1px dashed var(--color-primary)'
                  }}>
                    <p style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                      {d.status === 'CLAIMED' ? '📍 Ready for Pickup' : '✅ Handover Complete'}
                    </p>
                    <p className="text-muted" style={{ marginTop: '0.3rem' }}>
                      {d.status === 'CLAIMED'
                        ? `Claimed by: ${d.claimantName}. Scan their QR code upon arrival.`
                        : `Picked up by: ${d.claimantName}`}
                    </p>
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', marginTop: 'auto' }}>
                  <span className="text-muted">Expires:</span> {new Date(d.expiresAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DonorDashboard;