import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Animated Counter Hook ─────────────────────────────────────────
const useCounter = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
};

const ImpactCounter = ({ value, label, color, suffix = '', icon }) => {
  const [visible, setVisible] = useState(false);
  const count = useCounter(value, 2200, visible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    const el = document.getElementById(`counter-${label.replace(/\s/g, '-')}`);
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [label]);

  return (
    <div
      id={`counter-${label.replace(/\s/g, '-')}`}
      className="impact-card"
      style={{ '--card-border': color }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div className="impact-number" style={{ color }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="impact-label">{label}</div>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();

  const goToAuth = (role) => {
    navigate(`/auth?role=${role}`);
  };

  const features = [
    {
      icon: '✨',
      title: 'AI-Powered Listing',
      desc: 'Describe surplus food in plain text. Our Groq-powered AI auto-categorizes, estimates weight, and sets expiry — zero forms.',
      color: 'var(--color-primary)',
      bg: 'rgba(16,185,129,0.1)',
    },
    {
      icon: '⚡',
      title: 'Real-Time WebSocket Feed',
      desc: 'Recipients see new donations the instant they are listed. No polling, no refresh — pure live-stream infrastructure.',
      color: 'var(--color-secondary)',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      icon: '📱',
      title: 'QR Code Handover',
      desc: 'Every claim generates a unique QR code. Donors scan it on pickup to instantly mark the donation as completed.',
      color: 'var(--color-accent)',
      bg: 'rgba(245,158,11,0.1)',
    },
    {
      icon: '📊',
      title: 'Tax Reports (Apache POI)',
      desc: 'One-click Excel tax donation reports generated server-side, ready for your accountant or charity submission.',
      color: 'var(--color-purple)',
      bg: 'rgba(139,92,246,0.1)',
    },
    {
      icon: '🤖',
      title: 'MCP AI Agent Ready',
      desc: 'Phase 2 exposes platform operations as AI tools. NGO agents can auto-claim nearby food; admins can query by natural language.',
      color: '#f472b6',
      bg: 'rgba(244,114,182,0.1)',
    },
    {
      icon: '🔔',
      title: 'Smart Notifications',
      desc: 'Get notified when your listing is claimed, picked up, or about to expire — directly on the dashboard, in real time.',
      color: '#22d3ee',
      bg: 'rgba(34,211,238,0.1)',
    },
  ];

  const donorSteps = [
    { icon: '✍️', title: 'Describe your surplus', desc: 'Type a few sentences about your leftover food in natural language.' },
    { icon: '🧠', title: 'AI auto-lists it', desc: 'Groq processes your text and fills out category, quantity, urgency, and expiry.' },
    { icon: '📱', title: 'Scan QR on pickup', desc: 'When the NGO arrives, scan their QR code to complete the handover.' },
  ];

  const recipientSteps = [
    { icon: '📡', title: 'Watch the live feed', desc: 'New donations appear instantly on your dashboard, no refresh needed.' },
    { icon: '👆', title: 'Claim in one tap', desc: 'Hit Claim Food and receive an instant QR code for pickup verification.' },
    { icon: '✅', title: 'Pick it up', desc: 'Head to the donor location and show your QR code to complete the handover.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)' }}>

      {/* ── Public Navbar ─────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-logo" style={{ cursor: 'default' }}>
          <div className="navbar-logo-icon">🍽️</div>
          <span>ResQ<span style={{ color: 'var(--color-primary)' }}>Plate</span></span>
        </div>
        <div className="navbar-links" />
        <div className="navbar-right">
          <button
            className="btn-secondary"
            style={{ padding: '0.45rem 1.25rem', fontSize: '0.88rem', borderRadius: 'var(--radius-md)' }}
            onClick={() => navigate('/auth')}
          >
            Sign In
          </button>
          <button className="btn-primary" style={{ padding: '0.55rem 1.4rem', fontSize: '0.9rem' }} onClick={() => navigate('/auth?mode=register')}>
            Get Started →
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-bg" />
        <div className="hero-grid-lines" />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px', width: '100%' }}>
          <div className="hero-badge">
            🌱 Zero-Waste Food Rescue Network
          </div>
          <h1 className="heading-xl" style={{ marginBottom: '1.5rem' }}>
            Rescue surplus food.{' '}
            <span className="text-gradient">Feed communities.</span>
          </h1>
          <p style={{ fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', color: 'var(--color-text-sub)', maxWidth: '540px', margin: '0 auto', lineHeight: 1.7 }}>
            A real-time AI-powered platform connecting restaurants, bakeries, and supermarkets with NGOs and food banks — before the food expires.
          </p>
          <div className="hero-ctas">
            <button id="hero-cta-donor" className="btn-hero-donor" onClick={() => goToAuth('DONOR')}>
              🍽️ I'm a Donor
              <span style={{ fontSize: '1.2rem' }}>→</span>
            </button>
            <button id="hero-cta-recipient" className="btn-hero-recipient" onClick={() => goToAuth('RECIPIENT')}>
              🤲 I'm an NGO / Recipient
            </button>
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Free forever • No credit card • 2-minute setup
          </p>
        </div>
      </section>

      {/* ── Impact Counters ───────────────────────────────────── */}
      <section className="section" style={{ paddingTop: '2rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <span className="section-label">Our Impact</span>
            <h2 className="heading-lg" style={{ marginTop: '0.5rem' }}>
              Numbers that <span className="text-gradient">matter</span>
            </h2>
          </div>
          <div className="impact-grid">
            <ImpactCounter value={12847} label="Pounds of Food Rescued" color="var(--color-primary)" icon="🥗" />
            <ImpactCounter value={3200} label="Meals Served" color="var(--color-secondary)" icon="🍴" suffix="+" />
            <ImpactCounter value={98} label="Tonnes CO₂ Avoided" color="var(--color-accent)" icon="🌍" />
            <ImpactCounter value={340} label="Active Donors" color="var(--color-purple)" icon="🏪" />
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="section-label">How It Works</span>
            <h2 className="heading-lg" style={{ marginTop: '0.5rem' }}>
              Simple as <span className="text-gradient">1–2–3</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
            {/* Donor Flow */}
            <div>
              <h3 style={{ marginBottom: '1.25rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🍽️ For Donors
              </h3>
              <div className="steps-container">
                {donorSteps.map((s, i) => (
                  <div key={i} className="step-card">
                    <div className="step-number">{i + 1}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span>{s.icon}</span>
                        <strong>{s.title}</strong>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Recipient Flow */}
            <div>
              <h3 style={{ marginBottom: '1.25rem', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🤲 For NGOs & Recipients
              </h3>
              <div className="steps-container">
                {recipientSteps.map((s, i) => (
                  <div key={i} className="step-card">
                    <div className="step-number" style={{ background: 'linear-gradient(135deg, var(--color-secondary), var(--color-purple))' }}>{i + 1}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span>{s.icon}</span>
                        <strong>{s.title}</strong>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────── */}
      <section className="section" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="section-label">Platform Features</span>
            <h2 className="heading-lg" style={{ marginTop: '0.5rem' }}>
              Built for <span className="text-gradient">scale</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {features.map((f, i) => (
              <div
                key={i}
                className="feature-card"
                style={{ '--card-glow': f.bg }}
              >
                <div className="feature-icon" style={{ background: f.bg }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.1) 100%)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: '4rem 2rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
              width: '600px', height: '300px',
              background: 'radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <h2 className="heading-lg" style={{ marginBottom: '1rem', position: 'relative' }}>
              Ready to make a <span className="text-gradient">difference?</span>
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', maxWidth: '440px', margin: '0 auto 2rem', position: 'relative' }}>
              Join hundreds of donors and NGOs already using ResQ Plate to redirect quality food from waste to plate.
            </p>
            <div className="hero-ctas" style={{ position: 'relative' }}>
              <button id="cta-banner-donor" className="btn-hero-donor" onClick={() => goToAuth('DONOR')}>
                🍽️ Register as Donor
              </button>
              <button id="cta-banner-recipient" className="btn-hero-recipient" onClick={() => goToAuth('RECIPIENT')}>
                🤲 Register as NGO
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="container">
          <div className="navbar-logo" style={{ justifyContent: 'center', marginBottom: '1rem', textDecoration: 'none' }}>
            <div className="navbar-logo-icon">🍽️</div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>
              ResQ<span style={{ color: 'var(--color-primary)' }}>Plate</span>
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
            Zero-Waste Food Rescue Network · Powered by Spring AI + MCP
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} ResQ Plate. Built with ❤️ to fight food waste.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
