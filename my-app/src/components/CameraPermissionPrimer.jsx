import React from 'react';
import './CameraPermissionPrimer.css';

/**
 * Camera Permission Priming Component
 * Explains why camera permission is needed before requesting
 */
const CameraPermissionPrimer = ({ onRequestPermission, onSkip }) => {
  return (
    <div className="permission-primer-overlay">
      <div className="permission-primer-content">
        <div className="permission-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        
        <h2>Izinkan Akses Kamera</h2>
        
        <p className="permission-description">
          Fremio membutuhkan akses ke kamera untuk mengambil foto Anda
          dengan frame yang dipilih.
        </p>
        
        <div className="permission-benefits">
          <div className="benefit-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Ambil foto langsung dari browser</span>
          </div>
          <div className="benefit-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Preview real-time dengan frame</span>
          </div>
          <div className="benefit-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Privasi terjaga - foto tidak disimpan di server</span>
          </div>
        </div>
        
        <button 
          className="permission-primer-primary"
          onClick={onRequestPermission}
        >
          Izinkan Kamera
        </button>
        
        <button 
          className="permission-primer-secondary"
          onClick={onSkip}
        >
          Upload Foto Saja
        </button>
        
        <div className="permission-note">
          💡 <strong>Tip:</strong> Pilih "Allow" atau "Izinkan" saat browser meminta izin kamera
        </div>
      </div>
    </div>
  );
};

export default CameraPermissionPrimer;
