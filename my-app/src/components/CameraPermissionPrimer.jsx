import React from "react";
import "./CameraPermissionPrimer.css";

/**
 * Camera Permission Priming Component
 * Explains why camera permission is needed before requesting
 */
const CameraPermissionPrimer = ({ onRequestPermission, onSkip }) => {
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState(null);

  const handleRequestPermission = async () => {
    if (isRequesting) {
      console.log("⏸️ Already requesting, skipping");
      return;
    }

    console.log("🎬 Camera permission button clicked");
    setIsRequesting(true);
    setErrorMessage(null);

    try {
      await onRequestPermission();
      console.log("✅ Permission request completed");
    } catch (error) {
      console.error("❌ Permission request error:", error);
      setErrorMessage(
        error.message || "Gagal meminta izin kamera. Silakan coba lagi."
      );
    } finally {
      setIsRequesting(false);
      console.log("🔄 Request state reset");
    }
  };

  const handleSkip = () => {
    console.log("⏭️ Skip button clicked");
    try {
      onSkip();
    } catch (error) {
      console.error("❌ Error in skip handler:", error);
      // Still try to call onSkip even if there's an error
    }
  };

  return (
    <div className="permission-primer-overlay">
      <div className="permission-primer-content">
        <div className="permission-icon">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>

        <h2>Izinkan Akses Kamera</h2>

        <p className="permission-description">
          Fremio membutuhkan akses ke kamera untuk mengambil foto Anda dengan
          frame yang dipilih.
        </p>

        <div className="permission-benefits">
          <div className="benefit-item">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Ambil foto langsung dari browser</span>
          </div>
          <div className="benefit-item">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Preview real-time dengan frame</span>
          </div>
          <div className="benefit-item">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Privasi terjaga - foto tidak disimpan di server</span>
          </div>
        </div>

        {errorMessage && (
          <div className="permission-error-message">⚠️ {errorMessage}</div>
        )}

        <button
          className="permission-primer-primary"
          onClick={handleRequestPermission}
          disabled={isRequesting}
          style={{
            opacity: isRequesting ? 0.6 : 1,
            cursor: isRequesting ? "not-allowed" : "pointer",
            pointerEvents: "auto", // Always allow pointer events
          }}
        >
          {isRequesting ? "⏳ Meminta Izin..." : "Izinkan Kamera"}
        </button>

        <button 
          className="permission-primer-secondary" 
          onClick={handleSkip}
          disabled={isRequesting}
          style={{
            pointerEvents: "auto", // Always allow pointer events
          }}
        >
          Upload Foto Saja
        </button>

        <div className="permission-note">
          💡 <strong>Tip:</strong> Pilih "Allow" atau "Izinkan" saat browser
          meminta izin kamera
        </div>
      </div>
    </div>
  );
};

export default CameraPermissionPrimer;
