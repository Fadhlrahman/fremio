import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import frameProvider from '../utils/frameProvider.js';
import { getFrameConfig } from '../config/frameConfigs.js';

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
  const [maxCaptures, setMaxCaptures] = useState(4); // Default to 4, will be updated from frame config
  const [frameConfig, setFrameConfig] = useState(null); // Frame configuration for crop guides
  const [showCropGuides, setShowCropGuides] = useState(true); // Toggle crop guides

  // Initialize with empty photos and load frame configuration
  useEffect(() => {
    console.log('🔄 TakeMoment component initializing...');
    
    // Clear any existing photos and start fresh
    setCapturedPhotos([]);
    localStorage.removeItem('capturedPhotos'); // Clear localStorage to ensure clean start
    
    // Load frame configuration
    frameProvider.loadFrameFromStorage();
    const frameConfig = frameProvider.getCurrentConfig();
    
    console.log('🖼️ frameProvider.getCurrentConfig():', frameConfig);
    
    if (frameConfig && frameConfig.maxCaptures) {
      setMaxCaptures(frameConfig.maxCaptures);
      setFrameConfig(frameConfig); // Store frame config for crop guides
      console.log(`📸 Frame loaded: ${frameConfig.name} - Max captures: ${frameConfig.maxCaptures}`);
    } else {
      // Load from localStorage as fallback
      const selectedFrame = localStorage.getItem('selectedFrame') || 'Testframe1';
      console.log('📦 selectedFrame from localStorage:', selectedFrame);
      
      const config = getFrameConfig(selectedFrame);
      console.log('⚙️ getFrameConfig result:', config);
      
      if (config) {
        setFrameConfig(config);
        setMaxCaptures(config.maxCaptures);
        console.log(`📸 Frame loaded from localStorage: ${config.name} - MaxCaptures: ${config.maxCaptures}`);
      } else {
        console.log('⚠️ No frame selected, using default max captures: 4');
        setMaxCaptures(4); // Default fallback
      }
    }
  }, []);

  // Debug: Log when capturedPhotos changes
  useEffect(() => {
    console.log('capturedPhotos state updated:', capturedPhotos.length, 'photos');
    console.log('Photos array:', capturedPhotos.map((photo, idx) => `${idx}: ${photo.substring(0, 30)}...`));
  }, [capturedPhotos]);

  // Function to calculate crop guide positions based on frame config
  const calculateCropGuides = () => {
    if (!frameConfig || !frameConfig.slots) return [];
    
    // Show only the current slot based on captured photos count
    const currentSlotIndex = capturedPhotos.length;
    
    // If all photos captured, don't show any guides
    if (currentSlotIndex >= frameConfig.slots.length) return [];
    
    const currentSlot = frameConfig.slots[currentSlotIndex];
    if (!currentSlot) return [];
    
    // Fixed aspect ratio 1.502 (width:height = 1.502:1)
    const GUIDE_ASPECT_RATIO = 1.502;
    
    // Use a base height percentage and calculate width to maintain 1.502 ratio
    const guideHeight = 40; // 40% of stream height
    const guideWidth = guideHeight * GUIDE_ASPECT_RATIO; // 40% * 1.502 = 60.08%
    
    // Center the guide in the stream (50% - half of guide size)
    const centerLeft = 50 - (guideWidth / 2);  // 50% - 14% = 36%
    const centerTop = 50 - (guideHeight / 2);  // 50% - 20% = 30%
    
    // Return centered slot guide with fixed 0.7 aspect ratio
    return [{
      left: `${centerLeft}%`,
      top: `${centerTop}%`, 
      width: `${guideWidth}%`,
      height: `${guideHeight}%`,
      id: currentSlot.id,
      aspectRatio: `${GUIDE_ASPECT_RATIO}:1`,
      isCurrent: true,
      // Debug info
      calculatedRatio: guideWidth / guideHeight,
      originalSlot: {
        width: currentSlot.width,
        height: currentSlot.height,
        left: currentSlot.left,
        top: currentSlot.top
      }
    }];
  };

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
    
    // Check if maximum captures reached
    if (capturedPhotos.length >= maxCaptures) {
      alert(`Maksimal ${maxCaptures} foto sudah tercapai untuk frame ini!`);
      return;
    }
    
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
    <>
      <style>{`
        @keyframes pulse {
          0% { 
            transform: scale(1);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.02);
            opacity: 1;
          }
          100% { 
            transform: scale(1);
            opacity: 0.8;
          }
        }
      `}</style>
      
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
                  
                  {/* Crop Guides Overlay */}
                  {showCropGuides && frameConfig && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: 'none',
                      zIndex: 5
                    }}>
                      {calculateCropGuides().map((guide, index) => (
                        <div
                          key={`crop-guide-${index}`}
                          style={{
                            position: 'absolute',
                            left: guide.left,
                            top: guide.top,
                            width: guide.width,
                            height: guide.height,
                            border: '3px solid #00ff00',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(0, 255, 0, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            color: '#00ff00',
                            fontWeight: 'bold',
                            textShadow: '0 0 6px rgba(0,0,0,0.9)',
                            animation: 'pulse 2s infinite'
                          }}
                        >
                          📸 {guide.id} ({guide.aspectRatio})
                        </div>
                      ))}
                      
                      {/* Guide info */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '10px 15px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: '2px solid #00ff00'
                      }}>
                        📸 <span style={{ color: '#00ff00' }}>
                          {capturedPhotos.length < maxCaptures 
                            ? `Siap ambil: ${frameConfig.slots[capturedPhotos.length]?.id || 'slot_1'}` 
                            : 'Semua foto selesai!'
                          }
                        </span>
                        <br/>
                        🖼️ Frame: {frameConfig.name} | Progress: {capturedPhotos.length}/{maxCaptures}
                        {capturedPhotos.length < maxCaptures && (
                          <div style={{ fontSize: '10px', color: '#ccc', marginTop: '4px' }}>
                            Guide: 60.1% × 40% (ratio 1.502:1)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Toggle Guides Button */}
                  <button
                    onClick={() => setShowCropGuides(!showCropGuides)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: showCropGuides ? 'rgba(0, 255, 0, 0.8)' : 'rgba(128, 128, 128, 0.8)',
                      color: 'white',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                  >
                    🎯 {showCropGuides ? 'Hide' : 'Show'} Guides
                  </button>
                  
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
                {/* Photo Count Display */}
                <div style={{
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: capturedPhotos.length >= maxCaptures ? '#dc3545' : '#333'
                }}>
                  Foto: {capturedPhotos.length}/{maxCaptures}
                  {capturedPhotos.length >= maxCaptures && ' - Maksimal tercapai!'}
                </div>
                
                <button
                  onClick={handleCapture}
                  disabled={capturing || capturedPhotos.length >= maxCaptures}
                  style={{
                    padding: '1rem 2rem',
                    background: (capturing || capturedPhotos.length >= maxCaptures) ? '#6c757d' : '#E8A889',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    cursor: (capturing || capturedPhotos.length >= maxCaptures) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    opacity: (capturing || capturedPhotos.length >= maxCaptures) ? 0.6 : 1
                  }}
                >
                  {capturedPhotos.length >= maxCaptures 
                    ? '📸 Maksimal foto tercapai'
                    : capturing 
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

            {/* Edit Button - Show when at least 1 photo captured */}
            {capturedPhotos.length > 0 && (
              <button
                onClick={() => {
                  console.log(`🎯 Edit button clicked - Photos: ${capturedPhotos.length}, MaxCaptures: ${maxCaptures}`);
                  console.log('📸 Photos array:', capturedPhotos);
                  
                  // Save photos to localStorage before navigating
                  localStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
                  console.log('💾 Photos saved to localStorage');
                  
                  // Also save current frame info
                  const currentFrame = frameProvider.getCurrentConfig();
                  if (currentFrame) {
                    localStorage.setItem('selectedFrame', currentFrame.id);
                    console.log(`🖼️ Frame saved: ${currentFrame.id}`);
                  }
                  
                  console.log('🚀 Navigating to /edit-photo');
                  navigate('/edit-photo');
                }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: capturedPhotos.length >= maxCaptures ? '#E8A889' : '#94A3B8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease',
                  marginTop: '1rem'
                }}
                onMouseEnter={(e) => {
                  if (capturedPhotos.length >= maxCaptures) {
                    e.target.style.background = '#d49673';
                  } else {
                    e.target.style.background = '#64748B';
                  }
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (capturedPhotos.length >= maxCaptures) {
                    e.target.style.background = '#E8A889';
                  } else {
                    e.target.style.background = '#94A3B8';
                  }
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                {capturedPhotos.length >= maxCaptures 
                  ? '✨ Edit Photos' 
                  : `📝 Edit Photos (${capturedPhotos.length}/${maxCaptures})`
                }
              </button>
            )}
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
    </>
  );
}
