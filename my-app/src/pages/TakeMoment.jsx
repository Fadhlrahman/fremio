import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TakeMoment() {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const videoRef = useRef();
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timer, setTimer] = useState(3); // Default 3 seconds
  const [currentPhoto, setCurrentPhoto] = useState(null); // For captured photo
  const [showConfirmation, setShowConfirmation] = useState(false); // Show confirmation modal
  const [videoAspectRatio, setVideoAspectRatio] = useState(4/3); // Default aspect ratio

  // Initialize with empty photos - don't load from localStorage automatically
  useEffect(() => {
    // Clear any existing photos and start fresh
    setCapturedPhotos([]);
    localStorage.removeItem('capturedPhotos'); // Clear localStorage to ensure clean start
  }, []);

  // Debug: Log when capturedPhotos changes
  useEffect(() => {
    console.log('capturedPhotos state updated:', capturedPhotos.length, 'photos');
    console.log('Photos array:', capturedPhotos.map((photo, idx) => `${idx}: ${photo.substring(0, 30)}...`));
  }, [capturedPhotos]);

    const handleCameraClick = async () => {
    try {
      console.log('� Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      console.log('✅ Camera stream obtained:', stream);
      
      // Set camera active FIRST so video element renders
      setCameraActive(true);
      
      // Wait for React to render the video element
      setTimeout(() => {
        if (videoRef.current) {
          console.log('📺 Assigning stream to video element...');
          videoRef.current.srcObject = stream;
          
          // Force play the video
          videoRef.current.play()
            .then(() => {
              console.log('▶️ Video play successful');
            })
            .catch((playError) => {
              console.error('❌ Video play failed:', playError);
            });
        } else {
          console.error('❌ Video ref not available');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      alert('Error accessing camera: ' + error.message);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhotos = [...capturedPhotos, e.target.result];
        setCapturedPhotos(newPhotos);
        localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const handleCapture = () => {
    if (!videoRef.current || capturing) return;
    
    setCapturing(true);
    
    // If timer is 0, capture immediately
    if (timer === 0) {
      capturePhoto();
      setCapturing(false);
      return;
    }
    
    // Otherwise, start countdown
    setCountdown(timer);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          capturePhoto();
          setCapturing(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    console.log('📸 Capturing photo with dimensions:', {
      width: canvas.width,
      height: canvas.height,
      aspectRatio: canvas.width / canvas.height,
      videoAspectRatio: videoAspectRatio
    });
    
    const ctx = canvas.getContext('2d');
    
    // Flip the canvas horizontally to counter the video flip
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/png');
    setCurrentPhoto(dataUrl);
    setShowConfirmation(true);
  };

  const handleChoosePhoto = () => {
    console.log('handleChoosePhoto called');
    console.log('Current photo:', currentPhoto ? currentPhoto.substring(0, 50) + '...' : 'null');
    console.log('Current capturedPhotos before update:', capturedPhotos);
    
    if (currentPhoto) {
      const newPhotos = [...capturedPhotos, currentPhoto];
      console.log('New photos array:', newPhotos.length, 'photos');
      setCapturedPhotos(newPhotos);
      localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
      setCurrentPhoto(null);
      setShowConfirmation(false);
      console.log('Photo added successfully');
    } else {
      console.log('No currentPhoto available');
    }
  };

  const handleRetakePhoto = () => {
    setCurrentPhoto(null);
    setShowConfirmation(false);
  };

  const handleEdit = () => {
    navigate('/editor');
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#E8D5C4',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '2rem' 
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#333',
          marginBottom: '0.5rem'
        }}>
          Take your <span style={{ color: '#E8A889' }}>moment</span>
        </h1>
      </div>

      {/* Main Container */}
      <div style={{
        background: '#E8C4B8',
        borderRadius: '20px',
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* Left Side - Camera */}
          <div>
            {/* Control Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              alignItems: 'center'
            }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                Choose file
              </button>
              
              <button
                onClick={cameraActive ? stopCamera : handleCameraClick}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {cameraActive ? 'Stop Camera' : 'Camera'}
              </button>

              {/* Timer Dropdown */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <label style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Timer:
                </label>
                <select
                  value={timer}
                  onChange={(e) => setTimer(Number(e.target.value))}
                  disabled={capturing}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#fff',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    cursor: capturing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    outline: 'none'
                  }}
                >
                  <option value={0}>0s (Instant)</option>
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </div>
            </div>

            {/* Camera/Capture Area */}
            {/* Camera/Capture Area */}
            <div style={{
              background: '#fff',
              borderRadius: '20px',
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '1.5rem'
            }}>
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '20px',
                      backgroundColor: '#000',
                      transform: 'scaleX(-1)' // Flip horizontally to fix mirror effect
                    }}
                    onLoadedMetadata={() => {
                      console.log('📊 Video metadata loaded');
                      if (videoRef.current) {
                        const width = videoRef.current.videoWidth;
                        const height = videoRef.current.videoHeight;
                        const aspectRatio = width / height;
                        
                        console.log('Video dimensions:', {
                          videoWidth: width,
                          videoHeight: height,
                          aspectRatio: aspectRatio
                        });
                        
                        // Save the actual video aspect ratio
                        setVideoAspectRatio(aspectRatio);
                      }
                    }}
                    onCanPlay={() => {
                      console.log('🎬 Video can play');
                    }}
                    onPlay={() => {
                      console.log('▶️ Video started playing');
                    }}
                    onError={(e) => {
                      console.error('🚫 Video error:', e);
                    }}
                  />
                  
                  {/* Countdown Overlay */}
                  {countdown && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'rgba(0,0,0,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '20px'
                    }}>
                      <div style={{
                        fontSize: '4rem',
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                      }}>
                        {countdown}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '1.2rem',
                  padding: '4rem'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
                  <div>Capture</div>
                </div>
              )}
            </div>            {/* Capture Button */}
            {cameraActive && (
              <div style={{
                textAlign: 'center'
              }}>
                <button
                  onClick={handleCapture}
                  disabled={capturing}
                  style={{
                    padding: '1rem 2rem',
                    background: capturing ? '#6c757d' : '#E8A889',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    cursor: capturing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  {capturing 
                    ? (timer === 0 ? "📸 Capturing..." : `📸 Capturing in ${countdown}...`) 
                    : (timer === 0 ? '📸 Capture (Instant)' : `📸 Capture (${timer}s timer)`)
                  }
                </button>
              </div>
            )}
          </div>

          {/* Right Side - Preview */}
          <div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              Preview
            </h3>
            
            {/* Clean Preview Section - No Frame, Only Selected Photos */}
            <div style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              minHeight: '320px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {capturedPhotos.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem',
                  width: '100%',
                  maxWidth: '300px'
                }}>
                  {capturedPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      style={{
                        aspectRatio: videoAspectRatio.toString(),
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      <img
                        src={photo}
                        alt={`Photo ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onLoad={() => console.log(`Photo ${idx + 1} loaded in preview`)}
                        onError={(e) => console.log(`Photo ${idx + 1} failed to load in preview:`, e)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '1rem'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📸</div>
                  <div style={{ fontWeight: '500', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    No photos yet
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    Capture and select photos to see them here
                  </div>
                </div>
              )}
            </div>

            {/* Edit Button */}
            <button
              onClick={handleEdit}
              style={{
                width: '100%',
                padding: '1rem',
                background: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '25px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              Edit
            </button>
          </div>

        </div>
      </div>

      {/* Photo Confirmation Modal */}
      {showConfirmation && currentPhoto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '1.5rem'
            }}>
              📸 Foto berhasil diambil!
            </h3>
            
            <div style={{
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <img
                src={currentPhoto}
                alt="Captured"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleChoosePhoto}
                style={{
                  padding: '0.75rem 2rem',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(40,167,69,0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                ✓ Pilih
              </button>
              
              <button
                onClick={handleRetakePhoto}
                style={{
                  padding: '0.75rem 2rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(108,117,125,0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                🔄 Ulangi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
