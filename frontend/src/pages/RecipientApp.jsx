import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';

const RecipientApp = () => {
  const [donations, setDonations] = useState([]);
  const [claimedCode, setClaimedCode] = useState(null); // stores { token, imagePath }

  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const { wsService, isConnected } = useContext(WebSocketContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return; // Wait for auth check

    if (!user || user.role !== 'RECIPIENT') {
      navigate('/auth');
      return;
    }

    // Initial fetch of available donations
    fetchDonations();
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (isConnected) {
      // Subscribe to live donation stream
      const subscription = wsService.subscribe('/topic/donations', (newDonation) => {
        // Prepend new donation with a slight slide-up animation trigger
        setDonations(prev => {
          // Prevent duplicates if already fetched via REST during transit
          if (prev.find(d => d.id === newDonation.id)) return prev;
          return [newDonation, ...prev];
        });
      });
      return () => {
        if (subscription) subscription.unsubscribe();
      }
    }
  }, [isConnected, wsService]);

  const fetchDonations = async () => {
    try {
      const res = await api.get('/donations');
      setDonations(res.data.data.filter(d => d.status === 'AVAILABLE'));
    } catch (e) {
      console.error("Failed to fetch donations", e);
    }
  };

  const handleClaim = async (donationId) => {
    try {
      const res = await api.post('/claims', { donationId });
      const claimData = res.data.data;

      // claimData should ideally contain { id, qrToken, qrCodeImagePath } from backend phase 5
      // If the backend returns Base64 in qrCodeImagePath or a URL, we render it
      setClaimedCode({
        token: claimData.qrToken,
        qrImage: claimData.qrCodeBase64 // Corrected from qrCodeImagePath
      });

      // Remove from available feed locally
      setDonations(prev => prev.filter(d => d.id !== donationId));
    } catch (e) {
      alert("Failed to claim: " + (e.response?.data?.message || e.message));
    }
  };

  return (
    <div className="container page-wrapper">
      <header className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="heading-lg text-gradient">Live Rescue Feed</h1>
          <p className="text-muted">Welcome, {user?.name} | {isConnected ? '🟢 Live Stream Connected' : '🔴 Connecting...'}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent'
            }}
            onClick={() => navigate('/recipient/claims')}
          >
            📦 My Claims
          </button>
          <button className="btn-secondary" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </header>

      {/* Main Feed */}
      <section>
        {donations.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
            <h2>Waiting for new donations...</h2>
            <p className="text-muted">As soon as a donor lists food, it will appear here instantly.</p>
          </div>
        ) : (
          <div className="grid-cols-auto">
            {donations.map((d) => (
              <div key={d.id} className="glass-panel animate-slide-up" style={{ padding: '1.5rem', animationFillMode: 'both' }}>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <span style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: 'var(--color-secondary)',
                    padding: '0.2rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}>
                    {d.category.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>
                    🔥 {d.urgency} URGENCY
                  </span>
                </div>

                <h4 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{d.itemDescription}</h4>
                <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
                  Donor: {d.donorOrganization || d.donorName || 'Local Store'}
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  <div><strong>Qty:</strong> {d.quantity}</div>
                  <div><strong>Expires:</strong> {new Date(d.expiresAt).toLocaleTimeString()}</div>
                </div>

                <button
                  className="btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => handleClaim(d.id)}
                >
                  Claim Food
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* QR Code Modal for Pickup */}
      {claimedCode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel animate-slide-up" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid var(--color-primary)' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Claim Successful!</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Present this QR code to the store owner or volunteer upon arrival.
            </p>

            {/* If we have base64 image from backend, render it. Fallback is the raw token text */}
            {claimedCode.qrImage ? (
              <img src={claimedCode.qrImage} alt="Pickup QR" style={{ width: '200px', height: '200px', borderRadius: '8px', marginBottom: '1.5rem', background: '#fff', padding: '10px' }} />
            ) : (
              <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <span style={{ color: '#000', fontFamily: 'monospace', fontSize: '1.2rem' }}>{claimedCode.token}</span>
              </div>
            )}

            <button className="btn-secondary" onClick={() => setClaimedCode(null)} style={{ width: '100%' }}>
              Close Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecipientApp;
