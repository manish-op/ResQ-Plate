import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const QrVerifyPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('VERIFYING'); // VERIFYING, SUCCESS, ERROR
  const [message, setMessage] = useState('Verifying claim token...');
  const [claimDetails, setClaimDetails] = useState(null);

  useEffect(() => {
    // This simulates the store owner arriving at this route from a QR scan
    verifyCode();
  }, [token]);

  const verifyCode = async () => {
    try {
      // Assuming GET /api/qr/verify/{token} executes the claim verification
      const res = await api.get(`/qr/verify/${token}`);
      setStatus('SUCCESS');
      setMessage(res.data.message || 'Donation successfully picked up!');
      setClaimDetails(res.data.data);
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
      setMessage(e.response?.data?.message || 'Invalid or expired QR code.');
    }
  };

  return (
    <div className="page-wrapper flex-center container" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div className="glass-panel text-center" style={{ width: '100%', maxWidth: '500px', padding: '3rem' }}>
        
        {status === 'VERIFYING' && (
          <div>
            <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite', marginBottom: '1rem' }}>🔄</div>
            <h2 className="heading-lg" style={{ marginBottom: '1rem' }}>Please Wait</h2>
            <p className="text-muted">{message}</p>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div className="animate-slide-up">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 className="heading-lg" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Verified</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>{message}</p>
            
            {claimDetails && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px', textAlign: 'left', marginBottom: '2rem' }}>
                <p><strong>Item:</strong> {claimDetails.donation?.itemDescription}</p>
                <p><strong>Quantity:</strong> {claimDetails.donation?.quantity}</p>
                <p><strong>Claimed By:</strong> {claimDetails.claimant?.name}</p>
                <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                  Status updated. The network thanks you!
                </p>
              </div>
            )}
            
            <button className="btn-primary" onClick={() => navigate('/')}>Return to Home</button>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="animate-fade-in">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
            <h2 className="heading-lg" style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Verification Failed</h2>
            <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>{message}</p>
            
            <button className="btn-secondary" onClick={() => navigate('/')}>Return to Home</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default QrVerifyPage;
