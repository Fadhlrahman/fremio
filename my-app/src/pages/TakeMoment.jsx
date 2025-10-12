import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import frameProvider from '../utils/frameProvider.js';
import { getFrameConfig } from '../config/frameConfigs.js';

const TIMER_OPTIONS = [3, 5, 10];
const TIMER_VIDEO_DURATION_MAP = {
  3: { record: 4, playback: 4 },
  5: { record: 6, playback: 6 },
  10: { record: 6, playback: 6 },
};
const POST_CAPTURE_BUFFER_SECONDS = 1;

// Utility function to compress image ..
const compressImage = (dataUrl, quality = 0.8, maxWidth = 600, maxHeight = 600) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions - maintain better quality..
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

const blobToDataURL = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
  reader.readAsDataURL(blob);
});

const normalizeFacingMode = (value, fallback) => {
  if (!value) return fallback;
  const lower = value.toLowerCase();
  if (lower.includes('environment') || lower.includes('rear')) return 'environment';
  if (lower.includes('user') || lower.includes('front')) return 'user';
  return fallback;
};

export default function TakeMoment() {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const videoRef = useRef();
  const cameraStreamRef = useRef(null);
  const activeRecordingRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturedVideos, setCapturedVideos] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timer, setTimer] = useState(TIMER_OPTIONS[0]); // Default 3 seconds
  const [currentPhoto, setCurrentPhoto] = useState(null); // For captured photo
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false); // Show confirmation modal
  const [videoAspectRatio, setVideoAspectRatio] = useState(4/3); // Default aspect ratio
  const [maxCaptures, setMaxCaptures] = useState(4); // Default to 4, will be updated from frame config
  const [frameConfig, setFrameConfig] = useState(null); // Frame configuration
  const [cameraFacingMode, setCameraFacingMode] = useState('user');
  const [shouldMirrorVideo, setShouldMirrorVideo] = useState(true);
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const showSwitchCameraToggle = isMobileDevice && cameraActive && (canSwitchCamera || cameraFacingMode === 'environment');
  const isUsingBackCamera = cameraFacingMode === 'environment';
  const isSwitchDisabled = !cameraActive || capturing || isSwitchingCamera;

  const updateVideoDeviceAvailability = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === 'videoinput');
      setCanSwitchCamera(videoInputs.length > 1);
    } catch (error) {
      console.warn('⚠️ Failed to enumerate media devices:', error);
    }
  }, []);

  const startCamera = async (desiredFacingMode = cameraFacingMode) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      alert('Browser tidak mendukung akses kamera.');
      return;
    }

    const requestStream = async (facingMode) => navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: facingMode ? { ideal: facingMode } : undefined,
      }
    });

    let stream = null;
    let activeFacing = desiredFacingMode;

    try {
      stopCamera();
      stream = await requestStream(desiredFacingMode);
    } catch (error) {
      console.warn(`⚠️ Failed to access ${desiredFacingMode} camera:`, error);
      if (desiredFacingMode === 'environment') {
        try {
          stream = await requestStream('user');
          activeFacing = 'user';
          alert('Kamera belakang tidak tersedia. Menggunakan kamera depan.');
        } catch (fallbackError) {
          console.error('❌ Fallback to front camera failed:', fallbackError);
          alert('Tidak dapat mengakses kamera.');
          throw fallbackError;
        }
      } else {
        alert('Tidak dapat mengakses kamera.');
        throw error;
      }
    }

    if (!stream) {
      alert('Stream kamera tidak tersedia.');
      return;
    }

    cameraStreamRef.current = stream;

    const videoTrack = stream.getVideoTracks()[0];
    const trackFacing = videoTrack?.getSettings?.().facingMode;
    const normalizedFacing = normalizeFacingMode(trackFacing, activeFacing);

    setCameraFacingMode(normalizedFacing);
    setShouldMirrorVideo(normalizedFacing !== 'environment');
    setCameraActive(true);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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

    await updateVideoDeviceAvailability();
  };

  const handleCameraClick = async () => {
    if (cameraActive || isSwitchingCamera) return;
    try {
      await startCamera(cameraFacingMode);
    } catch (error) {
      console.error('❌ Failed to start camera:', error);
    }
  };

  const handleSwitchCamera = async () => {
    if (!cameraActive || isSwitchingCamera) return;
    const nextFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setIsSwitchingCamera(true);
    try {
      await startCamera(nextFacingMode);
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  useEffect(() => {
    console.log('🔄 TakeMoment component initializing...');

    setCapturedPhotos([]);
    setCapturedVideos([]);
    localStorage.removeItem('capturedPhotos');
    localStorage.removeItem('capturedVideos');
    try {
      const keysToClear = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && (key.startsWith('slotPhotos:') || key.startsWith('slotVideos:'))) {
          keysToClear.push(key);
        }
      }
      keysToClear.forEach((key) => localStorage.removeItem(key));
    } catch (storageError) {
      console.warn('⚠️ Failed to clear slot media caches on init:', storageError);
    }

    const loadFrameConfig = async () => {
      try {
        await frameProvider.loadFrameFromStorage();
        const frameConfig = frameProvider.getCurrentConfig();

        console.log('🖼️ frameProvider.getCurrentConfig():', frameConfig);

        if (frameConfig && frameConfig.maxCaptures) {
          setMaxCaptures(frameConfig.maxCaptures);
          setFrameConfig(frameConfig);
          console.log(`📸 Frame loaded: ${frameConfig.name} - Max captures: ${frameConfig.maxCaptures}`);
        } else {
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
            setMaxCaptures(4);
          }
        }
      } catch (error) {
        console.error('❌ Error loading frame configuration:', error);
        setMaxCaptures(4);
      }
    };

    loadFrameConfig();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobileDevice = () => {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      const isTouchDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
      setIsMobileDevice(isTouchDevice || window.innerWidth <= 768);
    };

    checkMobileDevice();
    window.addEventListener('resize', checkMobileDevice);
    return () => window.removeEventListener('resize', checkMobileDevice);
  }, []);

  useEffect(() => {
    updateVideoDeviceAvailability();
  }, [updateVideoDeviceAvailability]);

  useEffect(() => {
    if (isMobileDevice && !cameraActive && cameraFacingMode === 'user') {
      setCameraFacingMode('environment');
    }
  }, [isMobileDevice, cameraActive, cameraFacingMode]);

  // Debug: Log when capturedPhotos changes
  useEffect(() => {
    console.log('capturedPhotos state updated:', capturedPhotos.length, 'photos');
    console.log('Photos array:', capturedPhotos.map((photo, idx) => `${idx}: ${photo.substring(0, 30)}...`));
  }, [capturedPhotos]);

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
    const newVideos = [...capturedVideos, ...Array(compressedList.length).fill(null)];
    setCapturedPhotos(newPhotos);
    setCapturedVideos(newVideos);
    try {
      localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
      localStorage.setItem('capturedVideos', JSON.stringify(newVideos));
      console.log(`✅ ${compressedList.length} photo(s) added from files. Total: ${newPhotos.length}/${maxCaptures}`);
    } catch (quotaError) {
      console.error('❌ QuotaExceededError when saving selected files:', quotaError);
      alert('Storage limit exceeded! Please try selecting fewer photos or refresh the page.');
    }

    event.target.value = '';
  };

  const determineVideoBitrate = (seconds) => {
    if (seconds >= 15) return 320_000;
    if (seconds >= 10) return 280_000;
    if (seconds >= 6) return 240_000;
    return 200_000;
  };

  const startVideoRecording = (timerSeconds) => {
    const baseStream = cameraStreamRef.current || (videoRef.current ? videoRef.current.srcObject : null);
    if (!baseStream) {
      console.warn('⚠️ No camera stream available for video recording');
      return null;
    }

    const { record: recordSeconds } = TIMER_VIDEO_DURATION_MAP[timerSeconds] || {
      record: timerSeconds + 1,
    };

    const desiredStopSeconds = timerSeconds + POST_CAPTURE_BUFFER_SECONDS;
    const delayBeforeStartSeconds = Math.max(0, desiredStopSeconds - recordSeconds);

    const rawRecordingStream = baseStream.clone();

    let recordingStream = rawRecordingStream;
    let mirrorApplied = false;
    let mirrorCleanup = () => {
      rawRecordingStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (stopError) {
          console.warn('⚠️ Failed to stop raw recording track:', stopError);
        }
      });
    };

  if (shouldMirrorVideo && videoRef.current) {
      try {
        const mirrorCanvas = document.createElement('canvas');
        const canCaptureStream = typeof mirrorCanvas.captureStream === 'function';
        const mirrorCtx = mirrorCanvas.getContext('2d');

        if (canCaptureStream && mirrorCtx) {
          const sourceVideo = videoRef.current;
          const videoTrack = rawRecordingStream.getVideoTracks()[0];
          const trackSettings = videoTrack?.getSettings ? videoTrack.getSettings() : {};

          const resolveDimensions = () => {
            const width = sourceVideo.videoWidth || trackSettings?.width || 640;
            const height = sourceVideo.videoHeight || trackSettings?.height || 480;

            if (mirrorCanvas.width !== width || mirrorCanvas.height !== height) {
              mirrorCanvas.width = width;
              mirrorCanvas.height = height;
            }
          };

          let animationFrameId = null;

          const renderMirroredFrame = () => {
            resolveDimensions();
            if (sourceVideo.readyState >= 2) {
              mirrorCtx.save();
              mirrorCtx.setTransform(-1, 0, 0, 1, mirrorCanvas.width, 0);
              mirrorCtx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
              mirrorCtx.drawImage(sourceVideo, 0, 0, mirrorCanvas.width, mirrorCanvas.height);
              mirrorCtx.restore();
            }
            animationFrameId = requestAnimationFrame(renderMirroredFrame);
          };

          renderMirroredFrame();

          const canvasStream = mirrorCanvas.captureStream(30);
          rawRecordingStream.getAudioTracks().forEach((track) => {
            try {
              canvasStream.addTrack(track);
            } catch (addError) {
              console.warn('⚠️ Failed to attach audio track to mirrored canvas stream:', addError);
            }
          });

          recordingStream = canvasStream;
          mirrorApplied = true;

          mirrorCleanup = () => {
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }
            canvasStream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch (stopError) {
                console.warn('⚠️ Failed to stop mirrored canvas track:', stopError);
              }
            });
            rawRecordingStream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch (stopError) {
                console.warn('⚠️ Failed to stop raw recording track during cleanup:', stopError);
              }
            });
          };
        }
      } catch (mirrorError) {
        console.warn('⚠️ Mirrored recording initialization failed, falling back to raw stream:', mirrorError);
      }
    }

    const stopRecordingStream = () => {
      if (mirrorCleanup) {
        mirrorCleanup();
        mirrorCleanup = null;
      }
    };

    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264',
    ];

    const supportedMimeType = mimeCandidates.find((candidate) => {
      try {
        return candidate && MediaRecorder.isTypeSupported(candidate);
      } catch (error) {
        return false;
      }
    }) || '';

  const tunedBitrate = determineVideoBitrate(recordSeconds);
  const hasAudioTrack = recordingStream.getAudioTracks().length > 0;

    let recorder;
    try {
      const tunedOptions = supportedMimeType
        ? { mimeType: supportedMimeType, videoBitsPerSecond: tunedBitrate, ...(hasAudioTrack ? { audioBitsPerSecond: 64_000 } : {}) }
        : { videoBitsPerSecond: tunedBitrate, ...(hasAudioTrack ? { audioBitsPerSecond: 64_000 } : {}) };
      recorder = new MediaRecorder(recordingStream, tunedOptions);
    } catch (error) {
      console.warn('⚠️ Failed to create tuned MediaRecorder; falling back to default options.', error);
      try {
        recorder = supportedMimeType
          ? new MediaRecorder(recordingStream, { mimeType: supportedMimeType })
          : new MediaRecorder(recordingStream);
      } catch (fallbackError) {
        console.error('❌ Failed to create MediaRecorder:', fallbackError);
        stopRecordingStream();
        return null;
      }
    }

    const chunks = [];
    let stopTimeout;
    let startTimeout;
    let hasRecordingStarted = false;
    let hasRecordingStopped = false;

    const controller = {
      stop: () => {
        if (stopTimeout) {
          clearTimeout(stopTimeout);
          stopTimeout = null;
        }
        if (startTimeout) {
          clearTimeout(startTimeout);
          startTimeout = null;
        }

        if (!hasRecordingStarted) {
          hasRecordingStopped = true;
          stopRecordingStream();
          if (rejectPromise) {
            rejectPromise(new Error('Recording cancelled before start'));
          }
          return;
        }

        hasRecordingStopped = true;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch (error) {
            console.warn('⚠️ Error stopping recorder:', error);
          }
        }
      },
      promise: null,
    };

    let rejectPromise;
    controller.promise = new Promise((resolve, reject) => {
      rejectPromise = reject;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error || event);
        controller.stop();
        stopRecordingStream();
        reject(event.error || new Error('MediaRecorder error'));
      };

      recorder.onstop = async () => {
        hasRecordingStopped = true;
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || supportedMimeType || 'video/webm' });
          const dataUrl = await blobToDataURL(blob);
          resolve({
            dataUrl,
            mimeType: blob.type || recorder.mimeType || supportedMimeType || 'video/webm',
            duration: recordSeconds,
            timer: timerSeconds,
            actualDelay: delayBeforeStartSeconds,
            mirrored: mirrorApplied,
          });
        } catch (error) {
          reject(error);
        } finally {
          stopRecordingStream();
        }
      };
    });

    const startRecording = () => {
      if (hasRecordingStarted || hasRecordingStopped) {
        return;
      }
      hasRecordingStarted = true;
      try {
        recorder.start();
        stopTimeout = setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, recordSeconds * 1000);
      } catch (error) {
        console.error('❌ Failed to start MediaRecorder:', error);
        stopRecordingStream();
        hasRecordingStopped = true;
        if (rejectPromise) {
          rejectPromise(error);
        }
      }
    };

    if (delayBeforeStartSeconds > 0) {
      startTimeout = setTimeout(startRecording, delayBeforeStartSeconds * 1000);
    } else {
      startRecording();
    }

    controller.promise.finally(() => {
      if (activeRecordingRef.current === controller) {
        activeRecordingRef.current = null;
      }
    });

    activeRecordingRef.current = controller;
    return controller;
  };

  const handleCapture = () => {
    if (!videoRef.current || capturing) return;

    if (!cameraActive) {
      alert('Aktifkan kamera terlebih dahulu sebelum mengambil foto.');
      return;
    }
    
    // Check if maximum captures reached
    if (capturedPhotos.length >= maxCaptures) {
      alert(`Maksimal ${maxCaptures} foto sudah tercapai untuk frame ini!`);
      return;
    }
    
    const effectiveTimer = TIMER_OPTIONS.includes(timer) ? timer : TIMER_OPTIONS[0];
    if (effectiveTimer !== timer) {
      setTimer(effectiveTimer);
    }

    if (activeRecordingRef.current) {
      console.warn('⚠️ A recording is already in progress');
      return;
    }

    setCapturing(true);
    setIsVideoProcessing(true);
    setCurrentVideo(null);
    
    const recordingController = startVideoRecording(effectiveTimer);
    if (recordingController) {
      recordingController.promise
        .then((videoData) => {
          console.log('🎬 Video recording completed', videoData);
          setCurrentVideo(videoData);
        })
        .catch((error) => {
          console.error('❌ Failed to record video:', error);
          alert('Perekaman video gagal. Silakan coba lagi.');
        })
        .finally(() => {
          setIsVideoProcessing(false);
        });
    } else {
      setIsVideoProcessing(false);
    }
    
    // Start countdown for the selected timer
    setCountdown(effectiveTimer);
    
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
  if (shouldMirrorVideo) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }
    
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
        let storedVideo = currentVideo || null;
        const newVideos = [...capturedVideos, storedVideo];
        console.log('New photos array:', newPhotos.length, 'photos');
        
        // Calculate storage size including videos
        const storageSize = calculateStorageSize({ photos: newPhotos, videos: newVideos });
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
          
          const newSize = calculateStorageSize({ photos: newPhotos, videos: newVideos });
          console.log(`💾 Moderate-compressed size: ${newSize.kb}KB (${newSize.mb}MB)`);
        }

        // Emergency compression if we're still near the storage limit
        const postModerateSize = calculateStorageSize({ photos: newPhotos, videos: newVideos });
        if (parseFloat(postModerateSize.mb) > 4.3) {
          console.warn('⚠️ Applying emergency compression to avoid storage overflow');
          const emergencyCompressed = await compressImage(newPhotos[newPhotos.length - 1], 0.5, 360, 360);
          newPhotos[newPhotos.length - 1] = emergencyCompressed;
        }

        const finalSizeCheck = calculateStorageSize({ photos: newPhotos, videos: newVideos });
        if (parseFloat(finalSizeCheck.mb) > 4.6) {
          console.warn('⚠️ Storage still high after compression; discarding associated video to protect captures.');
          storedVideo = null;
          newVideos[newVideos.length - 1] = null;
          alert('Penyimpanan hampir penuh. Video countdown terakhir tidak akan disimpan, tapi foto tetap aman.');
        }
        
        setCapturedPhotos(newPhotos);
        setCapturedVideos(newVideos);
        
        // Save with error handling
        try {
          localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
          localStorage.setItem('capturedVideos', JSON.stringify(newVideos));
          console.log('✅ Photos saved to localStorage successfully');
        } catch (quotaError) {
          console.error('❌ QuotaExceededError caught:', quotaError);
          alert('Storage limit exceeded! Please try taking fewer photos or refresh the page.');
          return;
        }
        
  setCurrentPhoto(null);
  setCurrentVideo(null);
    setShowConfirmation(false);
    setIsVideoProcessing(false);
        
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
        const newVideos = [...capturedVideos, currentVideo || null];
        setCapturedPhotos(newPhotos);
        setCapturedVideos(newVideos);
        try {
          localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
          localStorage.setItem('capturedVideos', JSON.stringify(newVideos));
        } catch (quotaError) {
          console.error('❌ QuotaExceededError on fallback:', quotaError);
          alert('Storage limit exceeded! Please refresh the page and try again.');
          return;
        }
        setCurrentPhoto(null);
    setCurrentVideo(null);
    setShowConfirmation(false);
    setIsVideoProcessing(false);
        
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
    setCurrentVideo(null);
    setIsVideoProcessing(false);
    setShowConfirmation(false);
  };

  const handleDeletePhoto = (indexToDelete) => {
    const newPhotos = capturedPhotos.filter((_, index) => index !== indexToDelete);
    const newVideos = capturedVideos.filter((_, index) => index !== indexToDelete);
    setCapturedPhotos(newPhotos);
    setCapturedVideos(newVideos);
    
    // Update localStorage
    try {
      localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
      localStorage.setItem('capturedVideos', JSON.stringify(newVideos));
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

      // Ensure videos array matches photos length
      const normalizedVideos = [...capturedVideos];
      while (normalizedVideos.length < capturedPhotos.length) {
        normalizedVideos.push(null);
      }
      localStorage.setItem('capturedVideos', JSON.stringify(normalizedVideos));
      
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
    if (activeRecordingRef.current) {
      try {
        activeRecordingRef.current.stop?.();
      } catch (error) {
        console.warn('⚠️ Error stopping active recording:', error);
      }
      activeRecordingRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
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
              alignItems: 'center',
              flexWrap: 'wrap'
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

              {showSwitchCameraToggle && (
                <button
                  onClick={handleSwitchCamera}
                  disabled={isSwitchDisabled}
                  title={isSwitchingCamera
                    ? 'Sedang mengganti kamera'
                    : isUsingBackCamera
                      ? 'Beralih ke kamera depan'
                      : 'Beralih ke kamera belakang'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: isSwitchDisabled ? '#f1f1f1' : (isUsingBackCamera ? '#E8A889' : '#fff'),
                    color: isSwitchDisabled ? '#999' : (isUsingBackCamera ? '#fff' : '#333'),
                    border: `1px solid ${isUsingBackCamera ? '#E8A889' : '#ddd'}`,
                    borderRadius: '25px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: isSwitchDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: isSwitchDisabled ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
                    opacity: isSwitchDisabled ? 0.6 : 1,
                    transition: 'background 0.2s ease, color 0.2s ease'
                  }}
                >
                  {isSwitchingCamera
                    ? 'Mengganti...'
                    : isUsingBackCamera
                      ? 'Gunakan Kamera Depan'
                      : 'Gunakan Kamera Belakang'}
                </button>
              )}

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
                  onChange={(e) => {
                    const nextValue = Number(e.target.value);
                    setTimer(TIMER_OPTIONS.includes(nextValue) ? nextValue : TIMER_OPTIONS[0]);
                  }}
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
                  {TIMER_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}s</option>
                  ))}
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
                      transform: shouldMirrorVideo ? 'scaleX(-1)' : 'none'
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
                  disabled={capturing || isVideoProcessing || capturedPhotos.length >= maxCaptures}
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
                      ? `📸 Capturing in ${(countdown ?? timer)}s...`
                      : isVideoProcessing
                        ? '🎬 Menyimpan video...'
                        : `📸 Capture (${timer}s timer)`
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
                      const normalizedVideos = [...capturedVideos];
                      while (normalizedVideos.length < emergencyCompressed.length) {
                        normalizedVideos.push(null);
                      }
                      localStorage.setItem('capturedVideos', JSON.stringify(normalizedVideos));
                    } else {
                      localStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
                      const normalizedVideos = [...capturedVideos];
                      while (normalizedVideos.length < capturedPhotos.length) {
                        normalizedVideos.push(null);
                      }
                      localStorage.setItem('capturedVideos', JSON.stringify(normalizedVideos));
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
                      const normalizedVideos = [...capturedVideos];
                      while (normalizedVideos.length < strongCompressed.length) {
                        normalizedVideos.push(null);
                      }
                      localStorage.setItem('capturedVideos', JSON.stringify(normalizedVideos));
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
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflowY: 'auto',
          padding: 'calc(env(safe-area-inset-top, 0px) + 1rem) clamp(0.75rem, 4vw, 1.25rem) calc(env(safe-area-inset-bottom, 0px) + 1rem)',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '18px',
            padding: 'clamp(1rem, 5vw, 1.75rem)',
            width: 'min(420px, 100%)',
            maxHeight: 'calc(100vh - (env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px) + 2rem))',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            overflowY: 'auto',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: 0
            }}>
              📸 Foto berhasil diambil!
            </h3>
            
            <div style={{
              marginBottom: 'clamp(1rem, 4vw, 1.5rem)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: currentVideo ? '1.5rem' : 0
              }}>
                <img
                  src={currentPhoto}
                  alt="Captured"
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    maxHeight: 'min(300px, 60vh)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                />
              </div>

              {currentVideo && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <video
                    src={currentVideo.dataUrl}
                    controls
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      maxWidth: '360px',
                      maxHeight: 'min(240px, 50vh)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  />
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#555'
                  }}>
                    🎬 Video durasi {currentVideo.duration || '-'} detik siap disimpan
                  </div>
                </div>
              )}

              {isVideoProcessing && (
                <div style={{
                  marginTop: '1rem',
                  fontSize: '0.95rem',
                  color: '#E8A889',
                  fontWeight: '600'
                }}>
                  ⏳ Menyiapkan video, mohon tunggu sebentar...
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              width: '100%',
              maxWidth: '360px',
              margin: '0 auto'
            }}>
              <button
                onClick={handleChoosePhoto}
                disabled={isVideoProcessing}
                style={{
                  padding: '0.75rem 1.75rem',
                  background: isVideoProcessing ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isVideoProcessing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(40,167,69,0.3)',
                  transition: 'all 0.2s ease',
                  opacity: isVideoProcessing ? 0.7 : 1,
                  minWidth: 'min(160px, 100%)',
                  flex: '1 1 140px'
                }}
              >
                {isVideoProcessing ? '⏳ Sedang menyiapkan...' : '✓ Pilih'}
              </button>
              
              <button
                onClick={handleRetakePhoto}
                style={{
                  padding: '0.75rem 1.75rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(108,117,125,0.3)',
                  transition: 'all 0.2s ease',
                  minWidth: 'min(160px, 100%)',
                  flex: '1 1 140px'
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
