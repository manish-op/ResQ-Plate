import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const RecipientClaimsPage = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQr, setSelectedQr] = useState(null);

  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await api.get('/claims/my-claims');
      setClaims(res.data.data);
    } catch (e) {
      console.error("Failed to fetch claims:", e);
      setError("Failed to load your claims history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'RECIPIENT') {
      navigate('/auth');
      return;
    }
    fetchClaims();
  }, [user, navigate, authLoading]);


  return (
    <div className="container page-wrapper">
      <header className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <button 
            className="btn-secondary" 
            style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
            onClick={() => navigate('/recipient')}
          >
            ← Back to Feed
          </button>
          <h1 className="heading-lg text-gradient">My Rescues</h1>
          <p className="text-muted">History of food you've claimed and rescued.</p>
        </div>
        <button className="btn-secondary" onClick={() => { logout(); navigate('/'); }}>Logout</button>
      </header>

      {error && <div className="btn-danger" style={{ marginBottom: '2rem' }}>{error}</div>}

      {loading ? (
        <div className="text-center text-muted" style={{ padding: '3rem' }}>Loading your records...</div>
      ) : claims.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
          <h2>No claims yet!</h2>
          <p className="text-muted">Browse the live feed to find available food near you.</p>
          <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/recipient')}>View Live Feed</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {claims.map((c) => (
            <div 
              key={c.id} 
              className="glass-panel animate-slide-up"
              style={{ 
                padding: '1.5rem',
                borderLeft: c.status === 'PENDING_PICKUP' ? '4px solid var(--color-primary)' : '4px solid #6b7280',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1.5rem',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                   <span style={{ 
                      background: c.status === 'PENDING_PICKUP' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                      color: c.status === 'PENDING_PICKUP' ? 'var(--color-primary)' : '#9ca3af',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      border: `1px solid ${c.status === 'PENDING_PICKUP' ? 'var(--color-primary)' : '#6b7280'}`
                   }}>
                     {c.status.replace('_', ' ')}
                   </span>
                   <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                     Claimed: {new Date(c.claimedAt).toLocaleDateString()}
                   </span>
                </div>
                <h4 style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>{c.donationDescription}</h4>
                <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                  Pickup from: <strong>{c.donorName || 'Local Store'}</strong>
                </p>
                {c.pickedUpAt && (
                   <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
                     Handover verified on: {new Date(c.pickedUpAt).toLocaleString()}
                   </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px' }}>
                {c.status === 'PENDING_PICKUP' ? (
                  <>
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', padding: '0.8rem' }}
                      onClick={() => setSelectedQr({ image: c.qrCodeBase64, token: c.qrToken })}
                    >
                      Show QR Code
                    </button>
                    {(c.donorLatitude || c.donorAddress) && (
                      <button 
                        className="btn-secondary" 
                        style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}
                        onClick={() => {
                          const url = c.donorLatitude 
                            ? `https://www.google.com/maps/dir/?api=1&destination=${c.donorLatitude},${c.donorLongitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.donorAddress)}`;
                          window.open(url, '_blank');
                        }}
                      >
                        🚀 Get Directions
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
                     ✅ Completed
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Modal Overlay */}
      {selectedQr && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel animate-scale-in" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid var(--color-primary)', padding: '2rem' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Your Pickup QR</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Present this to the donor when you arrive to pick up the food.
            </p>

            <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', display: 'inline-block', marginBottom: '1.5rem' }}>
              <img src={selectedQr.image} alt="Pickup QR" style={{ width: '250px', height: '250px', display: 'block' }} />
            </div>

            <button className="btn-secondary" onClick={() => setSelectedQr(null)} style={{ width: '100%' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipientClaimsPage;
