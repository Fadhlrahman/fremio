import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import frameProvider from '../utils/frameProvider.js';
import { getFrameConfig } from '../config/frameConfigs.js';

// Utility function to compress image
const compressImage = (dataUrl, quality = 0.8, maxWidth = 600, maxHeight = 600) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions - maintain better quality
      let { width, height } = img;
      
      // Less aggressive sizing to preserve quality
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Better quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw and compress with better quality
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      console.log(`📷 Image compressed: ${(dataUrl.length / 1024).toFixed(1)}KB → ${(compressedDataUrl.length / 1024).toFixed(1)}KB`);
      resolve(compressedDataUrl);
    };
    
    img.src = dataUrl;
  });
};

// Utility function to calculate storage size
const calculateStorageSize = (data) => {
  const size = new Blob([JSON.stringify(data)]).size;
  return {
    bytes: size,
    kb: (size / 1024).toFixed(1),
    mb: (size / (1024 * 1024)).toFixed(2)
  };
};

// Utility function to clean up localStorage
const cleanUpStorage = () => {
  // Remove old/unnecessary items
  const keysToRemove = ['__test__', 'debug', 'temp'];
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Force garbage collection if available
  if (window.gc) {
    window.gc();
  }
  
  console.log('🧹 Storage cleaned up');
};

