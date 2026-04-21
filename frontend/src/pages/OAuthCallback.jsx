import React, { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { oauthLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const isPending = searchParams.get('pending');

    if (token && refreshToken) {
      oauthLogin(token, refreshToken, isPending).then((result) => {
        if (result.success) {
          if (result.pending) {
            navigate('/finish-profile');
          } else {
            // Normal redirect based on role (fetched in oauthLogin)
            const user = JSON.parse(localStorage.getItem('user'));
            if (user.role === 'DONOR') navigate('/donor');
            else if (user.role === 'RECIPIENT') navigate('/recipient');
            else navigate('/');
          }
        } else {
          navigate('/auth?error=oauth_failed');
        }
      });
    } else {
      navigate('/auth?error=invalid_callback');
    }
  }, [searchParams, oauthLogin, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)' }}>
      <div className="flex-col" style={{ alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-primary-glow)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontWeight: 600, color: 'var(--color-text-sub)' }}>Synchronizing your secure session...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OAuthCallback;
