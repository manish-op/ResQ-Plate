import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SupportChatbot from '../components/SupportChatbot';

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
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

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
    const notifySub = wsService.subscribe('/user/queue/notifications', (note) => {
      const id = Date.now();
      setNotifications((prev) => [...prev, { id, ...note }]);
      fetchDonations();
      setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 5500);
    });
    return () => { statusSub?.unsubscribe(); notifySub?.unsubscribe(); };
  }, [isConnected, wsService]);

  const fetchDonations = async () => {
    try {
      const res = await api.get('/donations/my-donations');
      setDonations(res.data.data);
    } catch (e) {
      setError('Failed to fetch your listings: ' + (e.response?.data?.message || e.message));
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

      {/* Notification Toasts */}
      <div className="toast-area">
        {notifications.map((n) => (
          <div key={n.id} className="toast animate-slide-up">
            🔔 {n.message}
          </div>
        ))}
      </div>

      <div className="container page-wrapper">

        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="heading-lg text-gradient" style={{ marginBottom: '0.25rem' }}>Donor Dashboard</h1>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Welcome back, <strong style={{ color: 'var(--color-text-sub)' }}>{user?.name}</strong>
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
              🔔 Orders
              {claimed > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: 'var(--color-primary)', color: 'white',
                  fontSize: '0.68rem', padding: '2px 6px', borderRadius: '999px', fontWeight: 700,
                }}>
                  {claimed}
                </span>
              )}
            </button>
            <button
              id="donor-tax-report-btn"
              className="btn-secondary"
              onClick={handleDownloadReport}
            >
              📊 Tax Report
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar" style={{ marginBottom: '2rem' }}>
          {[
            { label: 'Total Listed', value: total, icon: '📋', color: 'var(--color-text-main)' },
            { label: 'Claimed', value: claimed, icon: '📦', color: 'var(--color-accent)' },
            { label: 'Completed', value: completed, icon: '✅', color: 'var(--color-primary)' },
            { label: 'kg Rescued', value: kgRescued, icon: '♻️', color: 'var(--color-secondary)' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-icon">{s.icon}</div>
            </div>
          ))}
        </div>

        {/* AI Listing Panel */}
        <section className="glass-panel animate-slide-up" style={{ marginBottom: '2.5rem', borderColor: 'rgba(16,185,129,0.2)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div>
              <h2 style={{ color: 'var(--color-primary)', fontSize: '1.2rem', marginBottom: '0.25rem' }}>
                ✨ AI Frictionless Listing
              </h2>
              <p className="text-muted" style={{ fontSize: '0.88rem' }}>
                Describe your surplus food in plain English — our AI handles the rest.
              </p>
            </div>
            <div style={{
              fontSize: '0.75rem', color: 'var(--color-text-muted)',
              background: 'rgba(16,185,129,0.06)', padding: '0.3rem 0.8rem',
              borderRadius: 'var(--radius-full)', border: '1px solid rgba(16,185,129,0.15)',
            }}>
              {rawText.length} chars
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem', marginBottom: '1rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.88rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleAiSubmit} style={{ position: 'relative' }}>
            <textarea
              id="ai-listing-textarea"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'e.g. "We have 10 trays of vegeterian pasta and 30 bread rolls all expiring tonight at 8pm."'}
              rows={4}
              style={{ width: '100%', fontSize: '1rem', resize: 'vertical', paddingRight: '9rem', lineHeight: 1.6 }}
              disabled={aiLoading}
            />
            <button
              id="ai-listing-submit"
              type="submit"
              className="btn-primary"
              style={{ position: 'absolute', bottom: '0.85rem', right: '0.85rem', padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
              disabled={aiLoading || !rawText.trim()}
            >
              {aiLoading ? '⏳ Processing...' : '⚡ Auto-List'}
            </button>
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
                        <p style={{ color: d.status === 'COMPLETED' ? 'var(--color-secondary)' : 'var(--color-primary)', fontWeight: 700 }}>
                          {d.status === 'CLAIMED' ? '📍 Ready for Pickup' : '✅ Handover Complete'}
                        </p>
                        <p className="text-muted" style={{ marginTop: '0.2rem' }}>
                          {d.status === 'CLAIMED'
                            ? `Claimed by ${d.claimantName} · Scan their QR on arrival`
                            : `Picked up by ${d.claimantName} · Rescue complete!`}
                        </p>
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
    </>
  );
};

export default DonorDashboard;