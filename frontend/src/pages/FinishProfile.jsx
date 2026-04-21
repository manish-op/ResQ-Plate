import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const FinishProfile = () => {
  const [role, setRole] = useState('DONOR');
  const [org, setOrg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await api.post('/auth/complete-profile', {
        role,
        organizationName: org
      });
      
      const { token, refreshToken, userId, email, role: finalRole, name } = response.data.data;
      
      // Update tokens and user state
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      const userData = { id: userId, email, role: finalRole, name };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      if (finalRole === 'DONOR') navigate('/donor');
      else navigate('/recipient');
    } catch (error) {
      console.error("Profile completion failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)', padding: '2rem' }}>
      <div className="glass-panel" style={{ maxWidth: '480px', width: '100%' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>One Last Step</h1>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Welcome! To give you the best experience, please tell us how you'll be using ResQ Plate.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setRole('DONOR')}
              style={{
                padding: '1.5rem 1rem', borderRadius: 'var(--radius-md)',
                border: `2px solid ${role === 'DONOR' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: role === 'DONOR' ? 'var(--color-primary-glow)' : 'white',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🍽️</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: role === 'DONOR' ? 'var(--color-primary)' : 'var(--color-text-main)' }}>I want to DONO</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('RECIPIENT')}
              style={{
                padding: '1.5rem 1rem', borderRadius: 'var(--radius-md)',
                border: `2px solid ${role === 'RECIPIENT' ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                background: role === 'RECIPIENT' ? 'var(--color-secondary-glow)' : 'white',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤲</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: role === 'RECIPIENT' ? 'var(--color-secondary)' : 'var(--color-text-main)' }}>I want to RECEIVE</div>
            </button>
          </div>
          
          <div className="flex-col" style={{ gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Organization / Business Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. SunnySide Bakery or Hope Shelter"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ padding: '1rem' }}>
            {isSubmitting ? 'Finalizing...' : 'Complete My Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FinishProfile;
