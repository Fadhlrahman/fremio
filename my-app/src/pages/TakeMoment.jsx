import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import fremioLogo from "../assets/react.svg";
import burgerIcon from "../assets/burger-bar.png";
import flipIcon from "../assets/flip.png";

const TIMER_OPTIONS = [3, 5, 10];
const PHONE_MAX_WIDTH = 480;
const POST_CAPTURE_BUFFER_SECONDS = 1;

const TIMER_VIDEO_DURATION_MAP = {
  3: { record: 4, playback: 4 },
  5: { record: 6, playback: 6 },
  10: { record: 6, playback: 6 },
};

const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const calculateStorageSize = ({ photos = [], videos = [] }) => {
  const totalBytes = [...photos, ...videos]
    .filter(Boolean)
    .reduce((sum, item) => {
      if (typeof item === "string") {
        return sum + item.length * 2;
      }
      if (item?.dataUrl) {
        return sum + item.dataUrl.length * 2;
      }
      return sum;
    }, 0);

  const kb = totalBytes / 1024;
  const mb = kb / 1024;
  return {
    bytes: totalBytes,
    kb: kb.toFixed(1),
    mb: mb.toFixed(2),
  };
};

const detectMobile = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const touchCapable =
    "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  return /android|iPad|iPhone|iPod/i.test(ua) && touchCapable;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => detectMobile());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(detectMobile() || window.innerWidth <= PHONE_MAX_WIDTH);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const compressImage = (dataUrl, { quality = 0.8, maxWidth = 600, maxHeight = 600 } = {}) =>
  new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });

const compressPhotosArray = async (photos, options) => {
  const results = [];
  for (const photo of photos) {
    const compressed = await compressImage(photo, options);
    results.push(compressed);
  }
  return results;
};

