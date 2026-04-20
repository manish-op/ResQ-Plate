import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom Emoji Markers
const getEmojiIcon = (category) => {
  const emojis = {
    BAKERY: '🥖',
    PRODUCE: '🥦',
    COOKED_MEALS: '🍱',
    DAIRY: '🥛',
    BEVERAGES: '🥤',
    OTHER: '📦'
  };
  const emoji = emojis[category] || '📦';
  
  return L.divIcon({
    html: `<div class="custom-marker-emoji">${emoji}</div>`,
    className: 'custom-div-icon',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -30]
  });
};

const UserMarkerIcon = L.divIcon({
  html: `<div class="user-marker-pulse">🏠</div>`,
  className: 'custom-div-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -10]
});

// Component to handle map view adjustments
const ChangeView = ({ donations, userLocation }) => {
  const map = useMap();
  
  useEffect(() => {
    if (donations.length === 0 && !userLocation) return;
    
    const bounds = L.latLngBounds([]);
    if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);
    
    donations.forEach(d => {
      if (d.donorLatitude && d.donorLongitude) {
        bounds.extend([d.donorLatitude, d.donorLongitude]);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [donations, userLocation, map]);
  
  return null;
};

const MapView = ({ donations, userLocation, onClaim, claimingId }) => {
  const defaultCenter = [40.7128, -74.0060];
  const center = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

  const urgencyColor = (u) => {
    if (u === 'HIGH') return '#ef4444';
    if (u === 'MEDIUM') return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div className="map-container glass-panel animate-fade-in" style={{ height: '550px', width: '100%', marginBottom: '2rem', overflow: 'hidden', padding: 0 }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView donations={donations} userLocation={userLocation} />
        
        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={UserMarkerIcon}>
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>Your Current Location</strong>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>Searching for food nearby...</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Donation Markers */}
        {donations.map((d) => (
          d.donorLatitude && d.donorLongitude && (
            <Marker 
              key={d.id} 
              position={[d.donorLatitude, d.donorLongitude]} 
              icon={getEmojiIcon(d.category)}
            >
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="category-chip" style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem' }}>{d.category}</span>
                    <span style={{ color: urgencyColor(d.urgency), fontWeight: 'bold', fontSize: '0.7rem' }}>🔥 {d.urgency}</span>
                  </div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{d.itemDescription}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#888' }}>
                    {d.donorOrganization || d.donorName}<br/>
                    {d.distance !== null && <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>📡 {d.distance.toFixed(1)} km away</span>}
                  </p>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem' }}>📍 {d.donorAddress}</p>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                    onClick={() => onClaim(d.id)}
                    disabled={claimingId === d.id}
                  >
                    {claimingId === d.id ? '⏳ Claiming...' : '🤲 Claim Food'}
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
