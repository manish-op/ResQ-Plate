import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? false : true;
  const initialRole = searchParams.get('role') || 'DONOR';

  const [isLogin, setIsLogin] = useState(initialMode);
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organizationName: '',
  });
  const [error, setError] = useState(null);

  const { login, register, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'DONOR') navigate('/donor');
      else if (user.role === 'RECIPIENT') navigate('/recipient');
    }
  }, [user, loading, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register({ ...formData, role: selectedRole });
    }

    setIsSubmitting(false);

    if (result.success) {
      const u = JSON.parse(localStorage.getItem('user'));
      if (u.role === 'DONOR') navigate('/donor');
      else if (u.role === 'RECIPIENT') navigate('/recipient');
    } else {
      setError(result.message);
    }
  };

  const roleCards = [
    {
      key: 'DONOR',
      icon: '🍽️',
      title: 'Donor',
      sub: 'Restaurant, bakery, supermarket',
      color: 'var(--color-primary)',
      glow: 'rgba(16,185,129,0.25)',
    },
    {
      key: 'RECIPIENT',
      icon: '🤲',
      title: 'Recipient / NGO',
      sub: 'Food bank, shelter, charity',
      color: 'var(--color-secondary)',
      glow: 'rgba(59,130,246,0.25)',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Blobs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '50vw', height: '50vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '50vw', height: '50vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }} className="animate-slide-up">
        {/* Back to Home */}
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          ← Back to Home
        </Link>

        <div className="glass-panel">
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', margin: '0 auto 1rem',
            }}>🍽️</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Resq<span className="text-gradient">Plate</span>
            </h1>
            <p className="text-muted" style={{ marginTop: '0.35rem', fontSize: '0.9rem' }}>
              {isLogin ? 'Welcome back to the rescue network' : 'Join the food rescue mission'}
            </p>
          </div>

          {/* Tab Switch */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.04)',
            borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '1.75rem',
          }}>
            {['Login', 'Register'].map((tab, i) => (
              <button
                key={tab}
                id={`auth-tab-${tab.toLowerCase()}`}
                onClick={() => { setIsLogin(i === 0); setError(null); }}
                style={{
                  flex: 1, padding: '0.55rem', border: 'none', cursor: 'pointer',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                  background: ((i === 0) === isLogin) ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: ((i === 0) === isLogin) ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                  boxShadow: ((i === 0) === isLogin) ? '0 1px 8px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              marginBottom: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.88rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isLogin && (
              <>
                {/* Role Selector Cards */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.6rem', display: 'block', letterSpacing: '0.05em' }}>
                    I AM A...
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {roleCards.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        id={`role-select-${r.key.toLowerCase()}`}
                        onClick={() => setSelectedRole(r.key)}
                        style={{
                          padding: '1rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${selectedRole === r.key ? r.color : 'rgba(255,255,255,0.08)'}`,
                          background: selectedRole === r.key ? `${r.glow}` : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          boxShadow: selectedRole === r.key ? `0 4px 20px ${r.glow}` : 'none',
                        }}
                      >
                        <div style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>{r.icon}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: selectedRole === r.key ? r.color : 'var(--color-text-sub)' }}>{r.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{r.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  name="name"
                  placeholder="Your full name"
                  required
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="organizationName"
                  placeholder="Organization name (optional)"
                  onChange={handleChange}
                />
              </>
            )}

            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              onChange={handleChange}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              onChange={handleChange}
            />

            <div style={{ position: 'relative', margin: '1rem 0', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--color-border)', zIndex: 0 }} />
              <span style={{ position: 'relative', background: 'var(--color-bg-primary)', padding: '0 0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', zIndex: 1 }}>
                OR
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/google'}
              className="btn-secondary"
              style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184L12.048 13.56c-.813.545-1.854.867-3.048.867-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
                <path d="M3.964 10.712c-.18-.545-.282-1.125-.282-1.712s.102-1.167.282-1.712V4.956H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.044l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.956L3.964 7.288c.708-2.127 2.692-3.708 5.036-3.708z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <button
              id="auth-submit-btn"
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ marginTop: '0.5rem', padding: '0.9rem', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}
            >
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
                    <path d="M8 2 A6 6 0 0 1 14 8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                  Processing...
                </span>
              ) : isLogin ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem' }}>
            <span className="text-muted">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(null); }}
              style={{ fontWeight: 600 }}
            >
              {isLogin ? 'Register' : 'Sign In'}
            </a>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuthPage;
