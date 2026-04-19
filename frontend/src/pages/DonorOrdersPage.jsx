import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import QrScannerModal from '../components/QrScannerModal';

const DonorOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scannerData, setScannerData] = useState({ show: false, order: null });
  const [toastMsg, setToastMsg] = useState(null);
  const [manualToken, setManualToken] = useState({ show: false, order: null, value: '' });

  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== 'DONOR') {
      navigate('/auth');
      return;
    }

    fetchOrders();
  }, [user, navigate, authLoading]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/donations/my-donations');
      const history = res.data.data.filter(
        d => d.status === 'CLAIMED' || d.status === 'COMPLETED'
      );
      // Sort by status putting CLAIMED first, then by date desc
      history.sort((a, b) => {
        if (a.status === 'CLAIMED' && b.status !== 'CLAIMED') return -1;
        if (a.status !== 'CLAIMED' && b.status === 'CLAIMED') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setOrders(history);
    } catch (e) {
      console.error("Failed to fetch orders:", e);
      setError("Failed to load claims history.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (scannedPayload) => {
    const { order } = scannerData;

    setScannerData({ show: false, order: null });

    // Multi-factor Data Verification
    if (!scannedPayload.legacy) {
      if (scannedPayload.orderId !== order.id) {
        setToastMsg("❌ Verification failed: This QR Code belongs to a different order.");
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }

      if (scannedPayload.claimantName !== order.claimantName) {
        setToastMsg(`❌ Identity mismatch: Expected ${order.claimantName}, but QR belongs to ${scannedPayload.claimantName}.`);
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }
    }

    try {
      // Use the dedicated JSON API instead of the public HTML verify link
      await api.post(`/claims/verify-pickup/${scannedPayload.qrToken}`);
      setToastMsg(`✅ Verified! Handed over to ${scannedPayload.claimantName}.`);
      setTimeout(() => setToastMsg(null), 4000);
      fetchOrders();
    } catch (e) {
      setToastMsg("❌ Backend rejection: " + (e.response?.data?.message || e.message));
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleManualVerify = async () => {
    const { order, value } = manualToken;
    if (!value || value.length < 8) {
      setToastMsg("⚠️ Please enter at least 8 characters of the code.");
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    setManualToken({ show: false, order: null, value: '' });

    try {
      // Find the full token that starts with the manual input
      if (!order.qrToken.startsWith(value)) {
        throw new Error("Manual code does not match the claimant's record.");
      }

      await api.get(`/qr/verify/${order.qrToken}`);
      setToastMsg(`✅ Verified! Handover complete.`);
      setTimeout(() => setToastMsg(null), 4000);
      fetchOrders();
    } catch (e) {
      setToastMsg("❌ Verification failed: " + e.message);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  return (
    <div className="container page-wrapper">
      <header className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <button
            className="btn-secondary"
            style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
            onClick={() => navigate('/donor')}
          >
            ← Back to Dashboard
          </button>
          <h1 className="heading-lg text-gradient">Orders & Claims</h1>
          <p className="text-muted">Track all pickups and historical handovers.</p>
        </div>
        <button className="btn-secondary" onClick={() => { logout(); navigate('/'); }}>Logout</button>
      </header>

      {/* Global CSS Overrides for HTML5 QR Code */}
      <style>{`
        #qr-reader-container button {
          background: var(--color-primary);
          color: black;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          margin: 10px;
          cursor: pointer;
        }
        #qr-reader-container a { color: var(--color-primary); }
      `}</style>

      {error && <div className="btn-danger" style={{ marginBottom: '2rem' }}>{error}</div>}
      {toastMsg && <div className="btn-primary flex-between" style={{ marginBottom: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>{toastMsg}</div>}

      {scannerData.show && (
        <QrScannerModal
          onClose={() => setScannerData({ show: false, order: null })}
          onSuccess={handleScanSuccess}
        />
      )}

      {/* Manual Entry Modal */}
      {manualToken.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-scale-in" style={{ padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Manual Verification</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Enter the Code Ref shown on the recipient's phone (e.g., first 8 chars).
            </p>
            <input
              type="text"
              className="input-field"
              placeholder="Enter code..."
              value={manualToken.value}
              onChange={(e) => setManualToken(prev => ({ ...prev, value: e.target.value }))}
              style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setManualToken({ show: false, order: null, value: '' })}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleManualVerify}>Verify Now</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted" style={{ padding: '3rem' }}>Loading records...</div>
      ) : orders.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
          <h2>No claims yet!</h2>
          <p className="text-muted">Once a volunteer claims your donated food, it will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((d) => (
            <div
              key={d.id}
              className={`glass-panel animate-slide-up ${d.status === 'CLAIMED' ? 'pulse-border' : ''}`}
              style={{
                padding: '1.5rem',
                borderLeft: d.status === 'CLAIMED' ? '4px solid var(--color-primary)' : '4px solid #6b7280',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    background: d.status === 'CLAIMED' ? 'var(--color-primary)' : 'transparent',
                    color: d.status === 'CLAIMED' ? '#fff' : '#9ca3af',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    border: d.status === 'COMPLETED' ? '1px solid #9ca3af' : 'none'
                  }}>
                    {d.status}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                    Listed: {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{d.itemDescription}</h4>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                  {d.quantity} items (~{d.estimatedWeightKg} kg)
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '1rem',
                borderRadius: '8px',
                flex: '1 1 250px',
                minWidth: '250px'
              }}>
                <h5 style={{
                  color: d.status === 'CLAIMED' ? 'var(--color-primary)' : '#d1d5db',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {d.status === 'CLAIMED' ? '📍 Waiting for Pickup' : '✅ Handover Complete'}
                </h5>
                <div style={{ fontSize: '0.95rem' }}>
                  <strong>Claimant:</strong> {d.claimantName || 'Unknown User'}
                </div>
                {d.status === 'CLAIMED' && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      className="btn-primary"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={() => setScannerData({ show: true, order: d })}
                    >
                      📷 Scan Recipient QR
                    </button>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.8rem', textAlign: 'center' }}>
                      Camera issues? <span
                        style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setManualToken({ show: true, order: d, value: d.qrToken?.substring(0, 8) || '' })}
                      >
                        Enter Code Manually
                      </span>
                      <br />Code Ref: {d.qrToken?.substring(0, 8)}...
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonorOrdersPage;
