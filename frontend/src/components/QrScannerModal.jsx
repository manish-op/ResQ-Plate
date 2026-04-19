import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../services/api';

const QrScannerModal = ({ onClose, onSuccess }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let scanner = null;

    // React 18 StrictMode double-mount fix for hardware cameras:
    // We delay the initialization slightly. If React immediately unmounts this (Strict Mode), 
    // the timeout is cleared and the double-camera leak is prevented.
    const timer = setTimeout(() => {
      scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          aspectRatio: 1.0,
        },
        /* verbose= */ false
      );

      scanner.render(handleScanSuccess, handleScanError);
    }, 50);

    // Cleanup when component unmounts
    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScanSuccess = async (decodedText) => {
    // Decoding incoming QR JSON payload
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      let payload;
      try {
        payload = JSON.parse(decodedText);
      } catch (e) {
        // Dynamic Fallback for Legacy or Raw Tokens
        if (decodedText.includes('/api/qr/verify/')) {
          const parts = decodedText.split('/');
          const token = parts[parts.length - 1];
          payload = { qrToken: token, legacy: true, claimantName: 'Legacy User', orderId: null };
        } else if (decodedText.length > 20) {
          // Assume raw token string (UUID)
          payload = { qrToken: decodedText, legacy: true, claimantName: 'Legacy User', orderId: null };
        } else {
          throw new Error("Invalid Format. Please ensure you are scanning a ResQ Plate identity QR.");
        }
      }

      if (!payload.qrToken) {
        throw new Error("QR Code is missing required identification tokens.");
      }

      // Propagate the parsed JSON data to the parent business logic board
      onSuccess(payload);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to verify QR Code.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanError = (err) => {
    // Silently ignore format errors during frame scan
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-panel animate-scale-in" style={{
        padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center', position: 'relative'
      }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>📷 Scan Recipient QR</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Align the recipient's QR code within the frame below.
        </p>

        {error && <div className="btn-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
        {loading && <div style={{ color: 'var(--color-secondary)', marginBottom: '1rem' }}>Verifying... please wait</div>}

        <div id="qr-reader-container" style={{ width: '100%', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}></div>

        <button
          className="btn-secondary"
          style={{ marginTop: '1.5rem', width: '100%' }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default QrScannerModal;