export default function TakeMoment() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const activeRecordingRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturedVideos, setCapturedVideos] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timer, setTimer] = useState(TIMER_OPTIONS[0]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(4 / 3);
  const [maxCaptures, setMaxCaptures] = useState(4);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [isUsingBackCamera, setIsUsingBackCamera] = useState(false);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const clearCapturedMedia = useCallback(() => {
    setCapturedPhotos([]);
    setCapturedVideos([]);

    if (!safeStorage.isAvailable()) return;

    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");
  }, []);

  const cleanUpStorage = useCallback(() => {
    try {
      const photos = safeStorage.getJSON("capturedPhotos", []);
      const videos = safeStorage.getJSON("capturedVideos", []);

      const lastSavedPhoto = photos.slice(0, maxCaptures);
      const lastSavedVideos = videos.slice(0, maxCaptures);
      safeStorage.setJSON("capturedPhotos", lastSavedPhoto);
      safeStorage.setJSON("capturedVideos", lastSavedVideos);
    } catch (error) {
      console.warn("⚠️ Failed to clean up storage:", error);
    }
  }, [maxCaptures]);

    const stopCamera = useCallback(() => {
      if (activeRecordingRef.current) {
        try {
          activeRecordingRef.current.stop?.();
        } catch (error) {
          console.warn("⚠️ Error stopping active recording", error);
        }
        activeRecordingRef.current = null;
      }

      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }

      setCameraActive(false);
    }, []);

  useEffect(() => {
    clearCapturedMedia();

    frameProvider
      .loadFrameFromStorage()
      .catch((error) => {
        console.warn("⚠️ Failed to load frame from storage", error);
      })
      .finally(() => {
        const frameConfig = frameProvider.getCurrentConfig();
        if (frameConfig?.maxCaptures) {
          setMaxCaptures(frameConfig.maxCaptures);
        } else {
          setMaxCaptures(4);
        }
      });
  }, [clearCapturedMedia]);

  useEffect(() => {
    if (!capturedPhotos.length) return;

    const storageSize = calculateStorageSize({ photos: capturedPhotos, videos: capturedVideos });
    console.log("💾 Storage size", storageSize);
  }, [capturedPhotos, capturedVideos]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const shouldMirrorVideo = useMemo(() => !isUsingBackCamera, [isUsingBackCamera]);
  const hasReachedMaxPhotos = capturedPhotos.length >= maxCaptures;
  const isCaptureDisabled = capturing || isVideoProcessing || hasReachedMaxPhotos;

  const determineVideoBitrate = (recordSeconds) => {
    if (recordSeconds <= 4) return 2_500_000;
    if (recordSeconds <= 6) return 2_000_000;
    if (recordSeconds <= 8) return 1_500_000;
    return 1_200_000;
  };

  const startCamera = useCallback(
    async (desiredFacingMode = "user") => {
      try {
        setCameraError(null);
        setIsSwitchingCamera(true);

        const constraints = {
          audio: false,
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: desiredFacingMode,
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraStreamRef.current = stream;
        setCameraActive(true);

        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current
              .play()
              .then(() => {})
              .catch((error) => {
                console.error("❌ video play failed", error);
              });
          }
        }, 100);
      } catch (error) {
        console.error("❌ Error accessing camera", error);
        setCameraError(error.message);
        alert(`Error accessing camera: ${error.message}`);
      } finally {
        setIsSwitchingCamera(false);
      }
    },
    []
  );

  const handleCameraToggle = useCallback(() => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera(isUsingBackCamera ? "environment" : "user");
    }
  }, [cameraActive, isUsingBackCamera, startCamera, stopCamera]);

  const handleSwitchCamera = useCallback(async () => {
    if (!cameraActive || isSwitchingCamera) return;

    const nextState = !isUsingBackCamera;
    stopCamera();
    setIsUsingBackCamera(nextState);
    await startCamera(nextState ? "environment" : "user");
  }, [cameraActive, isUsingBackCamera, isSwitchingCamera, startCamera, stopCamera]);

  const handleFileSelect = useCallback(
    (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;

      const readers = files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          })
      );

      Promise.all(readers).then((photos) => {
        setCapturedPhotos((prev) => {
          const next = [...prev, ...photos].slice(0, maxCaptures);
          safeStorage.setJSON("capturedPhotos", next);
          return next;
        });
      });

      event.target.value = "";
    },
    [maxCaptures]
  );

  const renderCountdownOverlay = () => {
    if (!countdown) return null;
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "20px",
        }}
      >
        <span
          style={{
            fontSize: "4rem",
            fontWeight: "bold",
            color: "white",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          {countdown}
        </span>
      </div>
    );
  };

  const startVideoRecording = useCallback(
    (timerSeconds) => {
      const baseStream = cameraStreamRef.current || videoRef.current?.srcObject;
      if (!baseStream) {
        console.warn("⚠️ No camera stream available for video recording");
        return null;
      }

      const { record: recordSeconds } =
        TIMER_VIDEO_DURATION_MAP[timerSeconds] || { record: timerSeconds + 1 };
      const desiredStopSeconds = timerSeconds + POST_CAPTURE_BUFFER_SECONDS;
      const delayBeforeStartSeconds = Math.max(0, desiredStopSeconds - recordSeconds);

      const rawRecordingStream = baseStream.clone();
      let recordingStream = rawRecordingStream;
      let mirrorCleanup = () => {
        rawRecordingStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (stopError) {
            console.warn("⚠️ Failed to stop raw recording track", stopError);
          }
        });
      };

      if (shouldMirrorVideo && videoRef.current) {
        try {
          const mirrorCanvas = document.createElement("canvas");
          const canCaptureStream = typeof mirrorCanvas.captureStream === "function";
          const mirrorCtx = mirrorCanvas.getContext("2d");

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
            const renderFrame = () => {
              resolveDimensions();
              if (sourceVideo.readyState >= 2) {
                mirrorCtx.save();
                mirrorCtx.setTransform(-1, 0, 0, 1, mirrorCanvas.width, 0);
                mirrorCtx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
                mirrorCtx.drawImage(sourceVideo, 0, 0, mirrorCanvas.width, mirrorCanvas.height);
                mirrorCtx.restore();
              }
              animationFrameId = requestAnimationFrame(renderFrame);
            };

            renderFrame();

            const canvasStream = mirrorCanvas.captureStream(30);
            rawRecordingStream.getAudioTracks().forEach((track) => {
              try {
                canvasStream.addTrack(track);
              } catch (addError) {
                console.warn("⚠️ Failed to attach audio track", addError);
              }
            });

            recordingStream = canvasStream;
            mirrorCleanup = () => {
              if (animationFrameId) cancelAnimationFrame(animationFrameId);
              canvasStream.getTracks().forEach((track) => {
                try {
                  track.stop();
                } catch (stopError) {
                  console.warn("⚠️ Failed to stop mirrored canvas track", stopError);
                }
              });
              rawRecordingStream.getTracks().forEach((track) => {
                try {
                  track.stop();
                } catch (stopError) {
                  console.warn("⚠️ Failed to stop raw recording track", stopError);
                }
              });
            };
          }
        } catch (mirrorError) {
          console.warn("⚠️ Mirrored recording init failed", mirrorError);
        }
      }

      const stopRecordingStream = () => {
        if (mirrorCleanup) {
          mirrorCleanup();
          mirrorCleanup = null;
        }
      };

      const mimeCandidates = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4;codecs=h264",
      ];

      const supportedMimeType =
        mimeCandidates.find((candidate) => {
          try {
            return candidate && MediaRecorder.isTypeSupported(candidate);
          } catch {
            return false;
          }
        }) || "";

      const tunedBitrate = determineVideoBitrate(recordSeconds);
      const hasAudioTrack = recordingStream.getAudioTracks().length > 0;

      let recorder;
      try {
        const options = supportedMimeType
          ? {
              mimeType: supportedMimeType,
              videoBitsPerSecond: tunedBitrate,
              ...(hasAudioTrack ? { audioBitsPerSecond: 64_000 } : {}),
            }
          : { videoBitsPerSecond: tunedBitrate, ...(hasAudioTrack ? { audioBitsPerSecond: 64_000 } : {}) };
        recorder = new MediaRecorder(recordingStream, options);
      } catch (error) {
        console.warn("⚠️ Failed to create tuned MediaRecorder", error);
        try {
          recorder = supportedMimeType ? new MediaRecorder(recordingStream, { mimeType: supportedMimeType }) : new MediaRecorder(recordingStream);
        } catch (fallbackError) {
          console.error("❌ Failed to create MediaRecorder", fallbackError);
          stopRecordingStream();
          return null;
        }
      }

      const chunks = [];
      let startTimeout;
      let stopTimeout;
      let hasRecordingStarted = false;
      let hasRecordingStopped = false;

      let rejectPromise;
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
            rejectPromise?.(new Error("Recording cancelled before start"));
            return;
          }

          hasRecordingStopped = true;
          if (recorder.state !== "inactive") {
            try {
              recorder.stop();
            } catch (error) {
              console.warn("⚠️ Error stopping recorder", error);
            }
          }
        },
        promise: null,
      };

      controller.promise = new Promise((resolve, reject) => {
        rejectPromise = reject;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onerror = (event) => {
          console.error("❌ MediaRecorder error", event.error || event);
          controller.stop();
          stopRecordingStream();
          reject(event.error || new Error("MediaRecorder error"));
        };

        recorder.onstop = async () => {
          hasRecordingStopped = true;
          try {
            const blob = new Blob(chunks, {
              type: recorder.mimeType || supportedMimeType || "video/webm",
            });
            const dataUrl = await blobToDataURL(blob);
            resolve({
              dataUrl,
              mimeType: blob.type || recorder.mimeType || supportedMimeType || "video/webm",
              duration: recordSeconds,
              timer: timerSeconds,
              actualDelay: delayBeforeStartSeconds,
            });
          } catch (error) {
            reject(error);
          } finally {
            stopRecordingStream();
          }
        };
      });

      const startRecording = () => {
        if (hasRecordingStarted || hasRecordingStopped) return;
        hasRecordingStarted = true;
        try {
          recorder.start();
          stopTimeout = setTimeout(() => {
            if (recorder.state !== "inactive") {
              recorder.stop();
            }
          }, recordSeconds * 1000);
        } catch (error) {
          console.error("❌ Failed to start MediaRecorder", error);
          stopRecordingStream();
          hasRecordingStopped = true;
          rejectPromise?.(error);
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
    },
    [shouldMirrorVideo]
  );

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (shouldMirrorVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL("image/png");
    setCurrentPhoto(dataUrl);
    setShowConfirmation(true);
  }, [shouldMirrorVideo]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || capturing || isVideoProcessing) return;
    if (!cameraActive) {
      alert("Aktifkan kamera terlebih dahulu sebelum mengambil foto.");
      return;
    }
    if (hasReachedMaxPhotos) {
      alert(`Maksimal ${maxCaptures} foto sudah tercapai untuk frame ini!`);
      return;
    }

    const effectiveTimer = TIMER_OPTIONS.includes(timer) ? timer : TIMER_OPTIONS[0];
    if (effectiveTimer !== timer) setTimer(effectiveTimer);

    if (activeRecordingRef.current) {
      console.warn("⚠️ A recording is already in progress");
      return;
    }

    setCapturing(true);
    setIsVideoProcessing(true);
    setCurrentVideo(null);

    const recordingController = startVideoRecording(effectiveTimer);
    if (recordingController) {
      recordingController.promise
        .then((videoData) => {
          setCurrentVideo(videoData);
        })
        .catch((error) => {
          console.error("❌ Failed to record video", error);
          alert("Perekaman video gagal. Silakan coba lagi.");
        })
        .finally(() => {
          setIsVideoProcessing(false);
        });
    } else {
      setIsVideoProcessing(false);
    }

    setCountdown(effectiveTimer);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownInterval);
          capturePhoto();
          setCapturing(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [
    capturing,
    capturePhoto,
    cameraActive,
    hasReachedMaxPhotos,
    maxCaptures,
    startVideoRecording,
    timer,
    isVideoProcessing,
  ]);

  const handleChoosePhoto = useCallback(async () => {
    if (!currentPhoto) return;

    try {
      cleanUpStorage();

      const currentFrameName = frameProvider.getCurrentFrameName();
      let compressedPhoto;

      if (currentFrameName === "Testframe4") {
        compressedPhoto = await compressImage(currentPhoto, {
          quality: 0.85,
          maxWidth: 700,
          maxHeight: 500,
        });
      } else if (currentFrameName === "Testframe2") {
        compressedPhoto = await compressImage(currentPhoto, {
          quality: 0.95,
          maxWidth: 800,
          maxHeight: 800,
        });
      } else {
        compressedPhoto = await compressImage(currentPhoto, {
          quality: 0.75,
          maxWidth: 500,
          maxHeight: 500,
        });
      }

      const newPhotos = [...capturedPhotos, compressedPhoto];
      let storedVideo = currentVideo || null;
      const newVideos = [...capturedVideos, storedVideo];

      const storageSize = calculateStorageSize({ photos: newPhotos, videos: newVideos });
      if (parseFloat(storageSize.mb) > 3) {
        const moderatePhoto = await compressImage(currentPhoto, {
          quality: currentFrameName === "Testframe4" ? 0.75 : 0.6,
          maxWidth: currentFrameName === "Testframe4" ? 600 : 400,
          maxHeight: currentFrameName === "Testframe4" ? 450 : 400,
        });
        newPhotos[newPhotos.length - 1] = moderatePhoto;
      }

      const postModerateSize = calculateStorageSize({ photos: newPhotos, videos: newVideos });
      if (parseFloat(postModerateSize.mb) > 4.3) {
        const emergencyPhoto = await compressImage(newPhotos[newPhotos.length - 1], {
          quality: 0.5,
          maxWidth: 360,
          maxHeight: 360,
        });
        newPhotos[newPhotos.length - 1] = emergencyPhoto;
      }

      const finalSizeCheck = calculateStorageSize({ photos: newPhotos, videos: newVideos });
      if (parseFloat(finalSizeCheck.mb) > 4.6) {
        storedVideo = null;
        newVideos[newVideos.length - 1] = null;
        alert(
          "Penyimpanan hampir penuh. Video countdown terakhir tidak akan disimpan, tapi foto tetap aman."
        );
      }

      setCapturedPhotos(newPhotos);
      setCapturedVideos(newVideos);

      try {
        safeStorage.setJSON("capturedPhotos", newPhotos);
        safeStorage.setJSON("capturedVideos", newVideos);
      } catch (quotaError) {
        console.error("❌ QuotaExceededError", quotaError);
        alert("Storage limit exceeded! Please try taking fewer photos or refresh the page.");
        return;
      }

      setCurrentPhoto(null);
      setCurrentVideo(null);
      setShowConfirmation(false);
      setIsVideoProcessing(false);

      if (newPhotos.length >= maxCaptures) {
        stopCamera();
      }
    } catch (error) {
      console.error("❌ Error compressing photo", error);
      const newPhotos = [...capturedPhotos, currentPhoto];
      const newVideos = [...capturedVideos, currentVideo || null];
      setCapturedPhotos(newPhotos);
      setCapturedVideos(newVideos);
      try {
        safeStorage.setJSON("capturedPhotos", newPhotos);
        safeStorage.setJSON("capturedVideos", newVideos);
      } catch (quotaError) {
        console.error("❌ QuotaExceededError on fallback", quotaError);
        alert("Storage limit exceeded! Please refresh the page and try again.");
        return;
      }
      setCurrentPhoto(null);
      setCurrentVideo(null);
      setShowConfirmation(false);
      setIsVideoProcessing(false);

      if (newPhotos.length >= maxCaptures) {
        stopCamera();
      }
    }
  }, [
    capturedPhotos,
    capturedVideos,
    cleanUpStorage,
    currentPhoto,
    currentVideo,
    maxCaptures,
    stopCamera,
  ]);

  const handleRetakePhoto = useCallback(() => {
    setCurrentPhoto(null);
    setCurrentVideo(null);
    setIsVideoProcessing(false);
    setShowConfirmation(false);
  }, []);

  const handleDeletePhoto = useCallback(
    (indexToDelete) => {
      const newPhotos = capturedPhotos.filter((_, index) => index !== indexToDelete);
      const newVideos = capturedVideos.filter((_, index) => index !== indexToDelete);
      setCapturedPhotos(newPhotos);
      setCapturedVideos(newVideos);
      try {
        safeStorage.setJSON("capturedPhotos", newPhotos);
        safeStorage.setJSON("capturedVideos", newVideos);
      } catch (error) {
        console.error("❌ Error updating storage after delete", error);
      }
    },
    [capturedPhotos, capturedVideos]
  );

  const handleEdit = useCallback(async () => {
    if (capturedPhotos.length < maxCaptures) {
      alert(
        `Anda perlu mengambil ${maxCaptures} foto untuk frame ini. Saat ini baru ${capturedPhotos.length} foto.`
      );
      return;
    }

    try {
      cleanUpStorage();
      const storageSize = calculateStorageSize({ photos: capturedPhotos, videos: capturedVideos });

      if (parseFloat(storageSize.mb) > 4) {
        const currentFrameName = frameProvider.getCurrentFrameName();
        const emergencyCompressed = await compressPhotosArray(capturedPhotos, {
          quality: currentFrameName === "Testframe4" ? 0.7 : 0.6,
          maxWidth: currentFrameName === "Testframe4" ? 500 : 400,
          maxHeight: currentFrameName === "Testframe4" ? 400 : 400,
        });
        safeStorage.setJSON("capturedPhotos", emergencyCompressed);

        const normalizedVideos = [...capturedVideos];
        while (normalizedVideos.length < emergencyCompressed.length) {
          normalizedVideos.push(null);
        }
        safeStorage.setJSON("capturedVideos", normalizedVideos);
      } else {
        safeStorage.setJSON("capturedPhotos", capturedPhotos);
        const normalizedVideos = [...capturedVideos];
        while (normalizedVideos.length < capturedPhotos.length) {
          normalizedVideos.push(null);
        }
        safeStorage.setJSON("capturedVideos", normalizedVideos);
      }
    } catch (quotaError) {
      console.error("❌ QuotaExceededError when saving photos", quotaError);
      try {
        const currentFrameName = frameProvider.getCurrentFrameName();
        const strongCompressed = await compressPhotosArray(capturedPhotos, {
          quality: currentFrameName === "Testframe4" ? 0.5 : 0.4,
          maxWidth: currentFrameName === "Testframe4" ? 400 : 300,
          maxHeight: currentFrameName === "Testframe4" ? 350 : 300,
        });
        safeStorage.setJSON("capturedPhotos", strongCompressed);
        const normalizedVideos = [...capturedVideos];
        while (normalizedVideos.length < strongCompressed.length) {
          normalizedVideos.push(null);
        }
        safeStorage.setJSON("capturedVideos", normalizedVideos);
      } catch (finalError) {
        console.error("❌ Emergency compression failed", finalError);
        alert("Storage limit exceeded! Please refresh the page and try again.");
        return;
      }
    }

    const currentFrame = frameProvider.getCurrentConfig();
    if (currentFrame) {
      try {
  safeStorage.setItem("selectedFrame", currentFrame.id);
  safeStorage.setJSON("frameConfig", currentFrame);
      } catch (error) {
        console.error("❌ QuotaExceededError when saving frame config", error);
        alert("Warning: Could not save frame configuration due to storage limits.");
      }
    }

    stopCamera();
    navigate("/edit-photo");
  }, [
    capturedPhotos,
    capturedVideos,
    cleanUpStorage,
    maxCaptures,
    navigate,
    stopCamera,
  ]);

  const renderPreviewPanel = (variant) => {
    const isMobileVariant = variant === "mobile";

    return (
      <div
        style={{
          background: "#fff",
          borderRadius: isMobileVariant ? "16px" : "20px",
          padding: isMobileVariant ? "1rem" : "1.5rem",
          marginBottom: isMobileVariant ? "1rem" : "1.5rem",
          minHeight: isMobileVariant ? "260px" : "320px",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <h3
            style={{
              fontSize: isMobileVariant ? "1.1rem" : "1.5rem",
              fontWeight: "bold",
              color: "#333",
              margin: 0,
            }}
          >
            Preview
          </h3>
          {capturedPhotos.length > 0 && (
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 500,
                color: "#94a3b8",
              }}
            >
              {capturedPhotos.length}/{maxCaptures}
            </span>
          )}
        </header>

        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {capturedPhotos.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: capturedPhotos.length > 1 ? "repeat(2, 1fr)" : "1fr",
                gap: isMobileVariant ? "0.5rem" : "0.75rem",
                width: "100%",
                maxWidth: isMobileVariant ? "260px" : "320px",
              }}
            >
              {capturedPhotos.map((photo, idx) => (
                <div
                  key={photo + idx}
                  style={{
                    position: "relative",
                    aspectRatio: videoAspectRatio.toString(),
                    borderRadius: "10px",
                    overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <img
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  <button
                    onClick={() => handleDeletePhoto(idx)}
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "26px",
                      height: "26px",
                      borderRadius: "13px",
                      border: "none",
                      background: "rgba(255, 59, 48, 0.95)",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    }}
                    title={`Hapus foto ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#999",
                fontSize: isMobileVariant ? "0.95rem" : "1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "2.75rem",
                  lineHeight: 1,
                }}
              >
                📸
              </div>
              <div
                style={{
                  fontWeight: 500,
                }}
              >
                belum ada foto
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                }}
              >
                ambil foto untuk melihat preview di sini
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleEdit}
          disabled={capturedPhotos.length < maxCaptures}
          style={{
            width: "100%",
            padding: isMobileVariant ? "0.85rem" : "1rem",
            background: capturedPhotos.length >= maxCaptures ? "#E8A889" : "#d0d7de",
            color: "white",
            border: "none",
            borderRadius: "999px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: capturedPhotos.length >= maxCaptures ? "pointer" : "not-allowed",
            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            transition: "transform 0.2s ease",
            opacity: capturedPhotos.length >= maxCaptures ? 1 : 0.7,
          }}
        >
          {capturedPhotos.length >= maxCaptures
            ? "✨ Edit Photos"
            : `📝 ${capturedPhotos.length}/${maxCaptures} foto`}
        </button>
      </div>
    );
  };

  const renderConfirmationModal = () => {
    if (!showConfirmation || !currentPhoto) return null;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            width: "min(420px, 100%)",
            maxHeight: "calc(100vh - 3rem)",
            padding: "1.75rem",
            boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "#333",
              }}
            >
              📸 Foto berhasil diambil!
            </div>
            <img
              src={currentPhoto}
              alt="Captured"
              style={{
                width: "100%",
                maxHeight: "320px",
                borderRadius: "12px",
                objectFit: "contain",
                boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
              }}
            />
            {currentVideo && (
              <video
                src={currentVideo.dataUrl}
                controls
                playsInline
                muted
                style={{
                  width: "100%",
                  maxHeight: "240px",
                  borderRadius: "12px",
                  objectFit: "contain",
                  boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
                }}
              />
            )}
            {isVideoProcessing && (
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "#E8A889",
                }}
              >
                ⏳ Menyiapkan video, mohon tunggu sebentar...
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleChoosePhoto}
              disabled={isVideoProcessing}
              style={{
                flex: "1 1 120px",
                padding: "0.85rem 1.5rem",
                borderRadius: "999px",
                border: "none",
                background: isVideoProcessing ? "#6c757d" : "#28a745",
                color: "#fff",
                fontWeight: 600,
                cursor: isVideoProcessing ? "not-allowed" : "pointer",
                boxShadow: "0 16px 32px rgba(40,167,69,0.35)",
              }}
            >
              {isVideoProcessing ? "⏳ Sedang menyiapkan..." : "✓ Pilih"}
            </button>
            <button
              onClick={handleRetakePhoto}
              style={{
                flex: "1 1 120px",
                padding: "0.85rem 1.5rem",
                borderRadius: "999px",
                border: "none",
                background: "#6c757d",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 16px 32px rgba(108,117,125,0.35)",
              }}
            >
              🔄 Ulangi
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStorageDebugPanel = () => {
    const storageSize = calculateStorageSize({ photos: capturedPhotos, videos: capturedVideos });

    return (
      <details
        style={{
          width: "100%",
          maxWidth: "340px",
          margin: "1.5rem auto 0",
          background: "#fff",
          borderRadius: "16px",
          padding: "1rem 1.25rem",
          boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
          color: "#475569",
        }}
      >
        <summary
          style={{
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <span>📦 Storage info</span>
          <span
            style={{
              fontSize: "0.9rem",
              color: parseFloat(storageSize.mb) > 4.3 ? "#dc2626" : "#38a169",
            }}
          >
            {storageSize.mb} MB
          </span>
        </summary>
        <div
          style={{
            marginTop: "1rem",
            fontSize: "0.85rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <div>Photos: {capturedPhotos.length}</div>
          <div>Videos: {capturedVideos.filter(Boolean).length}</div>
          <button
            onClick={clearCapturedMedia}
            style={{
              padding: "0.65rem 1rem",
              border: "none",
              borderRadius: "999px",
              background: "#ef4444",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              marginTop: "0.5rem",
            }}
          >
            Reset captured data
          </button>
        </div>
      </details>
    );
  };

  const renderCameraControls = (variant) => {
    const isMobileVariant = variant === "mobile";
    const showCameraButtonLabel = isMobileVariant ? "Pakai Kamera" : cameraActive ? "Stop Camera" : "Camera";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: isMobileVariant ? "column" : "row",
          gap: isMobileVariant ? "0.75rem" : "1rem",
          marginBottom: isMobileVariant ? "1rem" : "1.5rem",
          alignItems: isMobileVariant ? "stretch" : "center",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button
          onClick={() => {
            if (capturedPhotos.length >= maxCaptures) return;
            fileInputRef.current?.click();
          }}
          disabled={capturedPhotos.length >= maxCaptures}
          title={capturedPhotos.length >= maxCaptures ? "Maksimal foto sudah tercapai" : "Pilih file dari galeri"}
          style={{
            padding: isMobileVariant ? "0.85rem 1rem" : "0.75rem 1.5rem",
            background: capturedPhotos.length >= maxCaptures ? "#f1f5f9" : "#fff",
            color: capturedPhotos.length >= maxCaptures ? "#94a3b8" : "#333",
            border: "1px solid #e2e8f0",
            borderRadius: "999px",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: capturedPhotos.length >= maxCaptures ? "not-allowed" : "pointer",
            boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {capturedPhotos.length >= maxCaptures
            ? "Max photos reached"
            : isMobileVariant
            ? "Upload dari galeri"
            : `Choose file (${maxCaptures - capturedPhotos.length} left)`}
        </button>

        <button
          onClick={handleCameraToggle}
          style={{
            padding: isMobileVariant ? "0.85rem 1rem" : "0.75rem 1.5rem",
            background: cameraActive ? "#E8A889" : "#fff",
            color: cameraActive ? "#fff" : "#333",
            border: cameraActive ? "1px solid #E8A889" : "1px solid #e2e8f0",
            borderRadius: "999px",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: cameraActive ? "0 16px 32px rgba(232,168,137,0.35)" : "0 12px 24px rgba(15,23,42,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          {isMobileVariant && <span role="img" aria-hidden="true">📷</span>}
          {showCameraButtonLabel}
        </button>

        {!isMobileVariant && cameraActive && (
          <button
            onClick={handleSwitchCamera}
            disabled={isSwitchingCamera}
            style={{
              padding: "0.75rem 1.5rem",
              background: isSwitchingCamera ? "#f1f5f9" : isUsingBackCamera ? "#E8A889" : "#fff",
              color: isSwitchingCamera ? "#94a3b8" : isUsingBackCamera ? "#fff" : "#333",
              border: `1px solid ${isUsingBackCamera ? "#E8A889" : "#e2e8f0"}`,
              borderRadius: "999px",
              fontSize: "1rem",
              fontWeight: 500,
              cursor: isSwitchingCamera ? "not-allowed" : "pointer",
              boxShadow: isSwitchingCamera ? "none" : "0 12px 24px rgba(15,23,42,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minWidth: "200px",
            }}
          >
            <img src={flipIcon} alt="Switch camera" style={{ width: "20px", height: "20px" }} />
            {isSwitchingCamera ? "Mengganti..." : isUsingBackCamera ? "Gunakan kamera depan" : "Gunakan kamera belakang"}
          </button>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginLeft: isMobileVariant ? 0 : "auto",
          }}
        >
          <label style={{ fontSize: "0.95rem", fontWeight: 500, color: "#475569" }}>Timer:</label>
          <select
            value={timer}
            onChange={(e) => setTimer(Number(e.target.value))}
            disabled={capturing}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "999px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#333",
              fontSize: "1rem",
              cursor: capturing ? "not-allowed" : "pointer",
              boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
            }}
          >
            {TIMER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} detik
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const renderCaptureArea = (variant) => {
    const isMobileVariant = variant === "mobile";

    return (
      <div
        style={{
          background: "#fff",
          borderRadius: isMobileVariant ? "18px" : "20px",
          overflow: "hidden",
          position: "relative",
          minHeight: isMobileVariant ? "360px" : "420px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: shouldMirrorVideo ? "scaleX(-1)" : "none",
                background: "#000",
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setVideoAspectRatio(videoRef.current.videoWidth / Math.max(videoRef.current.videoHeight, 1));
                }
              }}
              onError={(error) => {
                console.error("🚫 Video error", error);
                setCameraError("Video gagal dimuat");
              }}
            />
            {cameraError && (
              <div
                style={{
                  position: "absolute",
                  bottom: isMobileVariant ? "16px" : "24px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(255, 59, 48, 0.95)",
                  color: "#fff",
                  padding: "0.75rem 1rem",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
                  maxWidth: "90%",
                  textAlign: "left",
                  fontSize: "0.95rem",
                }}
              >
                <span role="img" aria-label="Camera error">
                  ⚠️
                </span>
                <span>{cameraError}</span>
              </div>
            )}
            {renderCountdownOverlay()}
            {isMobileVariant && cameraActive && !isSwitchingCamera && (
              <button
                onClick={handleSwitchCamera}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "22px",
                  border: "none",
                  background: "rgba(15,23,42,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img src={flipIcon} alt="Flip camera" style={{ width: "20px", height: "20px" }} />
              </button>
            )}
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "1.05rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>📷</div>
            <div style={{ fontWeight: 600 }}>Kamera belum aktif</div>
            <div style={{ fontSize: "0.9rem" }}>aktifkan kamera atau upload dari galeri</div>
            {cameraError && (
              <div
                style={{
                  marginTop: "0.5rem",
                  background: "rgba(255, 59, 48, 0.1)",
                  border: "1px solid rgba(255, 59, 48, 0.3)",
                  color: "#ef4444",
                  borderRadius: "10px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.85rem",
                  lineHeight: 1.4,
                  maxWidth: "320px",
                }}
              >
                {cameraError}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCaptureButton = (variant) => {
    if (!cameraActive) return null;

    const isMobileVariant = variant === "mobile";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: isMobileVariant ? "1.25rem 0" : "1.5rem 0",
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: hasReachedMaxPhotos ? "#ef4444" : "#475569",
          }}
        >
          Foto: {capturedPhotos.length}/{maxCaptures}
          {hasReachedMaxPhotos && " - maksimal tercapai!"}
        </div>

        <button
          onClick={handleCapture}
          disabled={isCaptureDisabled}
          style={{
            width: isMobileVariant ? "88px" : "120px",
            height: isMobileVariant ? "88px" : "120px",
            borderRadius: "50%",
            border: "none",
            background: isCaptureDisabled ? "#e2e8f0" : "#E8A889",
            color: "white",
            fontSize: "1.5rem",
            fontWeight: 700,
            boxShadow: isCaptureDisabled ? "none" : "0 20px 40px rgba(232,168,137,0.4)",
            cursor: isCaptureDisabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {capturedPhotos.length >= maxCaptures
            ? "🚫"
            : capturing
            ? `⏳ ${countdown ?? timer}s`
            : isVideoProcessing
            ? "🎬"
            : "📸"}
        </button>
      </div>
    );
  };

  const renderDesktopLayout = () => (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4E6DA",
        padding: "3rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
        }}
      >
        <img src={fremioLogo} alt="Fremio" style={{ width: "48px", height: "48px" }} />
        <h1
          style={{
            fontSize: "2.6rem",
            fontWeight: 700,
            color: "#1E293B",
            margin: 0,
          }}
        >
          Take your <span style={{ color: "#E8A889" }}>moment</span>
        </h1>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            fontWeight: 600,
          }}
        >
          <button
            onClick={() => navigate("/frames")}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "999px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              cursor: "pointer",
              color: "#475569",
              boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
            }}
          >
            Pilih frame lain
          </button>
          <button
            onClick={() => navigate("/frames")}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "999px",
              border: "none",
              background: "#E8A889",
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 20px 40px rgba(232,168,137,0.4)",
            }}
          >
            History
          </button>
        </nav>
      </header>

      <section
        style={{
          background: "rgba(255,255,255,0.6)",
          borderRadius: "28px",
          padding: "2.5rem",
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1fr)",
          gap: "2rem",
          boxShadow: "0 40px 80px rgba(148,163,184,0.25)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {renderCameraControls("desktop")}
          {renderCaptureArea("desktop")}
          {renderCaptureButton("desktop")}
        </div>
        <aside>{renderPreviewPanel("desktop")}</aside>
      </section>

      {renderStorageDebugPanel()}
      {renderConfirmationModal()}
    </main>
  );

  const renderMobileLayout = () => (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4E6DA",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(148,163,184,0.25)",
        }}
      >
        <img src={burgerIcon} alt="Menu" style={{ width: "28px", height: "28px" }} />
        <img src={fremioLogo} alt="Fremio" style={{ width: "36px", height: "36px" }} />
        <button
          onClick={() => navigate("/frames")}
          style={{
            padding: "0.4rem 0.85rem",
            borderRadius: "999px",
            border: "none",
            background: "#E8A889",
            color: "#fff",
            fontWeight: 600,
            boxShadow: "0 14px 28px rgba(232,168,137,0.35)",
          }}
        >
          Frame
        </button>
      </header>

      <section
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          padding: "1.25rem",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#94a3b8" }}>take your</span>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 700,
              color: "#1E293B",
              margin: 0,
            }}
          >
            moment
          </h1>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.6)",
            borderRadius: "22px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            boxShadow: "0 30px 60px rgba(148,163,184,0.25)",
          }}
        >
          {renderCameraControls("mobile")}
          {renderCaptureArea("mobile")}
          {renderCaptureButton("mobile")}
        </div>

        {renderPreviewPanel("mobile")}
      </section>

      {renderConfirmationModal()}
    </main>
  );

  return isMobile ? renderMobileLayout() : renderDesktopLayout();
}
