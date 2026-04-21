import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SupportChatbot from '../components/SupportChatbot';
import ChatWindow from '../components/ChatWindow';

const STATUS_COLORS = {
  AVAILABLE: { badge: 'available', label: '🟢 Available' },
  CLAIMED:   { badge: 'claimed',   label: '📦 Claimed' },
  COMPLETED: { badge: 'completed', label: '✅ Completed' },
  EXPIRED:   { badge: 'expired',   label: '⌛ Expired' },
};

const DonorDashboard = () => {
  const [rawText, setRawText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChat, setActiveChat] = useState(null);

  const { user, loading: authLoading } = useContext(AuthContext);
  const { wsService, isConnected } = useContext(WebSocketContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'DONOR') { navigate('/auth'); return; }
    fetchDonations();
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (!isConnected || !wsService) return;
    const statusSub = wsService.subscribe('/topic/donations/status', (update) => {
      setDonations((prev) =>
        prev.map((d) => d.id === update.donationId ? { ...d, status: update.status } : d)
      );
    });
    return () => { statusSub?.unsubscribe(); };
  }, [isConnected, wsService]);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/donations/my-donations');
      setDonations(res.data.data);
    } catch (e) {
      setError('Failed to fetch your listings: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
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
      fetchDonations();
    } catch (e) {
      setError(e.response?.data?.message || 'AI listing failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await api.get('/reports/tax-report', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'tax-donation-report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to download report: ' + (e.response?.data?.message || e.message));
    }
  };

  // Stats
  const total   = donations.length;
  const claimed = donations.filter((d) => d.status === 'CLAIMED').length;
  const completed = donations.filter((d) => d.status === 'COMPLETED').length;
  const kgRescued = donations
    .filter((d) => d.status === 'COMPLETED')
    .reduce((sum, d) => sum + (d.estimatedWeightKg || 0), 0)
    .toFixed(1);

  return (
    <>
      <Navbar />

      <div className="container page-wrapper">

        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '2.5rem' }}>
          <div>
            <h1 className="heading-lg text-gradient" style={{ marginBottom: '0.25rem' }}>Donor Dashboard</h1>
            <p className="text-muted" style={{ fontSize: '1rem' }}>
              Welcome back, <strong style={{ color: '#0f172a' }}>{user?.name}</strong>
              {user?.organizationName && ` · ${user.organizationName}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              id="donor-orders-btn"
              className="btn-secondary"
              style={{ position: 'relative' }}
              onClick={() => navigate('/donor/orders')}
            >
              Notifications
              {claimed > 0 && (
                <span className="status-badge available" style={{ marginLeft: '0.5rem', borderRadius: '2px' }}>
                  {claimed} NEW
                </span>
              )}
            </button>
            <button
              id="donor-tax-report-btn"
              className="btn-primary"
              onClick={handleDownloadReport}
            >
              📊 Tax Report
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar" style={{ marginBottom: '2.5rem' }}>
          {[
            { label: 'Total Listed', value: total, icon: '📋', color: '#0f172a' },
            { label: 'Claimed', value: claimed, icon: '📦', color: '#d97706' },
            { label: 'Completed', value: completed, icon: '✅', color: '#059669' },
            { label: 'kg Rescued', value: kgRescued, icon: '♻️', color: '#2563eb' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-icon">{s.icon}</div>
            </div>
          ))}
        </div>

        {/* AI Listing Panel */}
        <section className="glass-panel animate-slide-up" style={{ marginBottom: '3rem', background: '#f8fafc' }}>
          <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ color: '#059669', fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Quick Listing (AI Powered)
              </h2>
              <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                Just type what you have. We'll extract quantity, weight, and expiry automatically.
              </p>
            </div>
          </div>

          {error && (
            <div className="status-badge expired" style={{ width: '100%', marginBottom: '1.25rem', padding: '0.75rem' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleAiSubmit} style={{ position: 'relative' }}>
            <textarea
              id="ai-listing-textarea"
              className="glass-panel-light"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'e.g. "We have 10 trays of vegeterian pasta and 30 bread rolls expiring tonight."'}
              rows={3}
              style={{ width: '100%', fontSize: '1.1rem', resize: 'vertical', background: '#ffffff' }}
              disabled={aiLoading}
            />
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                id="ai-listing-submit"
                type="submit"
                className="btn-primary"
                disabled={aiLoading || !rawText.trim()}
              >
                {aiLoading ? '⏳ Processing...' : '⚡ Publish Listing'}
              </button>
            </div>
          </form>
        </section>

        {/* Listings */}
        <section>
          <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Your Active Listings</h2>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>{donations.length} total</span>
          </div>

          {donations.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No listings yet</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Use the AI Listing box above to get started in seconds.
              </p>
            </div>
          ) : (
            <div className="grid-cols-auto">
              {donations.map((d) => {
                const statusInfo = STATUS_COLORS[d.status] || STATUS_COLORS.AVAILABLE;
                return (
                  <div
                    key={d.id}
                    className={`donation-card animate-fade-in status-${d.status.toLowerCase()}`}
                  >
                    {/* Card Header */}
                    <div className="flex-between">
                      <span className={`status-badge ${statusInfo.badge}`}>{statusInfo.label}</span>
                      <span className="category-chip">{d.category?.replace('_', ' ')}</span>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>{d.itemDescription}</h4>
                      <p className="text-muted" style={{ fontSize: '0.88rem' }}>
                        {d.quantity} items · ~{d.estimatedWeightKg} kg
                      </p>
                    </div>

                    {/* Claimed By Banner */}
                    {(d.status === 'CLAIMED' || d.status === 'COMPLETED') && d.claimantName && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        background: d.status === 'COMPLETED' ? 'rgba(59,130,246,0.06)' : 'rgba(16,185,129,0.06)',
                        border: `1px dashed ${d.status === 'COMPLETED' ? 'rgba(59,130,246,0.3)' : 'var(--color-primary)'}`,
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                      }}>
                            : `Picked up by ${d.claimantName} · Rescue complete!`}
                        </p>
                        <button 
                          id={`chat-btn-${d.id}`}
                          className="btn-secondary" 
                          style={{ marginTop: '0.75rem', width: '100%', padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                          onClick={() => setActiveChat({ id: d.id, claimantName: d.claimantName })}
                        >
                          💬 Coordination Chat
                        </button>
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', marginTop: 'auto' }}>
                      <span>Expires</span>
                      <span style={{ color: 'var(--color-text-sub)', fontWeight: 600 }}>
                        {new Date(d.expiresAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <SupportChatbot />
      {activeChat && <ChatWindow claim={activeChat} onClose={() => setActiveChat(null)} />}
    </>
  );
};

export default DonorDashboard;