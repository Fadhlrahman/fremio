import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

export default function TabletPrinter() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);
  const [lastCode, setLastCode] = useState(null);
  const [printStatus, setPrintStatus] = useState('');
  const [apiUrl] = useState(process.env.REACT_APP_API_URL || 'http://localhost:3001');
  const [stats, setStats] = useState({ total: 0, pending: 0, printing: 0, completed: 0 });
  const [printerConnected, setPrinterConnected] = useState(false);
  const [stream, setStream] = useState(null);

  // Initialize camera
  useEffect(() => {
    initializeCamera();
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    
    return () => {
      clearInterval(interval);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      // Start QR detection
      startQRDetection();
    } catch (error) {
      console.error('Camera access error:', error);
      setPrintStatus('❌ Camera access denied');
    }
  };

  const startQRDetection = () => {
    const detectQR = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) {
        if (isScanning) {
          setTimeout(detectQR, 100);
        }
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const video = videoRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Simple QR detection using image analysis
        // In production, you might want to use a more robust library
        try {
          const qrCode = detectQRFromImageData(imageData);
          if (qrCode && qrCode.startsWith('FREMIO-') && qrCode !== lastCode) {
            handleQRDetected(qrCode);
          }
        } catch (error) {
          // Continue scanning
        }
      }
      
      if (isScanning) {
        setTimeout(detectQR, 100);
      }
    };
    
    detectQR();
  };

  const detectQRFromImageData = (imageData) => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      return code ? code.data : null;
    } catch (error) {
      return null;
    }
  };

  const handleQRDetected = async (qrCode) => {
    setLastCode(qrCode);
    setIsScanning(false);
    setPrintStatus('📷 QR Code detected, fetching photo...');
    
    try {
      console.log('📷 Detected QR code:', qrCode);
      
      // Fetch photo from server
      const response = await fetch(`${apiUrl}/api/photo/${qrCode}`);
      
      if (!response.ok) {
        throw new Error('Photo not found or already printed');
      }
      
      const data = await response.json();
      setPrintStatus('🖨️ Sending to printer...');
      
      // Send to printer
      await sendToPrinter(data.photoUrl, data.frameType, qrCode);
      
      setPrintStatus('✅ Print job completed!');
      
      // Mark as completed
      await fetch(`${apiUrl}/api/print-completed/${qrCode}`, {
        method: 'POST'
      });
      
    } catch (error) {
      console.error('Print error:', error);
      setPrintStatus(`❌ Error: ${error.message}`);
    }
    
    // Reset after 3 seconds
    setTimeout(() => {
      setIsScanning(true);
      setLastCode(null);
      setPrintStatus('');
    }, 3000);
  };

  const sendToPrinter = async (photoUrl, frameType, code) => {
    // For demo purposes, simulate printing
    console.log('🖨️ Printing:', { photoUrl, frameType, code });
    
    // Simulate printer delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In real implementation, this would:
    // 1. Download the image from photoUrl
    // 2. Send to printer via USB/Network/Bluetooth
    // 3. Handle printer responses and errors
    
    return true;
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          total: data.queueSize || 0,
          pending: data.queueSize || 0,
          printing: 0,
          completed: 0
        });
        setPrinterConnected(true);
      } else {
        setPrinterConnected(false);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setPrinterConnected(false);
    }
  };

  const manualQRInput = () => {
    const code = prompt('Enter QR Code (for testing):');
    if (code && code.startsWith('FREMIO-')) {
      handleQRDetected(code);
    }
  };

  const getStatusColor = () => {
    if (printStatus.includes('❌')) return '#ef4444';
    if (printStatus.includes('✅')) return '#10b981';
    if (printStatus.includes('🖨️')) return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        padding: '1.5rem',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #fff 0%, #e2e8f0 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🖨️ Fremio Printer Agent
          </h1>
          <p style={{ 
            margin: '0.25rem 0 0 0', 
            opacity: 0.9,
            fontSize: '0.9rem'
          }}>
            Scan QR code from photobooth to print photos
          </p>
        </div>
        
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ← Back to Photobooth
        </button>
      </header>
      
      {/* Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        padding: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '0.5rem 1rem',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          fontSize: '0.85rem'
        }}>
          🌐 Server: {printerConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '0.5rem 1rem',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          fontSize: '0.85rem'
        }}>
          📋 Queue: {stats.total}
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '0.5rem 1rem',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          fontSize: '0.85rem'
        }}>
          🖨️ Printer: {printerConnected ? '🟢 Ready' : '🔴 Offline'}
        </div>
      </div>
      
      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        {isScanning ? (
          <div style={{
            width: '100%',
            maxWidth: '600px',
            background: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            {/* Camera Video */}
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '400px',
                objectFit: 'cover'
              }}
              playsInline
              muted
            />
            
            {/* Hidden canvas for QR detection */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            
            {/* Scan Overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)'
            }}>
              <div style={{
                width: '250px',
                height: '250px',
                border: '3px solid white',
                borderRadius: '20px',
                position: 'relative',
                background: 'rgba(255,255,255,0.1)'
              }}>
                {/* Corner markers */}
                {[
                  { top: '-3px', left: '-3px' },
                  { top: '-3px', right: '-3px' },
                  { bottom: '-3px', left: '-3px' },
                  { bottom: '-3px', right: '-3px' }
                ].map((pos, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: '20px',
                      height: '20px',
                      border: '3px solid #10b981',
                      borderRadius: '4px',
                      ...pos
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div style={{
              padding: '1rem',
              textAlign: 'center',
              color: '#666',
              fontSize: '0.9rem'
            }}>
              Position QR code within the green frame
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            fontSize: '1.5rem',
            padding: '3rem 2rem',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '20px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '500px'
          }}>
            <div style={{ 
              marginBottom: '1rem', 
              fontSize: '3rem',
              color: getStatusColor()
            }}>
              {printStatus.includes('❌') ? '❌' : 
               printStatus.includes('✅') ? '✅' : 
               printStatus.includes('🖨️') ? '🖨️' : '📷'}
            </div>
            {printStatus}
            {printStatus.includes('completed') && (
              <div style={{
                marginTop: '1rem',
                fontSize: '1rem',
                opacity: 0.8
              }}>
                Ready for next scan...
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Controls */}
      <div style={{
        padding: '1rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={manualQRInput}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            backdropFilter: 'blur(10px)'
          }}
        >
          📝 Manual Input (Test)
        </button>
        
        <button
          onClick={fetchStats}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            backdropFilter: 'blur(10px)'
          }}
        >
          🔄 Refresh Status
        </button>
        
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#E8A889',
            border: 'none',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          🔄 Restart Scanner
        </button>
      </div>
      
      {/* Footer */}
      <footer style={{
        padding: '1rem',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.1)',
        fontSize: '0.8rem',
        opacity: 0.8
      }}>
        <div>
          Fremio Tablet Printer Agent v1.0.0 | API: {apiUrl}
        </div>
      </footer>
    </div>
  );
}