// Utility function to compress multiple photos
const compressPhotosArray = async (photos, quality = 0.6, maxWidth = 400, maxHeight = 400) => {
  const compressed = [];
  for (const photo of photos) {
    const compressedPhoto = await compressImage(photo, quality, maxWidth, maxHeight);
    compressed.push(compressedPhoto);
  }
  return compressed;
};

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
  const [frameConfig, setFrameConfig] = useState(null); // Frame configuration

  // Initialize with empty photos and load frame configuration
  useEffect(() => {
    console.log('🔄 TakeMoment component initializing...');
    
    // Clear any existing photos and start fresh
    setCapturedPhotos([]);
    localStorage.removeItem('capturedPhotos'); // Clear localStorage to ensure clean start
    
    // Load frame configuration asynchronously
    const loadFrameConfig = async () => {
      try {
        await frameProvider.loadFrameFromStorage();
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
          
          const config = await frameProvider.setFrame(selectedFrame);
          if (config) {
            const loadedConfig = frameProvider.getCurrentConfig();
            setFrameConfig(loadedConfig);
            setMaxCaptures(loadedConfig.maxCaptures);
            console.log(`📸 Frame loaded from localStorage: ${loadedConfig.name} - MaxCaptures: ${loadedConfig.maxCaptures}`);
          } else {
            console.log('⚠️ No frame selected, using default max captures: 4');
            setMaxCaptures(4); // Default fallback
          }
        }
      } catch (error) {
        console.error('❌ Error loading frame configuration:', error);
        setMaxCaptures(4); // Fallback
      }
    };
    
    loadFrameConfig();
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

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remaining = Math.max(0, maxCaptures - capturedPhotos.length);
    if (remaining <= 0) {
      alert(`Maksimal ${maxCaptures} foto sudah tercapai untuk frame ini!`);
      event.target.value = '';
      return;
    }

    if (files.length > remaining) {
      console.warn(`Selected ${files.length} files but only ${remaining} slots remaining. Only the first ${remaining} will be used.`);
    }

    const filesToProcess = files.slice(0, remaining);
    const currentFrameName = frameProvider.getCurrentFrameName();

    // Helper to process a single file into a compressed dataURL
    const processFile = (file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        // Frame-specific compression tuning
        let quality = 0.75;
        let maxW = 500;
        let maxH = 500;

        if (currentFrameName === 'Testframe4' || (currentFrameName && currentFrameName.includes('FremioSeries-4'))) {
          console.log('🎯 Using high quality compression for 4-slot frames');
          quality = 0.85; maxW = 700; maxH = 500;
        } else if (currentFrameName === 'Testframe2' || (currentFrameName && currentFrameName.includes('FremioSeries-3'))) {
          console.log('🎯 Using higher quality compression for 3-slot frames');
          quality = 0.9; maxW = 650; maxH = 650;
        } else if (currentFrameName && currentFrameName.includes('FremioSeries-2')) {
          console.log('🎯 Using higher quality compression for 2-slot frames');
          quality = 0.85; maxW = 650; maxH = 500;
        }

        const compressed = await compressImage(e.target.result, quality, maxW, maxH);
        resolve(compressed);
      };
      reader.readAsDataURL(file);
    });

    const compressedList = [];
    for (const file of filesToProcess) {
      const dataUrl = await processFile(file);
      compressedList.push(dataUrl);
    }

    const newPhotos = [...capturedPhotos, ...compressedList];
    setCapturedPhotos(newPhotos);
    try {
      localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
      console.log(`✅ ${compressedList.length} photo(s) added from files. Total: ${newPhotos.length}/${maxCaptures}`);
    } catch (quotaError) {
      console.error('❌ QuotaExceededError when saving selected files:', quotaError);
      alert('Storage limit exceeded! Please try selecting fewer photos or refresh the page.');
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

  const handleChoosePhoto = async () => {
    console.log('handleChoosePhoto called');
    console.log('Current photo:', currentPhoto ? currentPhoto.substring(0, 50) + '...' : 'null');
    console.log('Current capturedPhotos before update:', capturedPhotos);
    
    if (currentPhoto) {
      try {
        // Clean up storage first
        cleanUpStorage();
        
        // Get current frame for quality optimization
        const currentFrameName = frameProvider.getCurrentFrameName();
        
        // Compress the photo before saving - higher quality for frames with more/smaller slots
        console.log('📷 Compressing photo...');
        let compressedPhoto;
        
        if (currentFrameName === 'Testframe4') {
          // Higher quality for Testframe4 landscape photos
          console.log('🎯 Using high quality compression for Testframe4');
          compressedPhoto = await compressImage(currentPhoto, 0.85, 700, 500); // Higher quality and size
        } else if (currentFrameName === 'Testframe2') {
          // Higher quality for Testframe2 - 6 smaller slots need better resolution
          console.log('🎯 Using ULTRA high quality compression for Testframe2 (6 slots)');
          compressedPhoto = await compressImage(currentPhoto, 0.95, 800, 800); // Ultra high quality for photobooth strips
        } else {
          // Standard quality for other frames
          compressedPhoto = await compressImage(currentPhoto, 0.75, 500, 500);
        }
        
        const newPhotos = [...capturedPhotos, compressedPhoto];
        console.log('New photos array:', newPhotos.length, 'photos');
        
        // Calculate storage size
        const storageSize = calculateStorageSize(newPhotos);
        console.log(`💾 Storage size: ${storageSize.kb}KB (${storageSize.mb}MB)`);
        
        // Check if we're getting close to localStorage limit
        if (parseFloat(storageSize.mb) > 3) {
          console.warn('⚠️ Storage size is getting large, applying moderate compression');
          // Apply moderate compression with frame-specific settings
          let moderateCompressed;
          
          if (currentFrameName === 'Testframe4') {
            // Less aggressive compression for Testframe4 to maintain quality
            console.log('🎯 Applying gentle compression for Testframe4');
            moderateCompressed = await compressImage(currentPhoto, 0.75, 600, 450); // Still high quality
          } else {
            moderateCompressed = await compressImage(currentPhoto, 0.6, 400, 400);
          }
          
          newPhotos[newPhotos.length - 1] = moderateCompressed;
          
          const newSize = calculateStorageSize(newPhotos);
          console.log(`💾 Moderate-compressed size: ${newSize.kb}KB (${newSize.mb}MB)`);
        }
        
        setCapturedPhotos(newPhotos);
        
        // Save with error handling
        try {
          localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
          console.log('✅ Photos saved to localStorage successfully');
        } catch (quotaError) {
          console.error('❌ QuotaExceededError caught:', quotaError);
          alert('Storage limit exceeded! Please try taking fewer photos or refresh the page.');
          return;
        }
        
        setCurrentPhoto(null);
        setShowConfirmation(false);
        
        // Auto-close kamera HANYA jika sudah mencapai maksimal foto
        if (newPhotos.length >= maxCaptures) {
          stopCamera();
          console.log(`📸 Camera auto-closed: reached maximum photos (${maxCaptures})`);
        }
        
        console.log('Photo added successfully');
      } catch (error) {
        console.error('❌ Error compressing photo:', error);
        // Fallback to original photo if compression fails
        const newPhotos = [...capturedPhotos, currentPhoto];
        setCapturedPhotos(newPhotos);
        try {
          localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
        } catch (quotaError) {
          console.error('❌ QuotaExceededError on fallback:', quotaError);
          alert('Storage limit exceeded! Please refresh the page and try again.');
          return;
        }
        setCurrentPhoto(null);
        setShowConfirmation(false);
        
        // Auto-close kamera HANYA jika sudah mencapai maksimal foto
        const finalPhotos = [...capturedPhotos, currentPhoto];
        if (finalPhotos.length >= maxCaptures) {
          stopCamera();
          console.log(`📸 Camera auto-closed: reached maximum photos (${maxCaptures})`);
        }
      }
    } else {
      console.log('No currentPhoto available');
    }
  };

  const handleRetakePhoto = () => {
    setCurrentPhoto(null);
    setShowConfirmation(false);
  };

  const handleDeletePhoto = (indexToDelete) => {
    const newPhotos = capturedPhotos.filter((_, index) => index !== indexToDelete);
    setCapturedPhotos(newPhotos);
    
    // Update localStorage
    try {
      localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
      console.log(`✅ Photo ${indexToDelete + 1} deleted successfully`);
    } catch (error) {
      console.error('❌ Error updating localStorage after delete:', error);
    }
  };

  const handleEdit = async () => {
    // Validasi foto harus maksimal sebelum bisa edit
    if (capturedPhotos.length < maxCaptures) {
      alert(`Anda perlu mengambil ${maxCaptures} foto untuk frame ini. Saat ini baru ${capturedPhotos.length} foto.`);
      return;
    }
    
    console.log(`🎯 Edit button clicked - Photos: ${capturedPhotos.length}, MaxCaptures: ${maxCaptures}`);
    console.log('📸 Photos array:', capturedPhotos);
    
    // Debug frame information
    const currentFrameConfig = frameProvider.getCurrentConfig();
    const currentFrameName = frameProvider.getCurrentFrameName();
    console.log('🖼️ Current frame name:', currentFrameName);
    console.log('🖼️ Current frame config:', currentFrameConfig);
    
    // Save photos to localStorage before navigating
    try {
      // Clean up storage first
      cleanUpStorage();
      
      const storageSize = calculateStorageSize(capturedPhotos);
      console.log(`💾 About to save ${storageSize.kb}KB to localStorage`);
      
      // Normal save
      localStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
      console.log('✅ Photos saved successfully');
    } catch (quotaError) {
      console.error('❌ QuotaExceededError:', quotaError);
      alert('Storage limit exceeded! Please refresh the page and try again.');
      return; // Don't navigate if we can't save
    }
    
    // Also save current frame info
    const currentFrame = frameProvider.getCurrentConfig();
    if (currentFrame) {
      try {
        localStorage.setItem('selectedFrame', currentFrame.id);
        localStorage.setItem('frameConfig', JSON.stringify(currentFrame));
        console.log(`🖼️ Frame saved: ${currentFrame.id}`);
      } catch (quotaError) {
        console.error('❌ QuotaExceededError when saving frame config:', quotaError);
        alert('Warning: Could not save frame configuration due to storage limits.');
      }
    } else {
      console.error('❌ No current frame found!');
    }
    
    // Stop camera sebelum navigate ke editor
    stopCamera();
    console.log('📸 Camera stopped: navigating to editor');
    console.log('🚀 Navigating to /edit-photo');
    navigate('/edit-photo');
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
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => {
                  if (capturedPhotos.length >= maxCaptures) return;
                  fileInputRef.current?.click();
                }}
                disabled={capturedPhotos.length >= maxCaptures}
                title={capturedPhotos.length >= maxCaptures ? 'Maksimal foto sudah tercapai' : 'Pilih beberapa file sekaligus'}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: capturedPhotos.length >= maxCaptures ? '#f1f1f1' : '#fff',
                  color: capturedPhotos.length >= maxCaptures ? '#999' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: capturedPhotos.length >= maxCaptures ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {capturedPhotos.length >= maxCaptures
                  ? 'Max photos reached'
                  : `Choose file (${maxCaptures - capturedPhotos.length} left)`}
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
                        position: 'relative',
                        aspectRatio: videoAspectRatio.toString(),
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
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
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Hapus foto ${idx + 1}?`)) {
                            handleDeletePhoto(idx);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: 'none',
                          background: 'rgba(255, 59, 48, 0.9)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(255, 59, 48, 1)';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 59, 48, 0.9)';
                          e.target.style.transform = 'scale(1)';
                        }}
                        title={`Hapus foto ${idx + 1}`}
                      >
                        ×
                      </button>
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
                onClick={async () => {
                  console.log(`🎯 Edit button clicked - Photos: ${capturedPhotos.length}, MaxCaptures: ${maxCaptures}`);
                  console.log('📸 Photos array:', capturedPhotos);
                  
                  // Debug frame information
                  const currentFrameConfig = frameProvider.getCurrentConfig();
                  const currentFrameName = frameProvider.getCurrentFrameName();
                  console.log('🖼️ Current frame name:', currentFrameName);
                  console.log('🖼️ Current frame config:', currentFrameConfig);
                  
                  // Check if this is Testframe3 or Testframe4 specifically
                  if (currentFrameName === 'Testframe3' || currentFrameName === 'Testframe4') {
                    console.log(`🔍 ${currentFrameName.toUpperCase()} DETECTED - Special debugging:`);
                    console.log('  - Frame ID:', currentFrameConfig?.id);
                    console.log('  - Max Captures:', currentFrameConfig?.maxCaptures);
                    console.log('  - Slots count:', currentFrameConfig?.slots?.length);
                    console.log('  - Photos count:', capturedPhotos.length);
                  }
                  
                  // Save photos to localStorage before navigating
                  try {
                    // Clean up storage first
                    cleanUpStorage();
                    
                    const storageSize = calculateStorageSize(capturedPhotos);
                    console.log(`💾 About to save ${storageSize.kb}KB to localStorage`);
                    
                    // If still too large, apply emergency compression
                    if (parseFloat(storageSize.mb) > 4) {
                      console.log('🚨 Emergency compression needed');
                      
                      // Frame-specific emergency compression
                      const currentFrameName = frameProvider.getCurrentFrameName();
                      let emergencyCompressed;
                      
                      if (currentFrameName === 'Testframe4') {
                        // More gentle emergency compression for Testframe4
                        console.log('🎯 Gentle emergency compression for Testframe4');
                        emergencyCompressed = await compressPhotosArray(capturedPhotos, 0.7, 500, 400);
                      } else {
                        emergencyCompressed = await compressPhotosArray(capturedPhotos, 0.6, 400, 400);
                      }
                      
                      const newSize = calculateStorageSize(emergencyCompressed);
                      console.log(`💾 Emergency compressed size: ${newSize.kb}KB`);
                      
                      localStorage.setItem('capturedPhotos', JSON.stringify(emergencyCompressed));
                    } else {
                      localStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
                    }
                    
                    console.log('💾 Photos saved to localStorage');
                  } catch (quotaError) {
                    console.error('❌ QuotaExceededError when saving photos:', quotaError);
                    
                    // Last resort: try to save with reasonable compression
                    try {
                      console.log('🔥 Last resort: strong compression');
                      
                      const currentFrameName = frameProvider.getCurrentFrameName();
                      let strongCompressed;
                      
                      if (currentFrameName === 'Testframe4') {
                        // Even in last resort, try to preserve Testframe4 quality
                        console.log('🎯 Last resort gentle compression for Testframe4');
                        strongCompressed = await compressPhotosArray(capturedPhotos, 0.5, 400, 350);
                      } else {
                        strongCompressed = await compressPhotosArray(capturedPhotos, 0.4, 300, 300);
                      }
                      
                      localStorage.setItem('capturedPhotos', JSON.stringify(strongCompressed));
                      console.log('✅ Saved with strong compression');
                    } catch (finalError) {
                      alert('Storage limit exceeded! Please refresh the page and try again.');
                      return; // Don't navigate if we can't save
                    }
                  }
                  
                  // Also save current frame info with extra verification for Testframe3
                  const currentFrame = frameProvider.getCurrentConfig();
                  if (currentFrame) {
                    try {
                      localStorage.setItem('selectedFrame', currentFrame.id);
                      localStorage.setItem('frameConfig', JSON.stringify(currentFrame));
                      console.log(`🖼️ Frame saved: ${currentFrame.id}`);
                      
                      if (currentFrame.id === 'Testframe3' || currentFrame.id === 'Testframe4') {
                        console.log(`✅ ${currentFrame.id.toUpperCase()} data saved to localStorage`);
                        console.log('   - selectedFrame:', localStorage.getItem('selectedFrame'));
                        console.log('   - frameConfig:', localStorage.getItem('frameConfig'));
                      }
                    } catch (quotaError) {
                      console.error('❌ QuotaExceededError when saving frame config:', quotaError);
                      // Frame config is smaller, so this is less likely, but still handle it
                      alert('Warning: Could not save frame configuration due to storage limits.');
                    }
                  } else {
                    console.error('❌ No current frame found!');
                  }
                  
                  console.log('🚀 Calling handleEdit');
                  handleEdit();
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
                  cursor: capturedPhotos.length >= maxCaptures ? 'pointer' : 'not-allowed',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease',
                  marginTop: '1rem',
                  opacity: capturedPhotos.length >= maxCaptures ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (capturedPhotos.length >= maxCaptures) {
                    e.target.style.background = '#d49673';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (capturedPhotos.length >= maxCaptures) {
                    e.target.style.background = '#E8A889';
                    e.target.style.transform = 'translateY(0)';
                  }
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
      
      {/* Debug Panel for Storage Management */}
      {capturedPhotos.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: frameConfig?.id === 'Testframe4' ? '#28a745' : '#ff6b6b',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          maxWidth: '200px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            💾 {frameConfig?.id?.toUpperCase()} Debug
          </div>
          <div>Photos: {capturedPhotos.length}/{maxCaptures}</div>
          <div>Aspect: {frameConfig?.slots?.[0]?.aspectRatio || 'N/A'}</div>
          <div>Size: {(() => {
            const size = calculateStorageSize(capturedPhotos);
            return `${size.kb}KB`;
          })()}</div>
          <button
            onClick={() => {
              const size = calculateStorageSize(capturedPhotos);
              
              console.log('💾 Storage Analysis:');
              console.log(`  - Frame: ${frameConfig?.id}`);
              console.log(`  - Photos count: ${capturedPhotos.length}`);
              console.log(`  - Total size: ${size.kb}KB (${size.mb}MB)`);
              console.log(`  - Slot aspect ratio: ${frameConfig?.slots?.[0]?.aspectRatio}`);
              
              // Test localStorage space
              try {
                const testData = 'x'.repeat(1024 * 1024); // 1MB test
                localStorage.setItem('__test__', testData);
                localStorage.removeItem('__test__');
                console.log('✅ localStorage has space available');
              } catch (e) {
                console.log('❌ localStorage is nearly full');
              }
            }}
            style={{
              background: 'white',
              color: frameConfig?.id === 'Testframe4' ? '#28a745' : '#ff6b6b',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              marginTop: '8px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Check Info
          </button>
          <button
            onClick={() => {
              // Force save original photos (risky but better quality)
              try {
                // Clear storage first
                cleanUpStorage();
                
                // Try to save original photos
                localStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
                console.log('✅ Original photos saved (high quality)');
                alert('Original high-quality photos saved! Note: this uses more storage.');
              } catch (error) {
                console.error('❌ Cannot save original photos:', error);
                alert('Cannot save original photos due to storage limits. Using compressed version.');
              }
            }}
            style={{
              background: 'green',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              marginTop: '4px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Save Original Quality
          </button>
          {frameConfig?.id === 'Testframe4' && (
            <button
              onClick={async () => {
                // Special high-quality compression for Testframe4
                try {
                  cleanUpStorage();
                  console.log('🎯 Applying Testframe4 premium compression');
                  
                  const premiumCompressed = [];
                  for (const photo of capturedPhotos) {
                    const compressed = await compressImage(photo, 0.9, 800, 600); // Very high quality
                    premiumCompressed.push(compressed);
                  }
                  
                  localStorage.setItem('capturedPhotos', JSON.stringify(premiumCompressed));
                  const size = calculateStorageSize(premiumCompressed);
                  console.log(`✅ Testframe4 premium quality saved (${size.kb}KB)`);
                  alert(`Testframe4 premium quality saved! Size: ${size.kb}KB`);
                } catch (error) {
                  console.error('❌ Cannot save premium quality:', error);
                  alert('Cannot save premium quality. Using standard compression.');
                }
              }}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                marginTop: '4px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Save Premium Quality (T4)
            </button>
          )}
          {frameConfig?.id === 'Testframe2' && (
            <button
              onClick={async () => {
                // Special high-quality compression for Testframe2 photobooth strips
                try {
                  cleanUpStorage();
                  console.log('🎯 Applying Testframe2 premium compression (6 slots)');
                  
                  const premiumCompressed = [];
                  for (const photo of capturedPhotos) {
                    const compressed = await compressImage(photo, 0.98, 900, 900); // ULTRA high quality for photobooth
                    premiumCompressed.push(compressed);
                  }
                  
                  localStorage.setItem('capturedPhotos', JSON.stringify(premiumCompressed));
                  const size = calculateStorageSize(premiumCompressed);
                  console.log(`✅ Testframe2 premium quality saved (${size.kb}KB)`);
                  alert(`Testframe2 premium quality saved! Size: ${size.kb}KB`);
                } catch (error) {
                  console.error('❌ Cannot save premium quality:', error);
                  alert('Cannot save premium quality. Using standard compression.');
                }
              }}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                marginTop: '4px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Save Premium Quality (T2)
            </button>
          )}
          <button
            onClick={() => {
              // Enhanced storage clearing
              localStorage.clear(); // Clear everything
              sessionStorage.clear(); // Clear session too
              setCapturedPhotos([]);
              console.log('🧹 ALL storage completely cleared (localStorage + sessionStorage)');
              alert('Complete storage wipe! All data cleared. You can now take fresh high-quality photos.');
              window.location.reload(); // Force refresh
            }}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              marginTop: '4px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Complete Storage Wipe
          </button>
        </div>
      )}
    </div>
    </>
  );
}
