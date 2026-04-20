import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { WebSocketContext } from '../context/WebSocketContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { isConnected } = useContext(WebSocketContext);
  const location = useLocation();
  const navigate = useNavigate();

  const isDonor = user?.role === 'DONOR';
  const isRecipient = user?.role === 'RECIPIENT';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to={isDonor ? '/donor' : isRecipient ? '/recipient' : '/'} className="navbar-logo">
        <div className="navbar-logo-icon">🍽️</div>
        <span>ResQ<span style={{ color: 'var(--color-primary)' }}>Plate</span></span>
      </Link>

      {/* Navigation Links */}
      <div className="navbar-links">
        {isDonor && (
          <>
            <Link
              to="/donor"
              className={`nav-link ${isActive('/donor') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link
              to="/donor/orders"
              className={`nav-link ${isActive('/donor/orders') ? 'active' : ''}`}
            >
              Orders & Claims
            </Link>
          </>
        )}
        {isRecipient && (
          <>
            <Link
              to="/recipient"
              className={`nav-link ${isActive('/recipient') ? 'active' : ''}`}
            >
              Live Feed
            </Link>
            <Link
              to="/recipient/claims"
              className={`nav-link ${isActive('/recipient/claims') ? 'active' : ''}`}
            >
              My Claims
            </Link>
          </>
        )}
      </div>

      {/* Right Side */}
      <div className="navbar-right">
        {/* WebSocket Status */}
        <div className={`ws-badge ${isConnected ? 'live' : ''}`}>
          <span className="ws-dot" />
          {isConnected ? 'Live' : 'Offline'}
        </div>

        {/* User name chip */}
        {user && (
          <div style={{
            padding: '0.35rem 0.9rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.82rem',
            fontWeight: '600',
            color: 'var(--color-text-sub)',
            maxWidth: '140px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {user.name}
          </div>
        )}

        {/* Logout */}
        <button
          className="btn-secondary"
          onClick={handleLogout}
          style={{ padding: '0.45rem 1.1rem', fontSize: '0.88rem', borderRadius: 'var(--radius-md)' }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
