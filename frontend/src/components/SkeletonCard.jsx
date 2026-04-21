import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="donation-card skeleton-card" style={{ height: '320px', background: '#ffffff', opacity: 0.6 }}>
      <div className="skeleton-line" style={{ width: '30%', height: '20px', background: '#f1f5f9', marginBottom: '1rem' }}></div>
      <div className="skeleton-line" style={{ width: '80%', height: '24px', background: '#f1f5f9', marginBottom: '0.5rem' }}></div>
      <div className="skeleton-line" style={{ width: '60%', height: '24px', background: '#f1f5f9', marginBottom: '1.5rem' }}></div>
      <div className="skeleton-line" style={{ width: '100%', height: '40px', background: '#f1f5f9', marginBottom: '1rem' }}></div>
      <div className="skeleton-line" style={{ width: '100%', height: '40px', background: '#f1f5f9' }}></div>
      
      <style>{`
        .skeleton-card {
          position: relative;
          overflow: hidden;
        }
        .skeleton-line {
          position: relative;
          background: #f1f5f9;
        }
        .skeleton-line::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: shimmer-effect 1.5s infinite;
        }
        @keyframes shimmer-effect {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default SkeletonCard;
