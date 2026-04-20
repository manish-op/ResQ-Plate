import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SupportChatbot from '../components/SupportChatbot';
import MapView from '../components/MapView';

const CATEGORIES = ['ALL', 'BAKERY', 'PRODUCE', 'COOKED_MEALS', 'DAIRY', 'BEVERAGES', 'OTHER'];
const URGENCY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const RecipientApp = () => {
  const [donations, setDonations] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('urgency'); // 'urgency' | 'expiry'
  const [viewMode, setViewMode] = useState('feed'); // 'feed' | 'map'
  const [userLocation, setUserLocation] = useState(null); // {lat, lng}
  const [filterNearby, setFilterNearby] = useState(false);
  const [claimedCode, setClaimedCode] = useState(null);
  const [claimingId, setClaimingId] = useState(null);

  const { user, loading: authLoading } = useContext(AuthContext);
  const { wsService, isConnected } = useContext(WebSocketContext);
  const navigate = useNavigate();

  const fetchDonations = async () => {
    try {
      const res = await api.get('/donations');
      setDonations(res.data.data.filter((d) => d.status === 'AVAILABLE'));
    } catch (e) {
      console.error('Failed to fetch donations', e);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'RECIPIENT') { navigate('/auth'); return; }
    fetchDonations();
    getUserLocation();
  }, [user, navigate, authLoading]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn("Geolocation denied or failed. Use manual setting.");
        }
      );
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!isConnected || !wsService) return;
    const sub = wsService.subscribe('/topic/donations', (newDonation) => {
      setDonations((prev) => {
        if (prev.find((d) => d.id === newDonation.id)) return prev;
        return [newDonation, ...prev];
      });
    });
    const removeSub = wsService.subscribe('/topic/donations/status', (update) => {
      setDonations((prev) =>
        prev.filter((d) => !(d.id === update.donationId && update.status !== 'AVAILABLE'))
      );
    });
    return () => { sub?.unsubscribe(); removeSub?.unsubscribe(); };
  }, [isConnected, wsService]);


  const handleClaim = async (donationId) => {
    setClaimingId(donationId);
    try {
      const res = await api.post('/claims', { donationId });
      const claimData = res.data.data;
      setClaimedCode({ token: claimData.qrToken, qrImage: claimData.qrCodeBase64 });
      setDonations((prev) => prev.filter((d) => d.id !== donationId));
    } catch (e) {
      alert('Failed to claim: ' + (e.response?.data?.message || e.message));
    } finally {
      setClaimingId(null);
    }
  };

  const filtered = donations
    .map(d => ({
      ...d,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, d.donorLatitude, d.donorLongitude) : null
    }))
    .filter((d) => (activeCategory === 'ALL' || d.category === activeCategory) && (!filterNearby || (d.distance !== null && d.distance <= 15)))
    .sort((a, b) => {
      if (sortBy === 'distance' && a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (sortBy === 'urgency') return (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9);
      return new Date(a.expiresAt) - new Date(b.expiresAt);
    });

  const urgencyColor = (u) => {
    if (u === 'HIGH') return '#ef4444';
    if (u === 'MEDIUM') return '#f59e0b';
    return '#22c55e';
  };

  const timeLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <>
      <Navbar />

      <div className="container page-wrapper">
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 className="heading-lg text-gradient" style={{ marginBottom: '0.25rem' }}>Live Rescue Feed</h1>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              {filtered.length} donation{filtered.length !== 1 ? 's' : ''} available right now
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              id="recipient-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="urgency">Sort: Urgency</option>
              <option value="expiry">Sort: Expiry</option>
              {userLocation && <option value="distance">Sort: Distance</option>}
            </select>
            <button
              id="recipient-claims-btn"
              className="btn-secondary"
              onClick={() => navigate('/recipient/claims')}
            >
              📦 My Claims
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            className={`btn-secondary ${viewMode === 'feed' ? 'active' : ''}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: viewMode === 'feed' ? 'var(--color-primary)' : '' }}
            onClick={() => setViewMode('feed')}
          >
            📋 List Feed
          </button>
          <button
            className={`btn-secondary ${viewMode === 'map' ? 'active' : ''}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: viewMode === 'map' ? 'var(--color-primary)' : '' }}
            onClick={() => setViewMode('map')}
          >
            🗺️ Map Explorer
          </button>

          <button
            className={`btn-secondary ${filterNearby ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              marginLeft: 'auto',
              borderColor: filterNearby ? 'var(--color-primary)' : '',
              color: filterNearby ? 'var(--color-primary-light)' : ''
            }}
            onClick={() => setFilterNearby(!filterNearby)}
          >
            📍 Within 15km Only
          </button>

          {!userLocation && (
            <button
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: 0.8 }}
              onClick={() => setUserLocation({ lat: 40.7128, lng: -74.0060 })} // Mock NYC for demo
            >
              🏠 Use Demo Location
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="filter-bar">
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, marginRight: '0.25rem' }}>Filter:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              id={`filter-${cat.toLowerCase()}`}
              className={`filter-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Feed / Map Content */}
        {viewMode === 'map' ? (
          <MapView
            donations={filtered}
            userLocation={userLocation}
            onClaim={handleClaim}
            claimingId={claimingId}
          />
        ) : filtered.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '5rem 2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>📡</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Watching for donations...</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto' }}>
              {activeCategory !== 'ALL'
                ? `No ${activeCategory.replace('_', ' ')} donations right now. Try another category.`
                : "As soon as a donor lists food, it will appear here instantly via WebSocket."}
            </p>
          </div>
        ) : (
          <div className="grid-cols-auto">
            {filtered.map((d) => (
              <div key={d.id} className="donation-card animate-slide-up">
                {/* Card Header */}
                <div className="flex-between">
                  <span className="category-chip">{d.category?.replace('_', ' ')}</span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    color: urgencyColor(d.urgency),
                    background: `${urgencyColor(d.urgency)}18`,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${urgencyColor(d.urgency)}35`,
                  }}>
                    🔥 {d.urgency}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <h4 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', lineHeight: 1.35 }}>
                    {d.itemDescription}
                  </h4>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {d.donorOrganization || d.donorName || 'Local Donor'}
                  </p>
                  {d.distance !== null && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      marginTop: '0.2rem'
                    }}>
                      📡 {d.distance.toFixed(1)} km away
                    </div>
                  )}
                </div>

                {/* Meta Row */}
                <div style={{
                  display: 'flex', gap: '1.25rem',
                  fontSize: '0.85rem', color: 'var(--color-text-sub)',
                }}>
                  <div><strong>{d.quantity}</strong> <span className="text-muted">items</span></div>
                  <div><strong>~{d.estimatedWeightKg}</strong> <span className="text-muted">kg</span></div>
                </div>

                {/* Expiry Countdown */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 0.9rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.85rem',
                }}>
                  <span>⏱</span>
                  <span className="text-muted">Expires in</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-accent)', marginLeft: 'auto' }}>
                    {timeLeft(d.expiresAt)}
                  </span>
                </div>

                {/* Claim Button */}
                <button
                  id={`claim-btn-${d.id}`}
                  className="btn-primary"
                  style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
                  onClick={() => handleClaim(d.id)}
                  disabled={claimingId === d.id}
                >
                  {claimingId === d.id ? '⏳ Claiming...' : '🤲 Claim Food'}
                </button>
                {(d.donorLatitude || d.donorAddress) && (
                  <button
                    className="btn-secondary"
                    style={{ width: '100%', borderRadius: 'var(--radius-md)', padding: '0.6rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      setViewMode('map');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    📍 View on Map
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Claim Modal */}
      {claimedCode && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="glass-panel animate-slide-up" style={{
            maxWidth: '400px', width: '100%', textAlign: 'center',
            border: '1px solid rgba(16,185,129,0.4)',
            boxShadow: '0 0 60px rgba(16,185,129,0.2)',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)', border: '2px solid var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', margin: '0 auto 1rem',
              animation: 'pulse-glow 2s infinite',
            }}>
              ✅
            </div>
            <h3 style={{ color: 'var(--color-primary)', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
              Claim Successful!
            </h3>
            <p className="text-muted" style={{ fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Present this QR code to the donor when you arrive for pickup.
            </p>

            <div style={{
              background: 'white', borderRadius: 'var(--radius-md)',
              padding: '1.25rem', display: 'inline-block', marginBottom: '1.5rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
              {claimedCode.qrImage ? (
                <img
                  src={claimedCode.qrImage}
                  alt="Pickup QR Code"
                  style={{ width: '200px', height: '200px', display: 'block' }}
                />
              ) : (
                <span style={{ color: '#000', fontFamily: 'monospace', fontSize: '1rem', wordBreak: 'break-all' }}>
                  {claimedCode.token}
                </span>
              )}
            </div>

            <button
              id="close-qr-modal"
              className="btn-secondary"
              style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
              onClick={() => setClaimedCode(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <SupportChatbot />
    </>
  );
};

export default RecipientApp;
