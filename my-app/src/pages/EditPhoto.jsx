import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import safeStorage from "../utils/safeStorage.js";
import userStorage from "../utils/userStorage.js";
import { BACKGROUND_PHOTO_Z } from "../constants/layers.js";
import html2canvas from "html2canvas";
import {
  clearFrameCache,
  clearStaleFrameCache,
} from "../utils/frameCacheCleaner.js";
import { convertBlobToMp4 } from "../utils/videoTranscoder.js";
import { useToast } from "../contexts/ToastContext";
import { trackFrameDownload } from "../services/analyticsService";
import { imagePresets, getOriginalUrl } from "../utils/imageOptimizer";

export default function EditPhoto() {
  console.log("🚀 EDITPHOTO RENDERING...");

  const navigate = useNavigate();
  const { showToast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [frameConfig, setFrameConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [designerElements, setDesignerElements] = useState([]);
  const [backgroundPhotoElement, setBackgroundPhotoElement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Filter states.
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0,
  });
  const [activeFilter, setActiveFilter] = useState(null);
  const photosFilled = React.useRef(false);

  const hasValidVideo = useMemo(() => {
    if (!Array.isArray(videos)) return false;
    return videos.some((video) => video && (video.dataUrl || video.blob));
  }, [videos]);

  useEffect(() => {
    console.log("📦 Loading data from localStorage...");
    
    // DEBUG: Check raw localStorage
    console.log("🔍 [DEBUG] Raw localStorage check:");
    const rawPhotos = localStorage.getItem("capturedPhotos");
    console.log("   - capturedPhotos raw:", rawPhotos ? `Found (${rawPhotos.length} chars)` : "NOT FOUND");
    if (rawPhotos) {
      try {
        const parsed = JSON.parse(rawPhotos);
        console.log("   - Parsed photos count:", parsed?.length || 0);
        console.log("   - First photo preview:", parsed?.[0]?.substring?.(0, 50) || "N/A");
      } catch (e) {
        console.log("   - Parse error:", e.message);
      }
    }

    // Clear stale cache (older than 24 hours)
    clearStaleFrameCache();

    const loadFrameData = async () => {
      try {
        // CRITICAL FIX: Use userStorage for activeDraftId (Create.jsx uses userStorage which prefixes with user email)
        const activeDraftId = userStorage.getItem("activeDraftId");
        console.log("🔍 activeDraftId from userStorage:", activeDraftId);
        let recoveryDraft;
        const loadDraftForRecovery = async () => {
          if (recoveryDraft !== undefined || !activeDraftId) {
            return recoveryDraft ?? null;
          }
          try {
            const { default: draftStorage } = await import(
              "../utils/draftStorage.js"
            );
            const draft = await draftStorage.getDraftById(activeDraftId);
            recoveryDraft = draft ?? null;
            if (!draft) {
              console.warn("⚠️ Draft not found for recovery:", activeDraftId);
            }
          } catch (draftError) {
            console.error("❌ Failed to load draft for recovery:", draftError);
            recoveryDraft = null;
          }
          return recoveryDraft;
        };

        // Load photos - try direct localStorage first, then safeStorage
        let photosFromStorage = null;
        
        // DEBUG: Dump all localStorage keys
        console.log("🔍 [DEBUG] ======= PHOTO LOADING START =======");
        console.log("🔍 [DEBUG] All localStorage keys:");
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const val = localStorage.getItem(key);
          console.log(`   ${key}: ${val ? val.length + ' chars' : 'null'}`);
        }
        
        // Check window backup first
        if (window.__fremio_photos && window.__fremio_photos.length > 0) {
          console.log("🆘 [BACKUP] Found photos in window.__fremio_photos:", window.__fremio_photos.length);
          console.log("🆘 [BACKUP] First photo type:", typeof window.__fremio_photos[0]);
          console.log("🆘 [BACKUP] First photo preview:", window.__fremio_photos[0]?.substring?.(0, 50) || "not string");
          photosFromStorage = window.__fremio_photos;
        }
        
        // Try direct localStorage
        if (!photosFromStorage || photosFromStorage.length === 0) {
          try {
            const rawPhotos = localStorage.getItem("capturedPhotos");
            console.log("📸 [DEBUG] Raw capturedPhotos:", rawPhotos ? `Found (${rawPhotos.length} chars)` : "NOT FOUND");
            
            if (rawPhotos) {
              // Check if data is compressed (starts with __cmp__:)
              const isCompressed = rawPhotos.startsWith("__cmp__:");
              console.log("📸 [DEBUG] Is compressed:", isCompressed);
              
              if (isCompressed) {
                // Use safeStorage to decompress
                console.log("📸 [DEBUG] Data is compressed, using safeStorage to read...");
                photosFromStorage = safeStorage.getJSON("capturedPhotos");
              } else {
                photosFromStorage = JSON.parse(rawPhotos);
              }
              
              console.log("📸 [DEBUG] Parsed photos count:", photosFromStorage?.length || 0);
              console.log("📸 [DEBUG] Parsed photos isArray:", Array.isArray(photosFromStorage));
              if (photosFromStorage?.length > 0) {
                console.log("📸 [DEBUG] First photo type:", typeof photosFromStorage[0]);
                console.log("📸 [DEBUG] First photo preview:", 
                  typeof photosFromStorage[0] === 'string' 
                    ? photosFromStorage[0].substring(0, 50) 
                    : JSON.stringify(photosFromStorage[0]).substring(0, 100));
              }
            }
          } catch (directError) {
            console.warn("⚠️ Direct localStorage read failed:", directError);
          }
        }
        
        // Fallback to safeStorage (for compressed data)
        if (!photosFromStorage || !Array.isArray(photosFromStorage) || photosFromStorage.length === 0) {
          photosFromStorage = safeStorage.getJSON("capturedPhotos");
          console.log("📸 Loaded photos from safeStorage:", photosFromStorage?.length || 0);
        }
        
        let resolvedPhotos = Array.isArray(photosFromStorage)
          ? [...photosFromStorage]
          : [];

        // If photos not found, try sessionStorage backup
        if (resolvedPhotos.length === 0) {
          try {
            const sessionBackup = sessionStorage.getItem("capturedPhotos_backup");
            if (sessionBackup) {
              const parsed = JSON.parse(sessionBackup);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("🆘 [BACKUP] Found photos in sessionStorage backup:", parsed.length);
                resolvedPhotos = parsed;
                // Copy to localStorage for consistency
                localStorage.setItem("capturedPhotos", sessionBackup);
              }
            }
          } catch (sessionErr) {
            console.warn("⚠️ sessionStorage backup read failed:", sessionErr);
          }
        }

        // If still no photos, wait a bit and retry (storage might be delayed)
        if (resolvedPhotos.length === 0) {
          console.log("⏳ [RETRY] No photos found, waiting 300ms and retrying...");
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const retryRaw = localStorage.getItem("capturedPhotos");
          if (retryRaw) {
            try {
              const retryParsed = JSON.parse(retryRaw);
              if (Array.isArray(retryParsed) && retryParsed.length > 0) {
                console.log("✅ [RETRY] Found photos after delay:", retryParsed.length);
                resolvedPhotos = retryParsed;
              }
            } catch (retryErr) {
              console.warn("⚠️ Retry parse failed:", retryErr);
            }
          }
          
          // Also check window backup again
          if (resolvedPhotos.length === 0 && window.__fremio_photos?.length > 0) {
            console.log("✅ [RETRY] Found photos in window.__fremio_photos:", window.__fremio_photos.length);
            resolvedPhotos = window.__fremio_photos;
          }
        }

        if (resolvedPhotos.length === 0 && activeDraftId) {
          const draft = await loadDraftForRecovery();
          if (draft?.capturedPhotos?.length) {
            resolvedPhotos = [...draft.capturedPhotos];
            console.log("♻️ Recovered photos from draft storage:", {
              activeDraftId,
              count: resolvedPhotos.length,
            });
            try {
              safeStorage.setJSON("capturedPhotos", resolvedPhotos);
            } catch (rehydrateError) {
              console.warn(
                "⚠️ Could not rehydrate capturedPhotos into localStorage:",
                rehydrateError
              );
            }
          }
        }

        if (resolvedPhotos.length > 0) {
          // CRITICAL FIX: Normalize photos to ensure they are strings (dataUrl format)
          // Photos can come as strings or objects with {dataUrl, previewUrl, blob, ...}
          const normalizedPhotos = resolvedPhotos.map((photo, idx) => {
            // Already a data URL string
            if (typeof photo === 'string' && photo.startsWith('data:')) {
              console.log(`📸 Photo ${idx}: Already a data URL string`);
              return photo;
            }
            // Object with dataUrl property
            if (photo?.dataUrl && typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('data:')) {
              console.log(`📸 Photo ${idx}: Extracted dataUrl from object`);
              return photo.dataUrl;
            }
            // Object with previewUrl that is a data URL (not blob URL)
            if (photo?.previewUrl && typeof photo.previewUrl === 'string' && photo.previewUrl.startsWith('data:')) {
              console.log(`📸 Photo ${idx}: Using previewUrl (data URL)`);
              return photo.previewUrl;
            }
            // Unknown format - log warning
            console.warn(`⚠️ Photo ${idx}: Unknown format, skipping:`, {
              type: typeof photo,
              hasDataUrl: !!photo?.dataUrl,
              hasPreviewUrl: !!photo?.previewUrl,
              preview: typeof photo === 'string' ? photo.substring(0, 50) : JSON.stringify(photo).substring(0, 100),
            });
            return null;
          }).filter(Boolean);

          console.log("✅ Loaded and normalized photos:", {
            original: resolvedPhotos.length,
            normalized: normalizedPhotos.length,
          });
          
          if (normalizedPhotos.length > 0) {
            console.log("📸 [NORMALIZED] First photo type:", typeof normalizedPhotos[0]);
            console.log("📸 [NORMALIZED] First photo preview:", normalizedPhotos[0]?.substring?.(0, 50) || "empty");
          } else {
            console.error("❌ [NORMALIZED] No photos after normalization!");
          }
          
          setPhotos(normalizedPhotos);
          
          // Also update resolvedPhotos for use later in frame config loading
          resolvedPhotos = normalizedPhotos;
          console.log("📸 [RESOLVED] resolvedPhotos updated to normalizedPhotos, length:", resolvedPhotos.length);
        } else {
          setPhotos([]);
          console.log("ℹ️ No captured photos found in storage or draft");
        }

        // Load videos
        let videosFromStorage = safeStorage.getJSON("capturedVideos");
        console.log("🔍 Loading videos from storage:", {
          found: !!videosFromStorage,
          isArray: Array.isArray(videosFromStorage),
          length: videosFromStorage?.length || 0,
        });

        let resolvedVideos = Array.isArray(videosFromStorage)
          ? [...videosFromStorage]
          : [];

        if (resolvedVideos.length === 0 && activeDraftId) {
          const draft = await loadDraftForRecovery();
          if (draft?.capturedVideos?.length) {
            resolvedVideos = [...draft.capturedVideos];
            console.log("♻️ Recovered videos from draft storage:", {
              activeDraftId,
              count: resolvedVideos.length,
            });
            try {
              safeStorage.setJSON("capturedVideos", resolvedVideos);
            } catch (rehydrateError) {
              console.warn(
                "⚠️ Could not rehydrate capturedVideos into localStorage:",
                rehydrateError
              );
            }
          }
        }

        if (resolvedVideos.length) {
          const normalizedVideos = resolvedVideos.map((entry, index) => {
            if (!entry) return null;

            // Legacy format: string data URL
            if (typeof entry === "string") {
              if (entry.startsWith("data:")) {
                return {
                  id: `video-${index}`,
                  dataUrl: entry,
                  mimeType:
                    entry.substring(5, entry.indexOf(";")) || "video/webm",
                  duration: null,
                  timer: null,
                  source: "legacy-string",
                };
              }
              console.warn(
                "⚠️ Unknown video string format:",
                entry.substring(0, 30)
              );
              return null;
            }

            if (typeof entry === "object") {
              if (entry.dataUrl || entry.blob) {
                return {
                  id: entry.id || `video-${index}`,
                  dataUrl: entry.dataUrl || null,
                  blob: entry.blob || null,
                  mimeType:
                    entry.mimeType ||
                    entry.dataUrl?.substring(5, entry.dataUrl.indexOf(";")) ||
                    "video/webm",
                  duration: Number.isFinite(entry.duration)
                    ? entry.duration
                    : null,
                  timer: Number.isFinite(entry.timer) ? entry.timer : null,
                  mirrored: Boolean(entry.mirrored),
                  requiresPreviewMirror: Boolean(entry.requiresPreviewMirror),
                  facingMode: entry.facingMode || null,
                  sizeBytes: entry.sizeBytes ?? null,
                  recordedAt: entry.recordedAt ?? entry.capturedAt ?? null,
                  source: entry.source || "camera-recording",
                };
              }
              console.warn("⚠️ Video entry missing dataUrl/blob:", entry);
              return null;
            }

            console.warn(
              "⚠️ Unsupported video entry type:",
              typeof entry,
              entry
            );
            return null;
          });

          const validVideoCount = normalizedVideos.filter(
            (v) => v && (v.dataUrl || v.blob)
          ).length;
          setVideos(normalizedVideos);

          console.log("✅ Videos normalized:", {
            totalEntries: resolvedVideos.length,
            normalizedEntries: normalizedVideos.length,
            validEntries: validVideoCount,
          });
        } else {
          console.log("ℹ️ No videos found in storage");
          setVideos([]);
        }

        // Load frame config
        console.log("🔍 Step 4: Loading frame config...");
        let config = safeStorage.getJSON("frameConfig");
        console.log("   frameConfig from localStorage:", !!config, config?.id);
        
        // CRITICAL DEBUG: Check what's in the loaded config
        if (config) {
          console.log("🔍 [DEBUG] Loaded frameConfig structure:", {
            id: config.id,
            isCustom: config.isCustom,
            hasDesigner: !!config.designer,
            hasDesignerElements: !!config.designer?.elements,
            designerElementsCount: config.designer?.elements?.length || 0,
            designerElementTypes: config.designer?.elements?.map(el => el?.type) || [],
            slotsCount: config.slots?.length || 0,
          });
        }

        // CRITICAL: For custom frames, always reload from service to get latest schema
        const selectedFrameId = safeStorage.getItem("selectedFrame");
        
        // Helper to detect UUID (Supabase custom frames)
        const isUUID = (str) => {
          if (typeof str !== 'string') return false;
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        };
        
        // Custom frame detection: either "custom-" prefix OR UUID OR isCustom flag
        const isCustomFrame = selectedFrameId?.startsWith("custom-") || 
                              isUUID(selectedFrameId) || 
                              config?.isCustom;
        
        // For draft-based custom frames (custom-xxx), DON'T try to load from service
        // They don't exist in Supabase - they're stored locally
        const isDraftBasedCustomFrame = selectedFrameId?.startsWith("custom-");
        
        if (isCustomFrame && !isDraftBasedCustomFrame) {
          // Only try service for UUID-based frames (Supabase frames)
          console.log("🔄 Supabase custom frame detected, reloading from service...");
          try {
            const { getCustomFrameConfig } = await import(
              "../services/customFrameService.js"
            );
            const freshConfig = await getCustomFrameConfig(
              selectedFrameId || config?.id
            );
            if (freshConfig) {
              config = freshConfig;
              console.log(
                "✅ Reloaded custom frame from service with pixel values"
              );
            }
          } catch (error) {
            console.warn("⚠️ Failed to reload from service:", error);
          }
        } else if (isDraftBasedCustomFrame) {
          console.log("🎨 Draft-based custom frame detected (custom-xxx), will load from draft...");
          // Keep existing config from localStorage, or it will be loaded from draft in fallback
        }

        // Validate frameConfig timestamp to prevent stale cache
        if (config) {
          const storedTimestamp = safeStorage.getItem("frameConfigTimestamp");
          const configTimestamp = config.__timestamp;

          console.log("🕐 Timestamp validation:", {
            storedTimestamp,
            configTimestamp,
            match: storedTimestamp === String(configTimestamp),
          });

          // If timestamps don't match, frameConfig is stale
          if (
            storedTimestamp &&
            configTimestamp &&
            storedTimestamp !== String(configTimestamp)
          ) {
            console.warn(
              "⚠️ FrameConfig timestamp mismatch, clearing stale data"
            );
            safeStorage.removeItem("frameConfig");
            safeStorage.removeItem("frameConfigTimestamp");
            config = null;
          }
        }

        // CRITICAL FIX: If no config at all, try multiple fallbacks
        if (!config) {
          console.log(
            "⚠️ No frameConfig in localStorage, checking fallbacks..."
          );

          // Try to get selected frame ID
          const selectedFrameId = safeStorage.getItem("selectedFrame");
          console.log("  - Selected frame ID:", selectedFrameId);
          
          // Helper to detect UUID (Supabase custom frames)
          const isUUIDCheck = (str) => {
            if (typeof str !== 'string') return false;
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
          };
          
          // Check if it's a draft-based custom frame (custom-xxx) vs Supabase frame (UUID)
          const isDraftBased = selectedFrameId?.startsWith("custom-");
          const isSupabaseFrame = isUUIDCheck(selectedFrameId);

          // FALLBACK 1: For draft-based frames, ALWAYS try draft first
          if (isDraftBased && activeDraftId) {
            console.log("🔄 Draft-based custom frame, loading from draft first...");
            try {
              const draft = await loadDraftForRecovery();
              if (draft) {
                const { buildFrameConfigFromDraft } = await import(
                  "../utils/draftHelpers.js"
                );
                config = buildFrameConfigFromDraft(draft);
                console.log(
                  "✅ Successfully loaded frameConfig from draft:",
                  config.id
                );
              }
            } catch (error) {
              console.warn("⚠️ Failed to load from draft:", error);
            }
          }
          
          // FALLBACK 2: For Supabase frames, try custom frame service
          if (!config && isSupabaseFrame) {
            console.log("🔄 Attempting to load Supabase frame from service...");
            try {
              const { getCustomFrameConfig } = await import(
                "../services/customFrameService.js"
              );
              config = await getCustomFrameConfig(selectedFrameId);
              if (config) {
                console.log(
                  "✅ Successfully loaded custom frame from service:",
                  config.id
                );
              }
            } catch (error) {
              console.error(
                "❌ Failed to load from custom frame service:",
                error
              );
            }
          }

          // FALLBACK 3: Try to load from draft (if exists and not already tried)
          if (!config && activeDraftId && !isDraftBased) {
            try {
              console.log("🔄 Loading frameConfig from draft:", activeDraftId);
              const draft = await loadDraftForRecovery();

              if (draft) {
                const { buildFrameConfigFromDraft } = await import(
                  "../utils/draftHelpers.js"
                );
                config = buildFrameConfigFromDraft(draft);
                console.log(
                  "✅ Successfully loaded frameConfig from draft:",
                  config.id
                );

                // Try to save to localStorage for next time (might fail if too large)
                try {
                  safeStorage.setJSON("frameConfig", config);
                  safeStorage.setItem(
                    "frameConfigTimestamp",
                    String(Date.now())
                  );
                } catch (e) {
                  console.warn(
                    "⚠️ Could not cache frameConfig to localStorage:",
                    e
                  );
                }
              } else {
                console.warn("⚠️ Draft not found:", activeDraftId);
              }
            } catch (error) {
              console.warn("⚠️ Failed to load from draft:", error);
            }
          }

          if (!config) {
            console.warn("⚠️ All fallbacks failed - no frameConfig available");
          }
        }

        // If frameConfig exists but is incomplete (missing background photo image), try to enhance it from draft
        if (config && config.isCustom) {
          const backgroundPhoto = config.designer?.elements?.find(
            (el) => el?.type === "background-photo"
          );
          const needsReload = !backgroundPhoto || !backgroundPhoto.data?.image;

          if (needsReload) {
            console.log(
              "⚠️ Background photo missing or incomplete, loading from draft..."
            );
            console.log("  - Has background photo element:", !!backgroundPhoto);
            console.log("  - Has image data:", !!backgroundPhoto?.data?.image);

            if (activeDraftId) {
              try {
                const draft = await loadDraftForRecovery();

                if (draft && draft.elements) {
                  const draftBackgroundPhoto = draft.elements.find(
                    (el) => el?.type === "background-photo"
                  );
                  if (
                    draftBackgroundPhoto &&
                    draftBackgroundPhoto.data?.image
                  ) {
                    console.log(
                      "✅ Found background photo image in draft, restoring..."
                    );
                    console.log(
                      "  - Image length:",
                      draftBackgroundPhoto.data.image.length
                    );
                    console.log(
                      "  - Image preview:",
                      draftBackgroundPhoto.data.image.substring(0, 50)
                    );

                    // Rebuild frameConfig from draft to get complete data
                    const { buildFrameConfigFromDraft } = await import(
                      "../utils/draftHelpers.js"
                    );
                    config = buildFrameConfigFromDraft(draft);

                    // Try to save complete frameConfig back to localStorage (might fail if too large)
                    try {
                      safeStorage.setJSON("frameConfig", config);
                      console.log(
                        "✅ Saved complete frameConfig to localStorage"
                      );
                    } catch (storageError) {
                      console.warn(
                        "⚠️ Could not save frameConfig to localStorage (too large):",
                        storageError
                      );
                      // That's OK - we'll load from draft next time
                    }
                  } else {
                    console.warn(
                      "⚠️ No background photo with image found in draft"
                    );
                  }
                } else {
                  console.warn(
                    "⚠️ Draft not found or has no elements:",
                    activeDraftId
                  );
                }
              } catch (error) {
                console.error("❌ Failed to load from draft:", error);
              }
            } else {
              console.warn("⚠️ No activeDraftId found in localStorage");
            }
          } else {
            console.log(
              "✅ Background photo with image already present in frameConfig"
            );
          }
        }

        // Validasi: frameConfig harus ada dan punya id
        if (!config || !config.id) {
          showToast({
            type: "error",
            title: "Frame Tidak Valid",
            message:
              "Pilih frame terlebih dahulu di halaman Frames atau ambil foto baru.",
            action: {
              label: "Pilih Frame",
              onClick: () => navigate("/frames"),
            },
          });
          navigate("/frames");
          return;
        }

        setFrameConfig(config);
        // Log detail frameConfig untuk debug
        console.log("✅ Loaded frame config:", config.id);
        console.log("📋 Frame details:", config);

        // Log admin vs custom frame detection
        if (!config.isCustom) {
          console.log("🖼️ ADMIN FRAME DETECTED (isCustom is false/undefined):");
          console.log("  - Frame ID:", config.id);
          console.log("  - Frame name:", config.name);
          console.log("  - Has frameImage:", !!config.frameImage);
          console.log("  - frameImage preview:", config.frameImage?.substring(0, 80));
          console.log("  → Frame overlay WILL be displayed on canvas");
        }

        // Extra logging for custom frames
        if (config.isCustom) {
          console.log("🎨 CUSTOM FRAME DETECTED:");
          console.log("  - Frame ID:", config.id);
          console.log("  - Frame name:", config.name);
          console.log("  - Max captures:", config.maxCaptures);
          console.log("  - Has frameImage:", !!config.frameImage);
          console.log("  - Has imagePath:", !!config.imagePath);
          console.log(
            "  - Frame image preview:",
            config.frameImage?.substring(0, 50)
          );
          console.log("  - Slots count:", config.slots?.length);
          console.log(
            "  - Designer elements:",
            config.designer?.elements?.length
          );

          // CRITICAL FIX: If custom frame missing designer.elements, rebuild from slots
          if (!config.designer?.elements && config.slots?.length > 0) {
            console.log(
              "⚠️ Custom frame missing designer.elements, rebuilding from slots..."
            );
            const photoElements = config.slots.map((slot, index) => ({
              id: slot.id || `photo_${index + 1}`,
              type: "photo",
              x: slot.left,
              y: slot.top,
              width: slot.width,
              height: slot.height,
              zIndex: slot.zIndex || 2,
              data: {
                photoIndex:
                  slot.photoIndex !== undefined ? slot.photoIndex : index,
                image: null,
                aspectRatio: slot.aspectRatio || "4:5",
              },
            }));

            config = {
              ...config,
              designer: {
                ...config.designer,
                elements: photoElements,
              },
            };

            setFrameConfig(config);
            console.log("✅ Rebuilt designer.elements:", photoElements.length);
          }
        }

        // Load designer elements (unified layering system)
        // Support both custom frames and regular frames (converted from slots)
        if (Array.isArray(config.designer?.elements)) {
          // Log resolvedPhotos status BEFORE using it
          console.log("📸 [PHOTO FILL] resolvedPhotos available:", resolvedPhotos.length);
          if (resolvedPhotos.length > 0) {
            console.log("📸 [PHOTO FILL] First photo preview:", resolvedPhotos[0]?.substring?.(0, 50) || "not a string");
          } else {
            // EMERGENCY: Try to reload from localStorage one more time
            console.warn("⚠️ [EMERGENCY RELOAD] resolvedPhotos is empty, trying localStorage again...");
            try {
              const emergencyRaw = localStorage.getItem("capturedPhotos");
              if (emergencyRaw) {
                const emergencyPhotos = JSON.parse(emergencyRaw);
                if (Array.isArray(emergencyPhotos) && emergencyPhotos.length > 0) {
                  console.log("✅ [EMERGENCY RELOAD] Found photos:", emergencyPhotos.length);
                  // Normalize them
                  resolvedPhotos = emergencyPhotos.map((photo) => {
                    if (typeof photo === 'string' && photo.startsWith('data:')) return photo;
                    if (photo?.dataUrl && typeof photo.dataUrl === 'string') return photo.dataUrl;
                    return null;
                  }).filter(Boolean);
                  console.log("✅ [EMERGENCY RELOAD] Normalized to:", resolvedPhotos.length, "photos");
                  // Also update state
                  if (resolvedPhotos.length > 0) {
                    setPhotos(resolvedPhotos);
                  }
                }
              }
            } catch (err) {
              console.error("❌ [EMERGENCY RELOAD] Failed:", err);
            }
          }
          
          // DEBUG: Log ALL elements in config.designer.elements
          console.log("🔍 ALL designer elements from config:", {
            total: config.designer.elements.length,
            elements: config.designer.elements.map((el, i) => ({
              index: i,
              type: el?.type,
              id: el?.id?.slice(0, 8),
              x: el?.x,
              y: el?.y,
              width: el?.width,
              height: el?.height,
            })),
          });
          
          // Extract photo elements and convert to uploads
          const photoElements = config.designer.elements.filter(
            (el) => el?.type === "photo"
          );
          console.log("📸 Found photo elements:", photoElements.length);
          photoElements.forEach((el, idx) => {
            console.log(`   Photo ${idx}:`, {
              id: el.id,
              type: el.type,
              photoIndex: el.data?.photoIndex,
              hasImage: !!el.data?.image,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
            });
          });

          const photoAsUploadElements = photoElements.map((photoEl, idx) => {
            // CRITICAL FIX: Use idx as fallback when photoIndex is out of range
            // This handles buggy slot data where photoIndex might be wrong (e.g., 2,3 instead of 0,1)
            let photoIndex = photoEl.data?.photoIndex;
            
            // Validate photoIndex - if it's undefined or out of range, use idx instead
            if (photoIndex === undefined || photoIndex >= resolvedPhotos.length) {
              console.warn(`⚠️ Invalid photoIndex ${photoIndex} for slot ${idx}, using idx as fallback`);
              photoIndex = idx;
            }
            
            // Try to get photo data directly from resolvedPhotos (loaded earlier)
            let photoData = resolvedPhotos[photoIndex];
            
            // Extra safety: ensure photoData is a string
            if (photoData && typeof photoData !== 'string') {
              if (photoData.dataUrl && typeof photoData.dataUrl === 'string') {
                photoData = photoData.dataUrl;
              } else if (photoData.previewUrl && typeof photoData.previewUrl === 'string' && photoData.previewUrl.startsWith('data:')) {
                photoData = photoData.previewUrl;
              } else {
                console.warn(`⚠️ Photo slot ${idx}: Data is not a string, skipping:`, typeof photoData);
                photoData = null;
              }
            }
            
            // DEBUG: Log original element coordinates as plain string for easy reading
            console.log(`🖼️ Setting up photo slot ${idx}: photoIndex=${photoIndex}, hasPhotoData=${!!photoData}, originalX=${photoEl.x}, originalY=${photoEl.y}, originalWidth=${photoEl.width}, originalHeight=${photoEl.height}, originalZIndex=${photoEl.zIndex}`);
            
            return {
              ...photoEl,
              type: "upload", // Convert to upload for unified rendering
              data: {
                ...photoEl.data,
                image: photoData || null, // Fill with actual photo data!
                photoIndex,
              },
            };
          });

          // Get other designer elements (text, shapes, uploads)
          const otherDesignerElems = config.designer.elements.filter(
            (el) =>
              el &&
              el.type !== "photo" &&
              el.type !== "background-photo" &&
              !el?.data?.__capturedOverlay
          );

          // Combine all elements
          const allDesignerElements = [
            ...photoAsUploadElements,
            ...otherDesignerElems,
          ];
          setDesignerElements(allDesignerElements);
          console.log(
            "✅ Loaded designer elements:",
            allDesignerElements.length
          );

          // Load background photo
          const backgroundPhoto = config.designer.elements.find(
            (el) => el?.type === "background-photo"
          );
          if (backgroundPhoto) {
            // Verify background photo has image
            if (backgroundPhoto.data?.image) {
              setBackgroundPhotoElement(backgroundPhoto);
              console.log("✅ Loaded background photo with image:", {
                id: backgroundPhoto.id,
                hasImage: !!backgroundPhoto.data?.image,
                imageLength: backgroundPhoto.data?.image?.length,
                imagePreview: backgroundPhoto.data?.image?.substring(0, 50),
                zIndex: backgroundPhoto.zIndex,
                x: backgroundPhoto.x,
                y: backgroundPhoto.y,
                width: backgroundPhoto.width,
                height: backgroundPhoto.height,
              });
            } else {
              console.warn("⚠️ Background photo found but missing image data!");
              console.log(
                "   This might happen if localStorage was cleared or data was sanitized"
              );
              console.log("   Background photo will not be displayed");
              setBackgroundPhotoElement(null);
            }
          } else {
            console.warn(
              "⚠️ No background photo found in frameConfig.designer.elements"
            );
            console.log(
              "   Elements found:",
              config.designer.elements.map((el) => ({
                type: el.type,
                id: el.id,
              }))
            );
            
            // FALLBACK: Try to create background-photo from frameImage or imagePath
            const fallbackImageUrl = config.frameImage || config.imagePath || config.thumbnailUrl || config.image_url;
            if (fallbackImageUrl) {
              console.log("🔄 Creating background-photo from fallback URL:", fallbackImageUrl.substring(0, 80) + "...");
              const fallbackBackgroundPhoto = {
                id: "background-photo-fallback",
                type: "background-photo",
                x: 0,
                y: 0,
                width: 1080,
                height: 1920,
                zIndex: 0,
                data: {
                  image: fallbackImageUrl,
                  objectFit: "cover",
                  label: "Frame Background (fallback)",
                }
              };
              setBackgroundPhotoElement(fallbackBackgroundPhoto);
              console.log("✅ Created fallback background-photo element");
            } else {
              console.warn("⚠️ No fallback image URL available (frameImage, imagePath, thumbnailUrl, image_url)");
              setBackgroundPhotoElement(null);
            }
          }
        } else {
          console.warn("⚠️ No designer.elements found in frameConfig");
          console.log("📋 Available properties:", Object.keys(config));
          
          // FALLBACK: Create designer elements from config.slots if available
          if (Array.isArray(config.slots) && config.slots.length > 0) {
            console.log("🔄 Creating designer elements from slots...");
            const canvasWidth = config.layout?.canvasWidth || config.designer?.canvasWidth || 1080;
            const canvasHeight = config.layout?.canvasHeight || config.designer?.canvasHeight || 1920;
            
            const photoElementsFromSlots = config.slots.map((slot, idx) => {
              // Convert normalized coordinates (0-1) to pixels
              const x = (slot.left || 0) * canvasWidth;
              const y = (slot.top || 0) * canvasHeight;
              const width = (slot.width || 0.5) * canvasWidth;
              const height = (slot.height || 0.5) * canvasHeight;
              
              // Get photo data
              const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : idx;
              let photoData = resolvedPhotos[photoIndex];
              
              // Normalize photo data
              if (photoData && typeof photoData !== 'string') {
                if (photoData.dataUrl) photoData = photoData.dataUrl;
                else if (photoData.previewUrl) photoData = photoData.previewUrl;
                else photoData = null;
              }
              
              console.log(`   Slot ${idx}: x=${x.toFixed(0)}, y=${y.toFixed(0)}, w=${width.toFixed(0)}, h=${height.toFixed(0)}, photoIndex=${photoIndex}, hasPhoto=${!!photoData}`);
              
              return {
                id: slot.id || `photo_slot_${idx}`,
                type: "upload", // Use upload type for rendering
                x,
                y,
                width,
                height,
                zIndex: slot.zIndex || 2,
                rotation: slot.rotation || 0,
                data: {
                  photoIndex,
                  image: photoData || null,
                  aspectRatio: slot.aspectRatio || "4:5",
                  borderRadius: slot.borderRadius || 24,
                },
              };
            });
            
            setDesignerElements(photoElementsFromSlots);
            console.log("✅ Created", photoElementsFromSlots.length, "designer elements from slots");
          } else {
            console.warn("⚠️ No slots found either - frame may be incomplete");
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("❌ Error loading data:", error);
        setLoading(false);
      }
    };

    loadFrameData();
  }, [navigate]);

  // Fill photo elements with real captured photos
  useEffect(() => {
    console.log("🔄 [FILL PHOTOS] useEffect triggered");
    console.log("   - designerElements.length:", designerElements.length);
    console.log("   - photos.length:", photos.length);
    console.log("   - photosFilled.current:", photosFilled.current);
    
    if (designerElements.length === 0 || photos.length === 0) {
      console.log("⏭️ Skipping photo fill:", {
        hasElements: designerElements.length > 0,
        hasPhotos: photos.length > 0,
        photosFilled: photosFilled.current,
      });
      return;
    }

    console.log("🔄 Checking if photo elements need filling...");
    console.log("   Designer elements:", designerElements.length);
    console.log("   Available photos:", photos.length);
    console.log(
      "   Elements detail:",
      designerElements.map((el) => ({
        id: el.id?.slice(0, 8),
        type: el.type,
        photoIndex: el.data?.photoIndex,
        hasImage: !!el.data?.image,
      }))
    );

    // Check if any elements need filling - support both "upload" and "photo" types
    // CRITICAL FIX: Also include photo elements WITHOUT photoIndex (they will get auto-assigned)
    const photoSlots = designerElements.filter(
      (el) => el.type === "upload" || el.type === "photo"
    );

    const needsFilling = photoSlots.some((el) => !el.data?.image);

    if (!needsFilling) {
      console.log("✅ All photo elements already filled");
      photosFilled.current = true;
      return;
    }

    // Prevent infinite loop - only fill once
    if (photosFilled.current) {
      console.log("⏭️ Photos already filled, skipping to prevent loop...");
      return;
    }

    console.log("🔄 Filling photo elements with real images...");
    console.log(`   Found ${photoSlots.length} photo slots`);

    // Build a map of photo slots for auto-index assignment
    let photoSlotCounter = 0;
    
    const updatedElements = designerElements.map((el, idx) => {
      // Support both "upload" (built-in frames) and "photo" (custom frames) types
      if (el.type === "upload" || el.type === "photo") {
        // CRITICAL FIX: Auto-assign photoIndex if not defined, using sequential counter
        let photoIndex = el.data?.photoIndex;
        
        // If photoIndex is not defined or not a number, use the sequential counter
        if (typeof photoIndex !== "number") {
          photoIndex = photoSlotCounter;
          console.log(`📌 Auto-assigning photoIndex ${photoIndex} to slot (no photoIndex defined)`);
        }
        
        // If photoIndex is out of range, use the sequential counter
        if (photoIndex >= photos.length) {
          console.warn(`⚠️ photoIndex ${photoIndex} out of range (max: ${photos.length - 1}), using counter ${photoSlotCounter}`);
          photoIndex = photoSlotCounter;
        }
        
        // Increment counter for next photo slot
        photoSlotCounter++;
        
        // Skip if no more photos available
        if (photoIndex >= photos.length) {
          console.warn(`⚠️ No photo available for slot ${photoIndex}`);
          return el;
        }
        
        let photoData = photos[photoIndex];
        
        // Extra normalization in case photos weren't normalized at load time
        if (photoData && typeof photoData !== 'string') {
          if (photoData.dataUrl && typeof photoData.dataUrl === 'string') {
            photoData = photoData.dataUrl;
          } else if (photoData.previewUrl && typeof photoData.previewUrl === 'string' && photoData.previewUrl.startsWith('data:')) {
            photoData = photoData.previewUrl;
          } else {
            console.warn(`⚠️ Photo slot ${photoIndex}: Invalid format, not a string or object with dataUrl`);
            photoData = null;
          }
        }
        
        if (photoData && typeof photoData === 'string') {
          console.log(`✅ Filling photo slot ${photoIndex} with image`);
          console.log(`   Photo data length: ${photoData.length}`);
          console.log(
            `   Photo data preview: ${photoData.substring(0, 50)}...`
          );
          return {
            ...el,
            data: { ...el.data, image: photoData, photoIndex }, // Update photoIndex to corrected value
          };
        } else {
          console.warn(`⚠️ No photo data found for slot ${photoIndex}`);
          console.warn(
            `   Available photos: ${photos.length}, requested index: ${photoIndex}`
          );
        }
      }
      return el;
    });

    console.log("📝 Setting updated elements with photos...");
    setDesignerElements(updatedElements);
    photosFilled.current = true;
    console.log("✅ Photo fill complete!");
  }, [photos, designerElements]);

  // EMERGENCY: Retry loading photos if designerElements exist but photos are empty
  useEffect(() => {
    // Only run if we have elements but no photos
    if (designerElements.length === 0 || photos.length > 0) {
      return;
    }
    
    // Only retry once
    if (photosFilled.current) {
      return;
    }
    
    console.log("🆘 [EMERGENCY PHOTO RETRY] designerElements exist but photos empty, retrying...");
    
    const retryLoadPhotos = async () => {
      // Wait a bit for storage to settle
      await new Promise(r => setTimeout(r, 500));
      
      // Try multiple sources
      let foundPhotos = [];
      
      // Source 1: Direct localStorage
      try {
        const raw = localStorage.getItem("capturedPhotos");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log("🆘 [RETRY] Found photos in localStorage:", parsed.length);
            foundPhotos = parsed.map(p => {
              if (typeof p === 'string' && p.startsWith('data:')) return p;
              if (p?.dataUrl?.startsWith?.('data:')) return p.dataUrl;
              return null;
            }).filter(Boolean);
          }
        }
      } catch (e) {
        console.warn("🆘 [RETRY] localStorage parse failed:", e);
      }
      
      // Source 2: safeStorage (compressed)
      if (foundPhotos.length === 0) {
        try {
          const safePhotos = safeStorage.getJSON("capturedPhotos");
          if (Array.isArray(safePhotos) && safePhotos.length > 0) {
            console.log("🆘 [RETRY] Found photos in safeStorage:", safePhotos.length);
            foundPhotos = safePhotos.map(p => {
              if (typeof p === 'string' && p.startsWith('data:')) return p;
              if (p?.dataUrl?.startsWith?.('data:')) return p.dataUrl;
              return null;
            }).filter(Boolean);
          }
        } catch (e) {
          console.warn("🆘 [RETRY] safeStorage read failed:", e);
        }
      }
      
      // Source 3: window backup
      if (foundPhotos.length === 0 && window.__fremio_photos?.length > 0) {
        console.log("🆘 [RETRY] Found photos in window.__fremio_photos:", window.__fremio_photos.length);
        foundPhotos = window.__fremio_photos.map(p => {
          if (typeof p === 'string' && p.startsWith('data:')) return p;
          if (p?.dataUrl?.startsWith?.('data:')) return p.dataUrl;
          return null;
        }).filter(Boolean);
      }
      
      if (foundPhotos.length > 0) {
        console.log("✅ [RETRY] Successfully recovered", foundPhotos.length, "photos!");
        setPhotos(foundPhotos);
      } else {
        console.warn("❌ [RETRY] Still no photos found after retry");
      }
    };
    
    retryLoadPhotos();
  }, [designerElements, photos]);

  // Debug log for videos state
  useEffect(() => {
    console.log("🎥 Videos state updated:", {
      videos,
      isArray: Array.isArray(videos),
      length: videos?.length || 0,
      hasValidVideo,
      buttonWillBeEnabled: hasValidVideo && !isSaving,
    });
  }, [videos, hasValidVideo, isSaving]);

  // Filter presets (9 filters - no Cool Tone, no blur)
  const filterPresets = [
    {
      name: "Original",
      icon: "📷",
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    },
    {
      name: "Black & White",
      icon: "⚫",
      filters: {
        brightness: 100,
        contrast: 115,
        saturate: 0,
        grayscale: 100,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    },
    {
      name: "Sepia",
      icon: "🟤",
      filters: {
        brightness: 110,
        contrast: 90,
        saturate: 80,
        grayscale: 0,
        sepia: 70,
        blur: 0,
        hueRotate: 0,
      },
    },
    {
      name: "Warm Tone",
      icon: "🌅",
      filters: {
        brightness: 108,
        contrast: 98,
        saturate: 115,
        grayscale: 0,
        sepia: 15,
        blur: 0,
        hueRotate: 15,
      },
    },
    {
      name: "High Contrast",
      icon: "⚡",
      filters: {
        brightness: 105,
        contrast: 140,
        saturate: 120,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    },
    {
      name: "Soft Light",
      icon: "☁️",
      filters: {
        brightness: 110,
        contrast: 85,
        saturate: 90,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    },
    {
      name: "Vivid",
      icon: "🌈",
      filters: {
        brightness: 110,
        contrast: 125,
        saturate: 160,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    },
    {
      name: "Fade",
      icon: "🌫️",
      filters: {
        brightness: 108,
        contrast: 75,
        saturate: 85,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    },
    {
      name: "Grayscale",
      icon: "⬜",
      filters: {
        brightness: 105,
        contrast: 100,
        saturate: 0,
        grayscale: 100,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    },
  ];

  const applyFilterPreset = (preset) => {
    setFilters(preset.filters);
    setActiveFilter(preset.name);
  };

  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturate: 100,
      grayscale: 0,
      sepia: 0,
      blur: 0,
      hueRotate: 0,
    });
    setActiveFilter(null);
  };

  const getFilterStyle = () => {
    return {
      filter: `
        brightness(${filters.brightness}%)
        contrast(${filters.contrast}%)
        saturate(${filters.saturate}%)
        grayscale(${filters.grayscale}%)
        sepia(${filters.sepia}%)
        blur(${filters.blur}px)
        hue-rotate(${filters.hueRotate}deg)
      `.trim(),
    };
  };

  // Save function
  const handleSave = async () => {
    if (!frameConfig) {
      showToast({
        type: "error",
        title: "Tidak Ada Frame",
        message: "Silakan pilih frame terlebih dahulu.",
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage("Saving...");

    try {
      const previewCanvas = document.getElementById("frame-preview-canvas");
      if (!previewCanvas) {
        throw new Error("Preview canvas not found");
      }

      // Capture with html2canvas - use adaptive scale for better quality
      const dpr = window.devicePixelRatio || 2;
      const canvas = await html2canvas(previewCanvas, {
        scale: Math.max(2, dpr),
        backgroundColor: frameConfig.designer?.canvasBackground || "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 0,
      });

      const imageData = canvas.toDataURL("image/png");

      // Save to localStorage
      const timestamp = Date.now();
      const savedImages = safeStorage.getJSON("savedImages") || [];
      savedImages.push({
        id: timestamp,
        frameId: frameConfig.id,
        image: imageData,
        timestamp,
        photos: photos.length,
      });
      safeStorage.setJSON("savedImages", savedImages);

      setSaveMessage("✅ Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving:", error);
      setSaveMessage("❌ Failed to save");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fdf7f4",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "2rem",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fdf7f4",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem",
        paddingTop: "0.5rem",
      }}
    >
      {/* Debug Info: Show if frameConfig or photos missing */}
      {(!frameConfig || photos.length === 0) && (
        <div
          style={{
            background: "#fff7ed",
            color: "#b45309",
            border: "1px solid #fbbf24",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
            maxWidth: "600px",
            fontSize: "0.95rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <strong>Debug Info:</strong>
          <div>
            frameConfig: {JSON.stringify(safeStorage.getJSON("frameConfig"))}
          </div>
          <div>
            frameConfigTimestamp:{" "}
            {String(safeStorage.getItem("frameConfigTimestamp"))}
          </div>
          <div>
            capturedPhotos:{" "}
            {JSON.stringify(safeStorage.getJSON("capturedPhotos"))}
          </div>
          <div>
            activeDraftId: {String(safeStorage.getItem("activeDraftId"))}
          </div>
        </div>
      )}

      {/* Preview Title */}
      <h1
        style={{
          fontSize: "1.2rem",
          fontWeight: "700",
          color: "#000000",
          marginBottom: "0.75rem",
          marginTop: "0.5rem",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        Preview
      </h1>

      {/* Save Message */}
      {saveMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "1rem 1.5rem",
            borderRadius: "8px",
            fontSize: "0.9rem",
            background: saveMessage.includes("✅") ? "#d4edda" : "#f8d7da",
            color: saveMessage.includes("✅") ? "#155724" : "#721c24",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          {saveMessage}
        </div>
      )}

      {/* Photo Preview */}
      {frameConfig && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            width: "100%",
            maxWidth: "900px",
          }}
        >
          {/* Frame Canvas Container */}
          <div
            style={{
              background: "white",
              padding: "1rem",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              overflow: "hidden",
              width: "fit-content",
              height: `${1920 * 0.25 + 32}px`,
            }}
          >
            {/* Frame Canvas */}
            <div
              id="frame-preview-canvas"
              style={{
                position: "relative",
                width: "1080px",
                height: "1920px",
                margin: "0 auto",
                background:
                  frameConfig && frameConfig.designer
                    ? frameConfig.designer.canvasBackground || "#fff"
                    : "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                overflow: "hidden",
                transform: "scale(0.25)",
                transformOrigin: "top center",
              }}
            >
              {/* LAYER 1: Background Photo */}
              {backgroundPhotoElement && backgroundPhotoElement.data?.image && (
                <img
                  src={imagePresets.full(backgroundPhotoElement.data.image)}
                  alt="Background"
                  loading="eager"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    zIndex: BACKGROUND_PHOTO_Z,
                    ...getFilterStyle(),
                  }}
                  onError={(e) => {
                    // Fallback to original if CDN fails
                    if (!e.target.dataset.fallback) {
                      e.target.dataset.fallback = 'true';
                      e.target.src = backgroundPhotoElement.data.image;
                    }
                  }}
                />
              )}

              {/* LAYER 2 & 3: Designer Elements (photos as uploads, text, shapes, real uploads) */}
              {designerElements &&
                designerElements.length > 0 &&
                designerElements.map((element, idx) => {
                  if (!element || !element.type) return null;
                  
                  // DEBUG: Log each element being rendered
                  console.log(`🎨 Rendering element ${idx}:`, {
                    type: element.type,
                    id: element.id?.slice(0, 8),
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                    zIndex: element.zIndex,
                    hasImage: !!element.data?.image,
                    photoIndex: element.data?.photoIndex,
                  });
                  
                  const elemZIndex = Number.isFinite(element.zIndex)
                    ? element.zIndex
                    : 200 + idx;

                  // Render text
                  if (element.type === "text") {
                    return (
                      <div
                        key={`element-${element.id || idx}`}
                        style={{
                          position: "absolute",
                          left: `${element.x || 0}px`,
                          top: `${element.y || 0}px`,
                          width: `${element.width || 100}px`,
                          height: `${element.height || 100}px`,
                          zIndex: elemZIndex,
                          pointerEvents: "none",
                          fontFamily: element.data?.fontFamily || "Inter",
                          fontSize: `${element.data?.fontSize || 24}px`,
                          color: element.data?.color || "#111827",
                          fontWeight: element.data?.fontWeight || 500,
                          textAlign: element.data?.align || "left",
                          display: "flex",
                          alignItems:
                            element.data?.verticalAlign === "middle"
                              ? "center"
                              : element.data?.verticalAlign === "bottom"
                              ? "flex-end"
                              : "flex-start",
                          justifyContent:
                            element.data?.align === "center"
                              ? "center"
                              : element.data?.align === "right"
                              ? "flex-end"
                              : "flex-start",
                        }}
                      >
                        {element.data?.text || ""}
                      </div>
                    );
                  }

                  // Render shape
                  if (element.type === "shape") {
                    return (
                      <div
                        key={`element-${element.id || idx}`}
                        style={{
                          position: "absolute",
                          left: `${element.x || 0}px`,
                          top: `${element.y || 0}px`,
                          width: `${element.width || 100}px`,
                          height: `${element.height || 100}px`,
                          zIndex: elemZIndex,
                          pointerEvents: "none",
                          background: element.data?.fill || "#000",
                          borderRadius:
                            element.data?.shape === "circle"
                              ? "50%"
                              : `${element.data?.borderRadius || 0}px`,
                          opacity:
                            element.data?.opacity !== undefined
                              ? element.data.opacity
                              : 1,
                        }}
                      />
                    );
                  }

                  // Render upload (including converted photos) - support both "upload" and "photo" types
                  if (element.type === "upload" || element.type === "photo") {
                    const hasImage = !!element.data?.image;
                    const isPhotoSlot =
                      typeof element.data?.photoIndex === "number";

                    // DEBUG: Log photo slot rendering - print values directly for easy reading
                    console.log(`📷 Photo slot render: hasImage=${hasImage}, isPhotoSlot=${isPhotoSlot}, x=${element.x}, y=${element.y}, width=${element.width}, height=${element.height}, zIndex=${elemZIndex}`);

                    if (!hasImage && isPhotoSlot) {
                      console.warn(
                        `⚠️ Photo slot ${element.data.photoIndex} missing image!`
                      );
                    }

                    if (!hasImage) {
                      // Render placeholder for empty photo slots
                      return (
                        <div
                          key={`element-${element.id || idx}`}
                          style={{
                            position: "absolute",
                            left: `${element.x || 0}px`,
                            top: `${element.y || 0}px`,
                            width: `${element.width || 100}px`,
                            height: `${element.height || 100}px`,
                            zIndex: elemZIndex,
                            pointerEvents: "none",
                            borderRadius: `${
                              element.data?.borderRadius || 24
                            }px`,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f3f4f6",
                            border: "2px dashed #d1d5db",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "48px",
                              color: "#9ca3af",
                            }}
                          >
                            📷
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`element-${element.id || idx}`}
                        style={{
                          position: "absolute",
                          left: `${element.x || 0}px`,
                          top: `${element.y || 0}px`,
                          width: `${element.width || 100}px`,
                          height: `${element.height || 100}px`,
                          zIndex: elemZIndex,
                          pointerEvents: "none",
                          borderRadius: `${element.data?.borderRadius || 24}px`,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent", // ✅ Changed from '#fff' to support transparent PNGs
                        }}
                      >
                        <img
                          src={element.data.image}
                          alt={
                            element.data?.photoIndex !== undefined
                              ? `Photo ${element.data.photoIndex + 1}`
                              : "Upload"
                          }
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover", // Back to cover - transparency preserved in PNG format
                            display: "block",
                            ...getFilterStyle(),
                          }}
                        />
                      </div>
                    );
                  }

                  return null;
                })}

              {/* LAYER 4: Frame Overlay (frameImage) - Always on top */}
              {/* For custom frames (isCustom=true), DON'T render frameImage as overlay */}
              {/* because frameImage is just a JPEG preview/thumbnail, not a transparent overlay */}
              {/* Custom frames use designerElements to render text/shapes/etc instead */}
              {frameConfig && frameConfig.frameImage && !frameConfig.isCustom && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 9999,
                    pointerEvents: "none",
                  }}
                >
                  <img
                    src={frameConfig.frameImage}
                    alt="Frame Overlay"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Filter Buttons */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: "0.5rem",
              scrollbarWidth: "thin",
              scrollbarColor: "#D1D5DB #F3F4F6",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {filterPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyFilterPreset(preset)}
                style={{
                  padding: "0.5rem 0.75rem",
                  background:
                    activeFilter === preset.name ? "#4F46E5" : "white",
                  color: activeFilter === preset.name ? "white" : "#333",
                  border: `2px solid ${
                    activeFilter === preset.name ? "#4F46E5" : "#E5E7EB"
                  }`,
                  borderRadius: "10px",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.2rem",
                  minWidth: "75px",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (activeFilter !== preset.name) {
                    e.target.style.borderColor = "#D1D5DB";
                    e.target.style.background = "#F9FAFB";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilter !== preset.name) {
                    e.target.style.borderColor = "#E5E7EB";
                    e.target.style.background = "white";
                  }
                }}
              >
                <span style={{ fontSize: "1.3rem" }}>{preset.icon}</span>
                <span style={{ fontSize: "0.7rem" }}>{preset.name}</span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              width: "100%",
              maxWidth: "400px",
              marginTop: "1rem",
              justifyContent: "center",
            }}
          >
            <button
              style={{
                padding: "0.75rem 1.5rem",
                background: "#3B82F6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                cursor: "pointer",
                fontWeight: "600",
              }}
              onClick={async () => {
                console.log("🎨 Memulai download dengan canvas manual...");

                try {
                  // Buat canvas baru
                  const canvas = document.createElement("canvas");
                  canvas.width = 1080;
                  canvas.height = 1920;
                  const ctx = canvas.getContext("2d", { alpha: true }); // ✅ Enable alpha for transparency

                  // Background color
                  ctx.fillStyle =
                    frameConfig?.designer?.canvasBackground || "#ffffff";
                  ctx.fillRect(0, 0, 1080, 1920);

                  // Helper function untuk object-fit: cover
                  const drawImageCover = (ctx, img, x, y, w, h) => {
                    const imgRatio = img.width / img.height;
                    const boxRatio = w / h;

                    let sourceX = 0,
                      sourceY = 0,
                      sourceW = img.width,
                      sourceH = img.height;

                    if (imgRatio > boxRatio) {
                      // Image lebih lebar, crop kiri-kanan
                      sourceW = img.height * boxRatio;
                      sourceX = (img.width - sourceW) / 2;
                    } else {
                      // Image lebih tinggi, crop atas-bawah
                      sourceH = img.width / boxRatio;
                      sourceY = (img.height - sourceH) / 2;
                    }

                    ctx.drawImage(
                      img,
                      sourceX,
                      sourceY,
                      sourceW,
                      sourceH,
                      x,
                      y,
                      w,
                      h
                    );
                  };

                  // ✅ Helper function untuk object-fit: contain (untuk transparent PNGs)
                  const drawImageContain = (ctx, img, x, y, w, h) => {
                    const imgRatio = img.width / img.height;
                    const boxRatio = w / h;

                    let drawW = w;
                    let drawH = h;
                    let drawX = x;
                    let drawY = y;

                    if (imgRatio > boxRatio) {
                      // Image lebih lebar, fit to width
                      drawH = w / imgRatio;
                      drawY = y + (h - drawH) / 2;
                    } else {
                      // Image lebih tinggi, fit to height
                      drawW = h * imgRatio;
                      drawX = x + (w - drawW) / 2;
                    }

                    ctx.drawImage(
                      img,
                      0,
                      0,
                      img.width,
                      img.height,
                      drawX,
                      drawY,
                      drawW,
                      drawH
                    );
                  };

                  // Load dan draw background photo
                  if (
                    backgroundPhotoElement &&
                    backgroundPhotoElement.data?.image
                  ) {
                    const bgImg = new Image();
                    bgImg.crossOrigin = "anonymous";
                    await new Promise((resolve, reject) => {
                      bgImg.onload = () => {
                        ctx.save();
                        // Apply filters
                        ctx.filter = `
                          brightness(${filters.brightness}%)
                          contrast(${filters.contrast}%)
                          saturate(${filters.saturate}%)
                          grayscale(${filters.grayscale}%)
                          sepia(${filters.sepia}%)
                          blur(${filters.blur}px)
                          hue-rotate(${filters.hueRotate}deg)
                        `.trim();
                        // Draw dengan object-fit: cover
                        drawImageCover(ctx, bgImg, 0, 0, 1080, 1920);
                        ctx.restore();
                        resolve();
                      };
                      bgImg.onerror = reject;
                      // Use original URL for download (full quality)
                      bgImg.src = getOriginalUrl(backgroundPhotoElement.data.image);
                    });
                  }

                  // Sort designer elements by z-index to draw in correct order
                  const sortedElements = [...designerElements].sort((a, b) => {
                    const zIndexA = Number.isFinite(a?.zIndex) ? a.zIndex : 200;
                    const zIndexB = Number.isFinite(b?.zIndex) ? b.zIndex : 200;
                    return zIndexA - zIndexB;
                  });

                  console.log("🔍 DOWNLOAD DEBUG - Designer Elements:");
                  designerElements.forEach((el, i) => {
                    console.log(`  Slot ${i}:`, {
                      type: el.type,
                      x: el.x,
                      y: el.y,
                      width: el.width,
                      height: el.height,
                      hasImage: !!el.data?.image,
                      imagePreview: el.data?.image ? el.data.image.substring(0, 50) + '...' : 'none',
                      photoIndex: el.data?.photoIndex,
                    });
                  });

                  console.log(
                    "📊 Rendering elements in order:",
                    sortedElements.map((el) => ({
                      type: el.type,
                      id: el.id?.slice(0, 8),
                      zIndex: el.zIndex,
                      text: el.type === "text" ? el.data?.text : undefined,
                    }))
                  );

                  // Draw designer elements
                  for (const element of sortedElements) {
                    if (!element || !element.type) continue;

                    console.log(`🎨 DOWNLOAD: Drawing element type=${element.type}, hasImage=${!!element.data?.image}`);

                    // Support both "upload" and "photo" types for custom frames
                    if ((element.type === "upload" || element.type === "photo") && element.data?.image) {
                      console.log(`  ✅ Drawing photo/upload at x=${element.x}, y=${element.y}, w=${element.width}, h=${element.height}`);
                      const img = new Image();
                      img.crossOrigin = "anonymous";
                      await new Promise((resolve, reject) => {
                        img.onload = () => {
                          console.log(`  📸 Image loaded successfully, drawing to canvas...`);
                          ctx.save();

                          // ✅ Reset context for proper transparency handling
                          ctx.globalAlpha = 1;
                          ctx.globalCompositeOperation = "source-over";

                          // Apply filters
                          ctx.filter = `
                            brightness(${filters.brightness}%)
                            contrast(${filters.contrast}%)
                            saturate(${filters.saturate}%)
                            grayscale(${filters.grayscale}%)
                            sepia(${filters.sepia}%)
                            blur(${filters.blur}px)
                            hue-rotate(${filters.hueRotate}deg)
                          `.trim();

                          // Clip untuk border radius
                          const x = element.x || 0;
                          const y = element.y || 0;
                          const w = element.width || 100;
                          const h = element.height || 100;
                          const r = element.data?.borderRadius || 24;

                          ctx.beginPath();
                          ctx.moveTo(x + r, y);
                          ctx.lineTo(x + w - r, y);
                          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                          ctx.lineTo(x + w, y + h - r);
                          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                          ctx.lineTo(x + r, y + h);
                          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                          ctx.lineTo(x, y + r);
                          ctx.quadraticCurveTo(x, y, x + r, y);
                          ctx.closePath();
                          ctx.clip();

                          // Use cover - transparency preserved in PNG format from Create page
                          drawImageCover(ctx, img, x, y, w, h);
                          ctx.restore();
                          console.log(`  ✅ Image drawn successfully!`);
                          resolve();
                        };
                        img.onerror = (err) => {
                          console.error(`  ❌ Image load error:`, err);
                          resolve(); // Continue with other elements even if one fails
                        };
                        img.src = element.data.image;
                      });
                    } else if (element.type === "upload" || element.type === "photo") {
                      // Photo/upload element but NO image data
                      console.warn(`  ⚠️ Photo/upload element has NO image data!`, {
                        type: element.type,
                        hasDataObject: !!element.data,
                        imageType: typeof element.data?.image,
                        imageLength: element.data?.image?.length || 0,
                      });
                    } else if (element.type === "shape") {
                      ctx.save();
                      ctx.fillStyle = element.data?.fill || "#000";
                      ctx.globalAlpha =
                        element.data?.opacity !== undefined
                          ? element.data.opacity
                          : 1;

                      const x = element.x || 0;
                      const y = element.y || 0;
                      const w = element.width || 100;
                      const h = element.height || 100;
                      const r = element.data?.borderRadius || 0;

                      if (element.data?.shape === "circle") {
                        ctx.beginPath();
                        ctx.arc(
                          x + w / 2,
                          y + h / 2,
                          Math.min(w, h) / 2,
                          0,
                          Math.PI * 2
                        );
                        ctx.fill();
                      } else {
                        ctx.beginPath();
                        ctx.moveTo(x + r, y);
                        ctx.lineTo(x + w - r, y);
                        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                        ctx.lineTo(x + w, y + h - r);
                        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                        ctx.lineTo(x + r, y + h);
                        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                        ctx.lineTo(x, y + r);
                        ctx.quadraticCurveTo(x, y, x + r, y);
                        ctx.closePath();
                        ctx.fill();
                      }
                      ctx.restore();
                    } else if (element.type === "text") {
                      ctx.save();

                      const fontSize = element.data?.fontSize || 24;
                      const fontWeight = element.data?.fontWeight || 500;
                      const fontFamily = element.data?.fontFamily || "Inter";

                      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                      ctx.fillStyle = element.data?.color || "#111827";

                      const x = element.x || 0;
                      const y = element.y || 0;
                      const w = element.width || 100;
                      const h = element.height || 100;
                      const text = element.data?.text || "";
                      const align = element.data?.align || "left";

                      // ✅ CRITICAL FIX: Proper text wrapping to prevent overflow
                      // Split text into lines that fit within element width
                      const wrapText = (context, text, maxWidth) => {
                        const words = text.split(" ");
                        const lines = [];
                        let currentLine = "";

                        for (let i = 0; i < words.length; i++) {
                          const testLine =
                            currentLine + (currentLine ? " " : "") + words[i];
                          const metrics = context.measureText(testLine);
                          const testWidth = metrics.width;

                          if (testWidth > maxWidth && currentLine) {
                            lines.push(currentLine);
                            currentLine = words[i];
                          } else {
                            currentLine = testLine;
                          }
                        }

                        if (currentLine) {
                          lines.push(currentLine);
                        }

                        return lines;
                      };

                      // Handle manual line breaks first
                      const manualLines = text.split("\n");
                      const allLines = [];

                      // Wrap each manual line to fit within width
                      manualLines.forEach((line) => {
                        if (line.trim()) {
                          const wrappedLines = wrapText(ctx, line, w - 20); // 20px padding
                          allLines.push(...wrappedLines);
                        } else {
                          allLines.push(""); // Empty line
                        }
                      });

                      const lineHeight = fontSize * 1.2;
                      const totalTextHeight = allLines.length * lineHeight;

                      // Calculate starting Y based on vertical alignment
                      let startY = y;
                      if (element.data?.verticalAlign === "middle") {
                        startY = y + (h - totalTextHeight) / 2 + fontSize;
                      } else if (element.data?.verticalAlign === "bottom") {
                        startY = y + h - totalTextHeight + fontSize;
                      } else {
                        startY = y + fontSize;
                      }

                      // Draw each line with proper alignment
                      ctx.textBaseline = "alphabetic";
                      allLines.forEach((line, index) => {
                        const lineY = startY + index * lineHeight;

                        // Calculate X position based on alignment
                        let textX = x + 10; // Left padding
                        if (align === "center") {
                          textX = x + w / 2;
                          ctx.textAlign = "center";
                        } else if (align === "right") {
                          textX = x + w - 10; // Right padding
                          ctx.textAlign = "right";
                        } else {
                          ctx.textAlign = "left";
                        }

                        ctx.fillText(line, textX, lineY, w - 20); // maxWidth with padding
                      });

                      ctx.restore();
                    }
                  }

                  // Draw frame overlay if exists and get actual frame dimensions
                  // ✅ CRITICAL: Skip frameImage for custom frames - they use designerElements instead
                  // frameImage for custom frames is just a JPEG preview thumbnail, not a transparent overlay
                  let finalCanvasWidth = 1080;
                  let finalCanvasHeight = 1920;
                  let frameOffsetX = 0;
                  let frameOffsetY = 0;

                  if (frameConfig && frameConfig.frameImage && !frameConfig.isCustom) {
                    const frameImg = new Image();
                    frameImg.crossOrigin = "anonymous";
                    await new Promise((resolve, reject) => {
                      frameImg.onload = () => {
                        // Calculate actual frame dimensions maintaining aspect ratio
                        const canvasWidth = 1080;
                        const canvasHeight = 1920;
                        const imgRatio = frameImg.width / frameImg.height;
                        const canvasRatio = canvasWidth / canvasHeight;

                        let drawWidth, drawHeight, drawX, drawY;

                        if (imgRatio > canvasRatio) {
                          // Image wider than canvas - fit to width
                          drawWidth = canvasWidth;
                          drawHeight = canvasWidth / imgRatio;
                          drawX = 0;
                          drawY = (canvasHeight - drawHeight) / 2;
                        } else {
                          // Image taller than canvas - fit to height
                          drawHeight = canvasHeight;
                          drawWidth = canvasHeight * imgRatio;
                          drawX = (canvasWidth - drawWidth) / 2;
                          drawY = 0;
                        }

                        ctx.drawImage(
                          frameImg,
                          drawX,
                          drawY,
                          drawWidth,
                          drawHeight
                        );

                        // Store actual frame dimensions for cropping
                        finalCanvasWidth = Math.round(drawWidth);
                        finalCanvasHeight = Math.round(drawHeight);
                        frameOffsetX = Math.round(drawX);
                        frameOffsetY = Math.round(drawY);

                        resolve();
                      };
                      frameImg.onerror = reject;
                      frameImg.src = frameConfig.frameImage;
                    });
                  }

                  // Crop canvas to actual frame size (remove white space)
                  let finalCanvas = canvas;
                  if (
                    frameOffsetX > 0 ||
                    frameOffsetY > 0 ||
                    finalCanvasWidth < 1080 ||
                    finalCanvasHeight < 1920
                  ) {
                    console.log("✂️ Cropping canvas to frame size:", {
                      from: "1080x1920",
                      to: `${finalCanvasWidth}x${finalCanvasHeight}`,
                      offset: `${frameOffsetX}, ${frameOffsetY}`,
                    });

                    finalCanvas = document.createElement("canvas");
                    finalCanvas.width = finalCanvasWidth;
                    finalCanvas.height = finalCanvasHeight;
                    const finalCtx = finalCanvas.getContext("2d");

                    // Copy cropped region from original canvas
                    finalCtx.drawImage(
                      canvas,
                      frameOffsetX,
                      frameOffsetY,
                      finalCanvasWidth,
                      finalCanvasHeight,
                      0,
                      0,
                      finalCanvasWidth,
                      finalCanvasHeight
                    );
                  }

                  // Download - Mobile compatible approach
                  console.log("Canvas created:", {
                    width: finalCanvas.width,
                    height: finalCanvas.height,
                  });
                  
                  const dataUrl = finalCanvas.toDataURL("image/png", 1.0);
                  
                  // Check if on mobile/iOS
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                  
                  if (isIOS) {
                    // For iOS: Open in new tab so user can long-press to save
                    // Also try Web Share API if available
                    if (navigator.share && navigator.canShare) {
                      try {
                        // Convert dataUrl to Blob for sharing
                        const response = await fetch(dataUrl);
                        const blob = await response.blob();
                        const file = new File([blob], "fremio-photo.png", { type: "image/png" });
                        
                        if (navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            files: [file],
                            title: "Fremio Photo",
                            text: "Photo created with Fremio"
                          });
                          console.log("✅ Shared via Web Share API");
                        } else {
                          // Fallback: open in new tab
                          const newTab = window.open();
                          if (newTab) {
                            newTab.document.write(`
                              <html>
                                <head><title>Fremio Photo</title></head>
                                <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                  <img src="${dataUrl}" style="max-width:100%;max-height:100vh;" />
                                  <p style="position:fixed;bottom:20px;color:white;text-align:center;width:100%;">Tekan dan tahan gambar untuk menyimpan</p>
                                </body>
                              </html>
                            `);
                          }
                        }
                      } catch (shareError) {
                        console.log("Share failed, opening in new tab:", shareError);
                        const newTab = window.open();
                        if (newTab) {
                          newTab.document.write(`
                            <html>
                              <head><title>Fremio Photo</title></head>
                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                <img src="${dataUrl}" style="max-width:100%;max-height:100vh;" />
                                <p style="position:fixed;bottom:20px;color:white;text-align:center;width:100%;">Tekan dan tahan gambar untuk menyimpan</p>
                              </body>
                            </html>
                          `);
                        }
                      }
                    } else {
                      // No Web Share API, open in new tab
                      const newTab = window.open();
                      if (newTab) {
                        newTab.document.write(`
                          <html>
                            <head><title>Fremio Photo</title></head>
                            <body style="margin:0;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                              <img src="${dataUrl}" style="max-width:100%;max-height:90vh;" />
                              <p style="color:white;text-align:center;padding:10px;">Tekan dan tahan gambar untuk menyimpan</p>
                            </body>
                          </html>
                        `);
                      }
                    }
                  } else if (isMobile && navigator.share) {
                    // For Android with Web Share API
                    try {
                      const response = await fetch(dataUrl);
                      const blob = await response.blob();
                      const file = new File([blob], "fremio-photo.png", { type: "image/png" });
                      
                      await navigator.share({
                        files: [file],
                        title: "Fremio Photo"
                      });
                      console.log("✅ Shared via Web Share API (Android)");
                    } catch (shareError) {
                      console.log("Share failed, using download link:", shareError);
                      // Fallback to download link
                      const link = document.createElement("a");
                      link.download = "fremio-photo.png";
                      link.href = dataUrl;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  } else {
                    // Desktop: Standard download
                    const link = document.createElement("a");
                    link.download = "fremio-photo.png";
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }

                  // Track download analytics
                  if (frameConfig?.id) {
                    await trackFrameDownload(
                      frameConfig.id,
                      null,
                      null,
                      frameConfig.name || frameConfig.id
                    );
                    console.log(
                      "📊 Tracked download for frame:",
                      frameConfig.id
                    );
                  }

                  console.log("✅ Download selesai!");
                  showToast({
                    type: "success",
                    title: "Download Berhasil",
                    message: "Foto berhasil disimpan.",
                  });
                } catch (error) {
                  console.error("❌ Error saat download:", error);
                  showToast({
                    type: "error",
                    title: "Download Gagal",
                    message:
                      error.message || "Terjadi kesalahan saat mengunduh foto.",
                  });
                }
              }}
            >
              Download Photo
            </button>
            <button
              onClick={async () => {
                // Check if videos exist
                if (!videos || videos.length === 0) {
                  showToast({
                    type: "warning",
                    title: "Tidak Ada Video",
                    message:
                      "Ambil video terlebih dahulu di halaman Take Moment.",
                    action: {
                      label: "Ambil Video",
                      onClick: () => navigate("/take-moment"),
                    },
                  });
                  return;
                }

                // Check if any video has valid data
                if (!hasValidVideo) {
                  showToast({
                    type: "error",
                    title: "Video Tidak Valid",
                    message:
                      "Video corrupt atau tidak valid. Silakan ambil video baru.",
                    action: {
                      label: "Ambil Ulang",
                      onClick: () => navigate("/take-moment"),
                    },
                  });
                  return;
                }

                try {
                  setSaveMessage("🎬 Merender video dengan frame...");
                  setIsSaving(true);

                  // Create off-screen canvas for video rendering (same as photo - full 1080x1920)
                  const canvas = document.createElement("canvas");
                  canvas.width = 1080;
                  canvas.height = 1920;
                  // ✅ Set alpha: true to properly support transparent PNGs
                  const ctx = canvas.getContext("2d", {
                    alpha: true,
                    willReadFrequently: false,
                  });

                  if (typeof MediaRecorder === "undefined") {
                    throw new Error(
                      "Browser ini belum mendukung fitur perekaman canvas (MediaRecorder). Coba gunakan Chrome atau Edge versi terbaru."
                    );
                  }

                  const captureStreamFn =
                    canvas.captureStream ||
                    canvas.mozCaptureStream ||
                    canvas.webkitCaptureStream ||
                    null;
                  if (typeof captureStreamFn !== "function") {
                    throw new Error(
                      "Browser ini belum mendukung captureStream pada canvas. Coba gunakan Chrome atau Edge versi terbaru."
                    );
                  }

                  // Prepare video elements
                  const videoElements = [];
                  const photoSlots = designerElements.filter(
                    (el) =>
                      (el.type === "upload" || el.type === "photo") &&
                      typeof el.data?.photoIndex === "number"
                  );

                  console.log("📹 Preparing videos...", {
                    totalVideos: videos.length,
                    photoSlots: photoSlots.length,
                  });

                  // Log video metadata to verify source and duration
                  videos.forEach((v, idx) => {
                    if (v) {
                      console.log(`📹 Video ${idx} metadata:`, {
                        hasDataUrl: !!v.dataUrl,
                        hasBlob: !!v.blob,
                        duration: v.duration,
                        timer: v.timer,
                        mimeType: v.mimeType,
                        source: "camera recording from TakeMoment",
                      });
                    }
                  });

                  // Load videos into video elements (PARALLEL loading for performance)
                  const loadVideoPromises = videos
                    .slice(0, photoSlots.length)
                    .map((videoData, i) => {
                      if (
                        !videoData ||
                        (!videoData.dataUrl && !videoData.blob)
                      ) {
                        return Promise.resolve(null);
                      }

                      return new Promise((resolve) => {
                        const videoEl = document.createElement("video");
                        videoEl.muted = true;
                        videoEl.loop = false;
                        videoEl.playsInline = true;
                        videoEl.crossOrigin = "anonymous";

                        if (videoData.dataUrl) {
                          videoEl.src = videoData.dataUrl;
                        } else if (videoData.blob) {
                          videoEl.src = URL.createObjectURL(videoData.blob);
                        }

                        let loadSucceeded = false;
                        let timeoutId;

                        const cleanup = () => {
                          if (timeoutId) {
                            clearTimeout(timeoutId);
                          }
                          videoEl.onloadedmetadata = null;
                          videoEl.onloadeddata = null;
                          videoEl.oncanplay = null;
                          videoEl.onerror = null;
                        };

                        const markReady = (eventLabel) => {
                          loadSucceeded = true;
                          console.log(`✅ Video ${i} ready (${eventLabel}):`, {
                            duration: videoEl.duration,
                            width: videoEl.videoWidth,
                            height: videoEl.videoHeight,
                            readyState: videoEl.readyState,
                          });
                          cleanup();

                          const isReady =
                            loadSucceeded ||
                            videoEl.readyState >= 2 ||
                            (Number.isFinite(videoEl.duration) &&
                              videoEl.duration > 0);

                          if (isReady) {
                            resolve({
                              video: videoEl,
                              slot: photoSlots[i],
                              index: i,
                            });
                          } else {
                            if (videoEl.src.startsWith("blob:")) {
                              URL.revokeObjectURL(videoEl.src);
                            }
                            resolve(null);
                          }
                        };

                        videoEl.onloadedmetadata = () =>
                          markReady("loadedmetadata");
                        videoEl.onloadeddata = () => markReady("loadeddata");
                        videoEl.oncanplay = () => markReady("canplay");
                        videoEl.onerror = (error) => {
                          console.error(`❌ Video ${i} failed to load`, error);
                          cleanup();
                          if (videoEl.src.startsWith("blob:")) {
                            URL.revokeObjectURL(videoEl.src);
                          }
                          resolve(null);
                        };

                        timeoutId = setTimeout(() => {
                          console.warn(`⏱️ Video ${i} load timed out`, {
                            readyState: videoEl.readyState,
                            duration: videoEl.duration,
                          });
                          cleanup();

                          const isReady =
                            loadSucceeded ||
                            videoEl.readyState >= 2 ||
                            (Number.isFinite(videoEl.duration) &&
                              videoEl.duration > 0);

                          if (isReady) {
                            resolve({
                              video: videoEl,
                              slot: photoSlots[i],
                              index: i,
                            });
                          } else {
                            if (videoEl.src.startsWith("blob:")) {
                              URL.revokeObjectURL(videoEl.src);
                            }
                            resolve(null);
                          }
                        }, 8000);
                      });
                    });

                  // Wait for all videos to load in parallel (reduces 32s to ~6s for 4 videos)
                  const loadedVideos = await Promise.all(loadVideoPromises);
                  videoElements.push(...loadedVideos.filter((v) => v !== null));

                  if (videoElements.length === 0) {
                    throw new Error("Tidak ada video yang berhasil dimuat");
                  }

                  console.log("✅ Videos loaded:", videoElements.length);

                  const videoBySlotId = new Map();
                  const videoByPhotoIndex = new Map();

                  videoElements.forEach(({ video, slot }, idx) => {
                    console.log(`🔗 Mapping video ${idx}:`, {
                      slotId: slot?.id?.slice(0, 8),
                      photoIndex: slot?.data?.photoIndex,
                      videoReady: video.readyState >= 2,
                    });
                    
                    if (slot?.id) {
                      videoBySlotId.set(slot.id, { video, slot });
                    }
                    const photoIndex = slot?.data?.photoIndex;
                    if (
                      typeof photoIndex === "number" &&
                      !videoByPhotoIndex.has(photoIndex)
                    ) {
                      videoByPhotoIndex.set(photoIndex, { video, slot });
                    }
                  });
                  
                  console.log(`📊 Video mapping summary:`, {
                    bySlotId: videoBySlotId.size,
                    byPhotoIndex: videoByPhotoIndex.size,
                    photoIndices: Array.from(videoByPhotoIndex.keys()),
                  });

                  // Calculate max duration from actual video duration
                  const maxDuration = Math.max(
                    ...videoElements.map(({ video }) =>
                      video.duration && Number.isFinite(video.duration)
                        ? video.duration
                        : 0
                    ),
                    3 // Minimum 3 seconds
                  );

                  console.log("🎬 Video download will render:");
                  console.log(
                    "   - Duration: " + maxDuration + "s (from recorded video)"
                  );
                  console.log(
                    "   - Original timer: " +
                      (videos[0]?.timer || "unknown") +
                      "s"
                  );
                  console.log("   - Expected duration based on timer:");
                  console.log("     * Timer 3s → Video ~4s");
                  console.log("     * Timer 5s → Video ~6s");
                  console.log("     * Timer 10s → Video ~6s");
                  console.log(
                    "   - Video will play in photo slots with frame overlay"
                  );

                  // Setup MediaRecorder
                  const stream = captureStreamFn.call(canvas, 25); // 25 fps

                  // Prioritize MP4 and H.264 to avoid slow WebM to MP4 conversion
                  const mimeTypes = [
                    "video/mp4", // Best: Native MP4 (Chrome/Edge on some systems)
                    "video/webm;codecs=h264", // Good: WebM container with H.264 codec (no conversion needed)
                    "video/webm;codecs=vp9", // OK: VP9 codec (needs conversion)
                    "video/webm;codecs=vp8", // OK: VP8 codec (needs conversion)
                    "video/webm", // Fallback: Default WebM
                  ];

                  let mimeType = mimeTypes.find((type) =>
                    MediaRecorder.isTypeSupported(type)
                  );
                  if (!mimeType) {
                    throw new Error("Browser tidak mendukung perekaman video");
                  }

                  // Adaptive bitrate: lower for mobile to reduce file size and processing time
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(
                    navigator.userAgent
                  );
                  const videoBitrate = isMobile ? 1500000 : 2500000; // Mobile: 1.5Mbps, Desktop: 2.5Mbps

                  console.log("🎬 MediaRecorder settings:", {
                    mimeType,
                    bitrate: `${(videoBitrate / 1000000).toFixed(1)}Mbps`,
                    device: isMobile ? "mobile" : "desktop",
                  });

                  const recorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: videoBitrate,
                  });

                  const chunks = [];
                  recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                      chunks.push(e.data);
                    }
                  };

                  // Preload background image
                  let backgroundImage = null;
                  if (
                    backgroundPhotoElement &&
                    backgroundPhotoElement.data?.image
                  ) {
                    console.log("🖼️ Preloading background image...");
                    backgroundImage = new Image();
                    backgroundImage.crossOrigin = "anonymous";
                    await new Promise((resolve) => {
                      backgroundImage.onload = () => {
                        console.log("✅ Background image loaded");
                        resolve();
                      };
                      backgroundImage.onerror = () => {
                        console.warn("⚠️ Background image failed to load");
                        backgroundImage = null;
                        resolve();
                      };
                      // Use original URL for video export (full quality)
                      backgroundImage.src = getOriginalUrl(backgroundPhotoElement.data.image);
                      // Timeout after 3 seconds
                      setTimeout(() => resolve(), 3000);
                    });
                  }

                  // Preload frame overlay image
                  // ✅ CRITICAL: Skip frameImage for custom frames - they use designerElements instead
                  let frameImage = null;
                  if (frameConfig && frameConfig.frameImage && !frameConfig.isCustom) {
                    console.log("🖼️ Preloading frame overlay image...");
                    frameImage = new Image();
                    frameImage.crossOrigin = "anonymous";
                    await new Promise((resolve) => {
                      frameImage.onload = () => {
                        console.log("✅ Frame overlay loaded");
                        resolve();
                      };
                      frameImage.onerror = () => {
                        console.warn("⚠️ Frame overlay failed to load");
                        frameImage = null;
                        resolve();
                      };
                      frameImage.src = frameConfig.frameImage;
                      // Timeout after 3 seconds
                      setTimeout(() => resolve(), 3000);
                    });
                  }

                  // Preload overlay upload images (non-photo elements)
                  const overlayImagesByElement = new Map();
                  const overlayUploadElements = designerElements.filter(
                    (element) => {
                      if (!element || element.type !== "upload") return false;
                      if (typeof element?.data?.photoIndex === "number")
                        return false;
                      return Boolean(element?.data?.image);
                    }
                  );

                  if (overlayUploadElements.length) {
                    console.log(
                      "🖼️ Preloading overlay uploads:",
                      overlayUploadElements.length
                    );
                    await Promise.all(
                      overlayUploadElements.map((element, index) => {
                        return new Promise((resolve) => {
                          const img = new Image();
                          img.crossOrigin = "anonymous";

                          let settled = false;
                          const finish = () => {
                            if (!settled) {
                              settled = true;
                              resolve();
                            }
                          };

                          const timeoutId = setTimeout(() => {
                            console.warn(
                              `⏱️ Overlay image ${index} load timeout`
                            );
                            finish();
                          }, 3000);

                          img.onload = () => {
                            clearTimeout(timeoutId);
                            console.log(`✅ Overlay upload ${index} loaded`, {
                              width: img.naturalWidth,
                              height: img.naturalHeight,
                              id: element?.id,
                            });
                            overlayImagesByElement.set(element, img);
                            finish();
                          };

                          img.onerror = (err) => {
                            clearTimeout(timeoutId);
                            console.warn(
                              `⚠️ Overlay upload ${index} failed to load`,
                              err
                            );
                            finish();
                          };

                          img.src = element.data.image;
                        });
                      })
                    );
                  }

                  const resolveNumericRadius = (value) => {
                    if (Number.isFinite(value)) {
                      return value;
                    }
                    if (typeof value === "string") {
                      const parsed = parseFloat(value);
                      return Number.isFinite(parsed) ? parsed : 0;
                    }
                    return 0;
                  };

                  const clampRadius = (radius, width, height) => {
                    if (!Number.isFinite(radius) || radius <= 0) {
                      return 0;
                    }
                    const maxRadius = Math.min(width, height) / 2;
                    return Math.min(Math.max(radius, 0), maxRadius);
                  };

                  const buildRoundedRectPath = (
                    context,
                    width,
                    height,
                    radius
                  ) => {
                    context.beginPath();
                    context.moveTo(radius, 0);
                    context.lineTo(width - radius, 0);
                    context.quadraticCurveTo(width, 0, width, radius);
                    context.lineTo(width, height - radius);
                    context.quadraticCurveTo(
                      width,
                      height,
                      width - radius,
                      height
                    );
                    context.lineTo(radius, height);
                    context.quadraticCurveTo(0, height, 0, height - radius);
                    context.lineTo(0, radius);
                    context.quadraticCurveTo(0, 0, radius, 0);
                    context.closePath();
                  };

                  const withElementTransform = (
                    context,
                    element,
                    defaults,
                    draw
                  ) => {
                    const width = Number.isFinite(element?.width)
                      ? element.width
                      : Number.isFinite(defaults?.width)
                      ? defaults.width
                      : 0;
                    const height = Number.isFinite(element?.height)
                      ? element.height
                      : Number.isFinite(defaults?.height)
                      ? defaults.height
                      : 0;
                    const x = Number.isFinite(element?.x)
                      ? element.x
                      : Number.isFinite(defaults?.x)
                      ? defaults.x
                      : 0;
                    const y = Number.isFinite(element?.y)
                      ? element.y
                      : Number.isFinite(defaults?.y)
                      ? defaults.y
                      : 0;
                    const rotationDeg = Number.isFinite(element?.rotation)
                      ? element.rotation
                      : Number.isFinite(defaults?.rotation)
                      ? defaults.rotation
                      : 0;
                    const rotationRad = (rotationDeg * Math.PI) / 180;

                    context.save();
                    context.translate(x + width / 2, y + height / 2);
                    if (rotationRad) {
                      context.rotate(rotationRad);
                    }
                    context.translate(-width / 2, -height / 2);
                    draw({ width, height });
                    context.restore();
                  };

                  const applySlotClipPath = (ctx, slot, width, height) => {
                    if (!ctx || !slot) {
                      return;
                    }

                    const slotShape = slot?.data?.shape;
                    if (slotShape === "circle") {
                      const radius = Math.min(width, height) / 2;
                      ctx.beginPath();
                      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
                      ctx.closePath();
                      ctx.clip();
                      return;
                    }

                    const rawRadius = resolveNumericRadius(
                      slot?.data?.borderRadius
                    );
                    const radius = clampRadius(rawRadius, width, height);

                    if (radius <= 0) {
                      ctx.beginPath();
                      ctx.rect(0, 0, width, height);
                      ctx.closePath();
                      ctx.clip();
                      return;
                    }

                    buildRoundedRectPath(ctx, width, height, radius);
                    ctx.clip();
                  };

                  const drawMediaCoverInSlot = (ctx, media, width, height) => {
                    if (!media) {
                      return;
                    }

                    const intrinsicWidth =
                      Number.isFinite(media.videoWidth) && media.videoWidth > 0
                        ? media.videoWidth
                        : Number.isFinite(media.naturalWidth) &&
                          media.naturalWidth > 0
                        ? media.naturalWidth
                        : Number.isFinite(media.width) && media.width > 0
                        ? media.width
                        : width;

                    const intrinsicHeight =
                      Number.isFinite(media.videoHeight) &&
                      media.videoHeight > 0
                        ? media.videoHeight
                        : Number.isFinite(media.naturalHeight) &&
                          media.naturalHeight > 0
                        ? media.naturalHeight
                        : Number.isFinite(media.height) && media.height > 0
                        ? media.height
                        : height;

                    if (!intrinsicWidth || !intrinsicHeight) {
                      ctx.drawImage(media, 0, 0, width, height);
                      return;
                    }

                    // Use 'cover' behavior (crop to fill) - transparency is preserved in PNG format
                    const mediaRatio = intrinsicWidth / intrinsicHeight;
                    const slotRatio = width / height;

                    let sourceX = 0;
                    let sourceY = 0;
                    let sourceWidth = intrinsicWidth;
                    let sourceHeight = intrinsicHeight;

                    if (mediaRatio > slotRatio) {
                      sourceWidth = intrinsicHeight * slotRatio;
                      sourceX = (intrinsicWidth - sourceWidth) / 2;
                    } else {
                      sourceHeight = intrinsicWidth / slotRatio;
                      sourceY = (intrinsicHeight - sourceHeight) / 2;
                    }

                    ctx.drawImage(
                      media,
                      sourceX,
                      sourceY,
                      sourceWidth,
                      sourceHeight,
                      0,
                      0,
                      width,
                      height
                    );
                  };

                  const layeredElements = designerElements
                    .filter(Boolean)
                    .slice()
                    .sort((a, b) => {
                      const zA = Number.isFinite(a?.zIndex) ? a.zIndex : 200;
                      const zB = Number.isFinite(b?.zIndex) ? b.zIndex : 200;
                      if (zA === zB) {
                        const indexA = designerElements.indexOf(a);
                        const indexB = designerElements.indexOf(b);
                        return indexA - indexB;
                      }
                      return zA - zB;
                    });

                  const activeFilter = [
                    `brightness(${filters.brightness}%)`,
                    `contrast(${filters.contrast}%)`,
                    `saturate(${filters.saturate}%)`,
                    `grayscale(${filters.grayscale}%)`,
                    `sepia(${filters.sepia}%)`,
                    `blur(${filters.blur}px)`,
                    `hue-rotate(${filters.hueRotate}deg)`,
                  ].join(" ");

                  const baseCanvasColor =
                    frameConfig?.designer?.canvasBackground || "#FFFFFF";

                  // Function to draw composite frame
                  const drawFrame = () => {
                    // Clear canvas with configured background color
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = "source-over"; // ✅ Ensure proper alpha blending
                    ctx.filter = "none";
                    ctx.fillStyle = baseCanvasColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();

                    // Draw background photo if exists
                    if (
                      backgroundImage &&
                      backgroundImage.complete &&
                      backgroundImage.naturalWidth > 0
                    ) {
                      try {
                        if (backgroundPhotoElement) {
                          withElementTransform(
                            ctx,
                            backgroundPhotoElement,
                            {
                              width: canvas.width,
                              height: canvas.height,
                              x: 0,
                              y: 0,
                            },
                            ({ width, height }) => {
                              ctx.filter = activeFilter;
                              applySlotClipPath(
                                ctx,
                                backgroundPhotoElement,
                                width,
                                height
                              );
                              drawMediaCoverInSlot(
                                ctx,
                                backgroundImage,
                                width,
                                height
                              );
                            }
                          );
                        } else {
                          ctx.save();
                          ctx.filter = activeFilter;
                          drawMediaCoverInSlot(
                            ctx,
                            backgroundImage,
                            canvas.width,
                            canvas.height
                          );
                          ctx.restore();
                        }
                      } catch (err) {
                        console.warn("Error drawing background:", err);
                      }
                    }

                    // Draw layered designer elements (videos, overlays, shapes, text)
                    layeredElements.forEach((element) => {
                      if (!element) return;

                      const isPhotoSlot =
                        (element.type === "upload" || element.type === "photo") &&
                        typeof element?.data?.photoIndex === "number";

                      if (isPhotoSlot) {
                        const slotVideoEntry =
                          (element.id && videoBySlotId.get(element.id)) ||
                          videoByPhotoIndex.get(element.data.photoIndex);

                        if (!slotVideoEntry) {
                          // Log missing video only once per element
                          if (!element._loggedMissing) {
                            console.warn(`⚠️ No video for slot:`, {
                              elementId: element.id?.slice(0, 8),
                              photoIndex: element.data.photoIndex,
                              availableIndices: Array.from(videoByPhotoIndex.keys()),
                            });
                            element._loggedMissing = true;
                          }
                          return;
                        }

                        const { video } = slotVideoEntry;

                        if (
                          !(
                            video.readyState >= 2 &&
                            !video.paused &&
                            !video.ended
                          )
                        ) {
                          return;
                        }

                        try {
                          withElementTransform(
                            ctx,
                            element,
                            null,
                            ({ width, height }) => {
                              ctx.filter = activeFilter;
                              applySlotClipPath(ctx, element, width, height);
                              ctx.translate(width, 0);
                              ctx.scale(-1, 1);
                              drawMediaCoverInSlot(ctx, video, width, height);
                            }
                          );
                        } catch (err) {
                          console.warn("Error drawing video frame:", err);
                        }
                        return;
                      }

                      if (element.type === "shape") {
                        withElementTransform(
                          ctx,
                          element,
                          null,
                          ({ width, height }) => {
                            const opacity = Number.isFinite(
                              element?.data?.opacity
                            )
                              ? element.data.opacity
                              : 1;
                            ctx.filter = "none";
                            ctx.globalAlpha = opacity;
                            ctx.fillStyle = element.data?.fill || "#000";

                            if (element.data?.shape === "circle") {
                              ctx.beginPath();
                              ctx.arc(
                                width / 2,
                                height / 2,
                                Math.min(width, height) / 2,
                                0,
                                Math.PI * 2
                              );
                              ctx.fill();
                            } else {
                              const rawRadius = resolveNumericRadius(
                                element?.data?.borderRadius
                              );
                              const radius = clampRadius(
                                rawRadius,
                                width,
                                height
                              );
                              buildRoundedRectPath(ctx, width, height, radius);
                              ctx.fill();
                            }
                          }
                        );
                        return;
                      }

                      if (element.type === "text" && element.data?.text) {
                        withElementTransform(
                          ctx,
                          element,
                          null,
                          ({ width, height }) => {
                            ctx.filter = "none";
                            ctx.globalAlpha = Number.isFinite(
                              element?.data?.opacity
                            )
                              ? element.data.opacity
                              : 1;
                            const fontSize = element.data?.fontSize || 24;
                            const fontWeight = element.data?.fontWeight || 500;
                            const fontFamily =
                              element.data?.fontFamily || "Inter";
                            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                            const align = element.data?.align || "left";
                            ctx.fillStyle = element.data?.color || "#111827";

                            // Text wrapping function (same as photo download)
                            const wrapText = (context, text, maxWidth) => {
                              const words = text.split(" ");
                              const lines = [];
                              let currentLine = "";

                              for (let i = 0; i < words.length; i++) {
                                const testLine =
                                  currentLine +
                                  (currentLine ? " " : "") +
                                  words[i];
                                const metrics = context.measureText(testLine);
                                const testWidth = metrics.width;

                                if (testWidth > maxWidth && currentLine) {
                                  lines.push(currentLine);
                                  currentLine = words[i];
                                } else {
                                  currentLine = testLine;
                                }
                              }

                              if (currentLine) {
                                lines.push(currentLine);
                              }

                              return lines;
                            };

                            // Handle manual line breaks first
                            const manualLines = (element.data.text || "").split(
                              "\n"
                            );
                            const allLines = [];

                            // Wrap each manual line to fit within width
                            manualLines.forEach((line) => {
                              if (line.trim()) {
                                const wrappedLines = wrapText(
                                  ctx,
                                  line,
                                  width - 20
                                ); // 20px padding
                                allLines.push(...wrappedLines);
                              } else {
                                allLines.push(""); // Empty line
                              }
                            });

                            const lineHeight = fontSize * 1.2;
                            const totalTextHeight =
                              allLines.length * lineHeight;

                            // Calculate X position based on alignment
                            let textX = 10; // Left padding
                            if (align === "center") {
                              textX = width / 2;
                              ctx.textAlign = "center";
                            } else if (align === "right") {
                              textX = width - 10; // Right padding
                              ctx.textAlign = "right";
                            } else {
                              ctx.textAlign = "left";
                            }

                            // Calculate starting Y based on vertical alignment
                            let startY = fontSize;
                            const verticalAlign = element.data?.verticalAlign;
                            if (verticalAlign === "middle") {
                              startY =
                                (height - totalTextHeight) / 2 + fontSize;
                            } else if (verticalAlign === "bottom") {
                              startY = height - totalTextHeight + fontSize;
                            }

                            ctx.textBaseline = "alphabetic";
                            allLines.forEach((line, index) => {
                              const lineY = startY + index * lineHeight;
                              ctx.fillText(line, textX, lineY, width - 20); // maxWidth with padding
                            });
                          }
                        );
                        return;
                      }

                      // Support both "upload" and "photo" types
                      if (element.type === "upload" || element.type === "photo") {
                        const overlayImage =
                          overlayImagesByElement.get(element);
                        if (
                          !overlayImage ||
                          !overlayImage.complete ||
                          overlayImage.naturalWidth <= 0
                        ) {
                          return;
                        }

                        withElementTransform(
                          ctx,
                          element,
                          null,
                          ({ width, height }) => {
                            // ✅ Reset context properties to ensure transparent PNGs render correctly
                            ctx.globalAlpha = 1;
                            ctx.globalCompositeOperation = "source-over";
                            ctx.filter = "none";
                            applySlotClipPath(ctx, element, width, height);
                            drawMediaCoverInSlot(
                              ctx,
                              overlayImage,
                              width,
                              height
                            );
                          }
                        );
                      }
                    });

                    // Draw frame overlay with aspect ratio preservation (same as photo download)
                    // ✅ CRITICAL: Skip frameImage for custom frames - they use designerElements instead
                    if (
                      frameImage &&
                      frameImage.complete &&
                      frameImage.naturalWidth > 0 &&
                      !frameConfig?.isCustom
                    ) {
                      try {
                        ctx.save();
                        ctx.filter = "none";
                        ctx.globalAlpha = 1;

                        // Calculate actual frame dimensions maintaining aspect ratio
                        const canvasWidth = 1080;
                        const canvasHeight = 1920;
                        const imgRatio = frameImage.width / frameImage.height;
                        const canvasRatio = canvasWidth / canvasHeight;

                        let drawWidth, drawHeight, drawX, drawY;

                        if (imgRatio > canvasRatio) {
                          // Image wider than canvas - fit to width
                          drawWidth = canvasWidth;
                          drawHeight = canvasWidth / imgRatio;
                          drawX = 0;
                          drawY = (canvasHeight - drawHeight) / 2;
                        } else {
                          // Image taller than canvas - fit to height
                          drawHeight = canvasHeight;
                          drawWidth = canvasHeight * imgRatio;
                          drawX = (canvasWidth - drawWidth) / 2;
                          drawY = 0;
                        }

                        ctx.drawImage(
                          frameImage,
                          drawX,
                          drawY,
                          drawWidth,
                          drawHeight
                        );
                        ctx.restore();
                      } catch (err) {
                        console.warn("Error drawing frame overlay:", err);
                      }
                    }
                  };

                  // Start recording
                  const recordingPromise = new Promise((resolve, reject) => {
                    recorder.onstop = () => {
                      console.log("🎬 Recording stopped, creating blob...");
                      if (chunks.length === 0) {
                        console.error("❌ No video chunks recorded!");
                        reject(new Error("No video data recorded"));
                        return;
                      }
                      const blob = new Blob(chunks, { type: mimeType });
                      console.log("✅ Video blob created:", {
                        size: (blob.size / 1024).toFixed(2) + "KB",
                        type: blob.type,
                        chunks: chunks.length,
                      });
                      resolve(blob);
                    };
                    recorder.onerror = (e) => {
                      console.error("❌ MediaRecorder error:", e);
                      reject(e);
                    };
                  });

                  console.log("🎬 Starting MediaRecorder...");
                  recorder.start(100); // 100ms timeslice for frequent chunks
                  console.log(
                    "✅ MediaRecorder started, state:",
                    recorder.state
                  );

                  // Play all videos and start animation loop
                  console.log("▶️ Starting video playback...");
                  await Promise.all(
                    videoElements.map(({ video, index }) => {
                      video.currentTime = 0;
                      return video
                        .play()
                        .then(() => {
                          console.log(`✅ Video ${index} playing`);
                        })
                        .catch((err) => {
                          console.warn(`⚠️ Video ${index} play failed:`, err);
                        });
                    })
                  );

                  // Animation loop
                  console.log("🎞️ Starting animation loop...");
                  const startTime = performance.now();
                  let frameCount = 0;

                  const animate = () => {
                    drawFrame();
                    frameCount++;

                    const elapsed = (performance.now() - startTime) / 1000;
                    const allEnded = videoElements.every(
                      ({ video }) =>
                        video.ended || video.currentTime >= maxDuration
                    );

                    // Log progress every second
                    if (frameCount % 25 === 0) {
                      console.log(
                        `🎬 Recording progress: ${elapsed.toFixed(
                          1
                        )}s / ${maxDuration}s (frame ${frameCount})`
                      );
                    }

                    if (elapsed < maxDuration + 0.5 && !allEnded) {
                      requestAnimationFrame(animate);
                    } else {
                      // Stop recording
                      console.log("🛑 Stopping recording...");
                      console.log(
                        `   Total frames: ${frameCount}, Duration: ${elapsed.toFixed(
                          2
                        )}s`
                      );

                      if (recorder.state !== "inactive") {
                        recorder.stop();
                      }

                      videoElements.forEach(({ video, index }) => {
                        video.pause();
                        console.log(
                          `⏸️ Video ${index} paused at ${video.currentTime.toFixed(
                            2
                          )}s`
                        );
                        if (video.src.startsWith("blob:")) {
                          URL.revokeObjectURL(video.src);
                        }
                      });
                    }
                  };

                  animate();

                  // Wait for recording to finish
                  console.log("⏳ Waiting for recording to complete...");
                  setSaveMessage("⏳ Finalizing video...");
                  const videoBlob = await recordingPromise;

                  // Validate blob
                  if (!videoBlob || videoBlob.size < 1000) {
                    throw new Error(
                      `Video blob too small or invalid (${
                        videoBlob?.size || 0
                      } bytes)`
                    );
                  }

                  console.log("💾 Preparing final download blob...", {
                    sizeKB: (videoBlob.size / 1024).toFixed(2),
                    type: videoBlob.type,
                  });

                  let downloadBlob = videoBlob;
                  let downloadExtension = "mp4"; // Default to MP4
                  let downloadMime = videoBlob.type || "video/mp4";

                  // Check if conversion is needed
                  // Skip conversion for: MP4 format OR H.264 codec (even in WebM container)
                  const needsConversion = !(
                    videoBlob.type === "video/mp4" ||
                    videoBlob.type.includes("codecs=h264") ||
                    videoBlob.type.includes("codecs=avc1")
                  );

                  if (needsConversion) {
                    console.log("⚠️ Video needs conversion:", videoBlob.type);
                    setSaveMessage(
                      "🔄 Mengonversi video ke MP4 (ini memakan waktu)..."
                    );

                    try {
                      const mp4Blob = await convertBlobToMp4(videoBlob, {
                        frameRate: 25,
                        durationSeconds: maxDuration,
                        outputPrefix: "fremio-video",
                      });

                      if (mp4Blob && mp4Blob.size > 0) {
                        downloadBlob = mp4Blob;
                        downloadExtension = "mp4";
                        downloadMime = "video/mp4";
                        console.log("✅ Video converted to MP4:", {
                          originalType: videoBlob.type,
                          originalSizeKB: (videoBlob.size / 1024).toFixed(2),
                          convertedSizeKB: (mp4Blob.size / 1024).toFixed(2),
                        });
                      } else {
                        console.warn(
                          "⚠️ MP4 conversion returned empty result, falling back to original blob"
                        );
                        // Use WebM as fallback
                        downloadExtension = "webm";
                      }
                    } catch (conversionError) {
                      console.error(
                        "❌ MP4 conversion failed, using original recording:",
                        conversionError
                      );
                      // Use WebM as fallback
                      downloadExtension = "webm";
                    }
                  } else {
                    console.log(
                      "✅ Video already in compatible format, skipping conversion!",
                      {
                        type: videoBlob.type,
                        sizeKB: (videoBlob.size / 1024).toFixed(2),
                      }
                    );

                    // Keep appropriate extension
                    if (videoBlob.type === "video/mp4") {
                      downloadExtension = "mp4";
                    } else if (videoBlob.type.includes("webm")) {
                      // H.264 in WebM container - save as MP4 for better compatibility
                      downloadExtension = "mp4";
                      downloadMime = "video/mp4";
                    }
                  }

                  // Download video
                  console.log("💾 Downloading video...");
                  const timestamp = new Date()
                    .toISOString()
                    .replace(/[:.]/g, "-");
                  const filename = `fremio-video-${timestamp}.${downloadExtension}`;
                  const downloadUrl = URL.createObjectURL(downloadBlob);
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  link.download = filename;
                  link.type = downloadMime;
                  document.body.appendChild(link); // Add to DOM for better compatibility
                  link.click();
                  document.body.removeChild(link);

                  // Cleanup after a delay
                  setTimeout(() => {
                    URL.revokeObjectURL(downloadUrl);
                  }, 1000);

                  // Track download analytics
                  if (frameConfig?.id) {
                    await trackFrameDownload(
                      frameConfig.id,
                      null,
                      null,
                      frameConfig.name || frameConfig.id
                    );
                    console.log(
                      "📊 Tracked video download for frame:",
                      frameConfig.id
                    );
                  }

                  setSaveMessage(
                    downloadExtension === "mp4"
                      ? "✅ Video MP4 berhasil didownload!"
                      : "✅ Video berhasil didownload (format cadangan)"
                  );
                  setTimeout(() => setSaveMessage(""), 3000);
                  console.log("✅ Video download complete:", filename);
                  showToast({
                    type: "success",
                    title: "Video Berhasil",
                    message: "Video berhasil dirender dan disimpan.",
                  });
                } catch (error) {
                  console.error("❌ Error rendering video:", error);
                  showToast({
                    type: "error",
                    title: "Render Video Gagal",
                    message:
                      error.message || "Terjadi kesalahan saat merender video.",
                    action: {
                      label: "Coba Lagi",
                      onClick: () => window.location.reload(),
                    },
                  });
                  setSaveMessage("");
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={(() => {
                const isDisabled = !hasValidVideo || isSaving;
                console.log("🔘 Download Video button state:", {
                  videosLength: videos?.length || 0,
                  hasValidVideo,
                  isSaving,
                  isDisabled,
                });
                return isDisabled;
              })()}
              style={{
                padding: "0.75rem 1.5rem",
                background: !hasValidVideo || isSaving ? "#9CA3AF" : "#8B5CF6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                cursor: !hasValidVideo || isSaving ? "not-allowed" : "pointer",
                fontWeight: "600",
                opacity: !hasValidVideo || isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? "⏳ Processing..." : "Download Video"}
            </button>
          </div>

          {/* Navigation Buttons */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              width: "100%",
              maxWidth: "400px",
              marginTop: "1rem",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Kembali ke halaman utama? Cache frame akan dibersihkan."
                  )
                ) {
                  clearFrameCache();
                  navigate("/");
                }
              }}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#10B981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              🏠 Back to Home
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Buat frame baru? Cache frame saat ini akan dibersihkan."
                  )
                ) {
                  clearFrameCache();
                  navigate("/create");
                }
              }}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#8B5CF6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              ✨ Create New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
