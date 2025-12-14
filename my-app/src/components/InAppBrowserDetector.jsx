import { useState, useEffect } from "react";

/**
 * Detects if user is viewing from Instagram/Facebook/TikTok in-app browser
 * and shows a prompt to open in default browser for full functionality
 */
export default function InAppBrowserDetector() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [browserType, setBrowserType] = useState("");

  useEffect(() => {
    const detectInAppBrowser = () => {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      
      // Detect various in-app browsers
      const isInstagram = ua.indexOf("Instagram") > -1;
      const isFacebook = ua.indexOf("FBAN") > -1 || ua.indexOf("FBAV") > -1;
      const isTikTok = ua.indexOf("BytedanceWebview") > -1 || ua.indexOf("musical_ly") > -1;
      const isLine = ua.indexOf("Line") > -1;
      const isTwitter = ua.indexOf("Twitter") > -1;
      
      if (isInstagram) {
        setBrowserType("Instagram");
        setShowPrompt(true);
      } else if (isFacebook) {
        setBrowserType("Facebook");
        setShowPrompt(true);
      } else if (isTikTok) {
        setBrowserType("TikTok");
        setShowPrompt(true);
      } else if (isLine) {
        setBrowserType("Line");
        setShowPrompt(true);
      } else if (isTwitter) {
        setBrowserType("Twitter");
        setShowPrompt(true);
      }
    };

    detectInAppBrowser();
  }, []);

  const handleOpenInBrowser = () => {
    const currentUrl = window.location.href;
    
    // For iOS - try to open in Safari
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // Try intent-based opening for iOS
      window.location.href = `x-safari-${currentUrl}`;
      
      // Fallback: show instructions
      setTimeout(() => {
        alert("Tap menu (⋯) di kanan bawah, lalu pilih 'Open in Safari' atau 'Buka di Safari'");
      }, 500);
    } 
    // For Android
    else if (/Android/i.test(navigator.userAgent)) {
      // Try intent-based opening for Android
      const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
      
      // Fallback
      setTimeout(() => {
        alert("Tap menu (⋮) di kanan atas, lalu pilih 'Open in Chrome' atau 'Buka di Browser'");
      }, 500);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store in sessionStorage so it doesn't show again in this session
    sessionStorage.setItem("inAppBrowserDismissed", "true");
  };

  // Check if already dismissed
  useEffect(() => {
    if (sessionStorage.getItem("inAppBrowserDismissed") === "true") {
      setShowPrompt(false);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        {/* Warning Icon */}
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        
        {/* Title */}
        <h2
          style={{
            color: "#5D4E47",
            fontSize: "20px",
            fontWeight: "700",
            marginBottom: "12px",
          }}
        >
          Buka di Browser
        </h2>
        
        {/* Description */}
        <p
          style={{
            color: "#7a6b63",
            fontSize: "14px",
            lineHeight: "1.5",
            marginBottom: "20px",
          }}
        >
          Kamu membuka Fremio dari <strong>{browserType}</strong>. 
          Untuk pengalaman terbaik dan bisa download foto, silakan buka di browser (Safari/Chrome).
        </p>

        {/* Instructions */}
        <div
          style={{
            backgroundColor: "#f7f1ed",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
            textAlign: "left",
          }}
        >
          <p style={{ color: "#5D4E47", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
            Cara membuka di browser:
          </p>
          <ol style={{ color: "#7a6b63", fontSize: "13px", lineHeight: "1.6", paddingLeft: "20px", margin: 0 }}>
            <li>Tap menu <strong>⋯</strong> (titik tiga) di pojok</li>
            <li>Pilih <strong>"Open in Safari"</strong> atau <strong>"Buka di Browser"</strong></li>
          </ol>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={handleOpenInBrowser}
            style={{
              backgroundColor: "#E8A889",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "14px 24px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Buka di Browser
          </button>
          
          <button
            onClick={handleDismiss}
            style={{
              backgroundColor: "transparent",
              color: "#7a6b63",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "12px 24px",
              fontSize: "14px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Lanjutkan di {browserType}
          </button>
        </div>

        {/* Note */}
        <p
          style={{
            color: "#999",
            fontSize: "11px",
            marginTop: "16px",
          }}
        >
          *Download foto mungkin tidak berfungsi di browser {browserType}
        </p>
      </div>
    </div>
  );
}
