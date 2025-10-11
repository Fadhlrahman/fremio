import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFrameConfig, FRAME_CONFIGS } from '../config/frameConfigs.js';
import { reloadFrameConfig as reloadFrameConfigFromManager } from '../config/frameConfigManager.js';
import frameProvider from '../utils/frameProvider.js';
import QRCode from 'qrcode';
import Testframe1 from '../assets/frames/Testframe1.png';
import Testframe2 from '../assets/frames/Testframe2.png';
import Testframe3 from '../assets/frames/Testframe3.png';

// FremioSeries Imports
import FremioSeriesBlue2 from '../assets/frames/FremioSeries/FremioSeries-2/FremioSeries-blue-2.png';
import FremioSeriesBabyblue3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-babyblue-3.png';
import FremioSeriesBlack3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-black-3.png';
import FremioSeriesBlue3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-blue-3.png';
import FremioSeriesCream3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-cream-3.png';
import FremioSeriesGreen3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-green-3.png';
import FremioSeriesMaroon3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-maroon-3.png';
import FremioSeriesOrange3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-orange-3.png';
import FremioSeriesPink3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-pink-3.png';
import FremioSeriesPurple3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-purple-3.png';
import FremioSeriesWhite3 from '../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-white-3.png';
import FremioSeriesBlue4 from '../assets/frames/FremioSeries/FremioSeries-4/FremioSeries-blue-4.png';

export default function EditPhoto() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [frameConfig, setFrameConfig] = useState(null);
  const [frameImage, setFrameImage] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState('Testframe1'); // Add selected frame state
  const [activeToggle, setActiveToggle] = useState('filter');
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [draggedPhoto, setDraggedPhoto] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [photoPositions, setPhotoPositions] = useState({}); // Store photo positions for fine-tuning
  const [debugMode, setDebugMode] = useState(false); // Debug mode toggle
  const [configReloadKey, setConfigReloadKey] = useState(0); // Force config reload
  const [isReloading, setIsReloading] = useState(false); // Loading state for reload
  const [photoTransforms, setPhotoTransforms] = useState({}); // Store zoom and pan for each photo
  const [selectedPhotoForEdit, setSelectedPhotoForEdit] = useState(null); // Which photo is being edited
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false); // Track if dragging for pan
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Drag start position
  const [isSaving, setIsSaving] = useState(false); // Loading state for save
  const [slotPhotos, setSlotPhotos] = useState({}); // Store individual photos per slot for Testframe2
  
  // Print functionality states
  const [printCode, setPrintCode] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const getSlotPhotosStorageKey = (id) => (id ? `slotPhotos:${id}` : null);
  const persistSlotPhotos = (id, data) => {
    const storageKey = getSlotPhotosStorageKey(id);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('⚠️ Failed to persist slotPhotos for', id, err);
    }
  };

  // Frame image mapping
  const getFrameImage = (frameId) => {
    const frameMap = {
      'Testframe1': Testframe1,
      'Testframe2': Testframe2,
      'Testframe3': Testframe3,
      // FremioSeries frames
      'FremioSeries-blue-2': FremioSeriesBlue2,
      'FremioSeries-babyblue-3': FremioSeriesBabyblue3,
      'FremioSeries-black-3': FremioSeriesBlack3,
      'FremioSeries-blue-3': FremioSeriesBlue3,
      'FremioSeries-cream-3': FremioSeriesCream3,
      'FremioSeries-green-3': FremioSeriesGreen3,
      'FremioSeries-maroon-3': FremioSeriesMaroon3,
      'FremioSeries-orange-3': FremioSeriesOrange3,
      'FremioSeries-pink-3': FremioSeriesPink3,
      'FremioSeries-purple-3': FremioSeriesPurple3,
      'FremioSeries-white-3': FremioSeriesWhite3,
      'FremioSeries-blue-4': FremioSeriesBlue4
    };
    return frameMap[frameId] || Testframe1;
  };

  // SMART ZOOM DEFAULT CALCULATION - SCALABLE FOR ALL PHOTO SIZES
  const calculateSmartDefaultScale = (photoImg, slotIndex, frameConfig) => {
    if (!frameConfig || !frameConfig.slots[slotIndex] || !photoImg) {
      console.log('⚠️ Missing data for smart scale calculation, using fallback scale 1.6');
      return 1.6;
    }
    
    const slot = frameConfig.slots[slotIndex];
    const photoAspectRatio = photoImg.width / photoImg.height;
    
    console.log(`🧮 Smart Scale Calculation for Slot ${slotIndex + 1} (${slot.id}):`);
    console.log(`  - Photo: ${photoImg.width}x${photoImg.height} (ratio: ${photoAspectRatio.toFixed(2)})`);
    console.log(`  - Slot: ${slot.width}x${slot.height} (ratio: ${(slot.width/slot.height).toFixed(2)})`);
    
    // Convert slot dimensions to pixels (using preview dimensions as base)
    const PREVIEW_WIDTH = 350;
    const PREVIEW_HEIGHT = 525; // 2:3 aspect ratio
    
    const slotWidthPx = slot.width * PREVIEW_WIDTH;
    const slotHeightPx = slot.height * PREVIEW_HEIGHT;
    
    console.log(`  - Slot in pixels: ${slotWidthPx.toFixed(1)}x${slotHeightPx.toFixed(1)}px`);
    
    // Calculate objectFit: contain behavior - how photo naturally fits in slot
    const slotAspectRatio = slotWidthPx / slotHeightPx;
    
    let containedPhotoWidth, containedPhotoHeight;
    
    if (photoAspectRatio > slotAspectRatio) {
      // Photo is wider than slot - fit by width
      containedPhotoWidth = slotWidthPx;
      containedPhotoHeight = slotWidthPx / photoAspectRatio;
    } else {
      // Photo is taller than slot or same aspect - fit by height
      containedPhotoWidth = slotHeightPx * photoAspectRatio;
      containedPhotoHeight = slotHeightPx;
    }
    
    console.log(`  - Contained photo size: ${containedPhotoWidth.toFixed(1)}x${containedPhotoHeight.toFixed(1)}px`);
    
    // Step 3: Check height constraint
    // If contained photo height < slot height, we need to scale up
    const heightScale = containedPhotoHeight < slotHeightPx ? slotHeightPx / containedPhotoHeight : 1;
    
    // Step 4: Check width constraint 
    // If contained photo width < slot width, we need to scale up
    const widthScale = containedPhotoWidth < slotWidthPx ? slotWidthPx / containedPhotoWidth : 1;
    
    // Use the larger scale to ensure we fill the slot (minimize empty space)
    const fillScale = Math.max(heightScale, widthScale);
    
    // Apply slight buffer to ensure good coverage
    const smartScale = fillScale * 1.02; // 2% buffer for perfect fit
    
    console.log(`  - Height scale needed: ${heightScale.toFixed(2)}x`);
    console.log(`  - Width scale needed: ${widthScale.toFixed(2)}x`);
    console.log(`  - Fill scale (max): ${fillScale.toFixed(2)}x`);
    console.log(`  - Smart scale (with buffer): ${smartScale.toFixed(2)}x`);
    
    // Clamp between reasonable bounds
    const minScale = 1.0;
    const maxScale = 4.0; // Reasonable maximum
    
    const clampedScale = Math.max(minScale, Math.min(maxScale, smartScale));
    
    console.log(`  - Final clamped scale: ${clampedScale.toFixed(2)}x`);
    
    return clampedScale;
  };

  // Load photos and frame config on mount
  useEffect(() => {
    console.log('🔄 EditPhoto component mounting...');
    
    // Load selected frame from localStorage first
    const frameFromStorage = localStorage.getItem('selectedFrame') || 'Testframe1';
    console.log('🖼️ Frame from localStorage:', frameFromStorage);
    
    // Load photos from localStorage
    const savedPhotos = localStorage.getItem('capturedPhotos');
    console.log('📦 Raw savedPhotos from localStorage:', savedPhotos);
    
    if (savedPhotos) {
      try {
        const parsedPhotos = JSON.parse(savedPhotos);
        console.log('📸 Parsed photos array:', parsedPhotos);
        console.log('📊 Number of photos:', parsedPhotos.length);
        
        setPhotos(parsedPhotos);
        
        // Initialize photo positions with correct defaults for each frame type
        const positions = {};
        const transforms = {};
        
        // Get frame config to calculate proper default scales
        const frameConfigForDefaults = getFrameConfig(frameFromStorage);
        
        // For frames with duplicate photos (like Testframe2), we need transforms for ALL slots, not just photos
        if (frameConfigForDefaults?.duplicatePhotos && frameConfigForDefaults.slots) {
          // Initialize slot-specific photos for independent slot behavior
          const initialSlotPhotos = {};
          
          // Initialize transforms for all slots
          frameConfigForDefaults.slots.forEach((slot, slotIndex) => {
            const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
            
            // For duplicate frames, both positions and transforms should use slotIndex as key
            positions[slotIndex] = 'center center';
            
            // Store photo for this specific slot
            initialSlotPhotos[slotIndex] = parsedPhotos[photoIndex];
            
            // Calculate proper default scale based on frame type
            let defaultScale = 1.6; // Standard auto-fill for portrait frames
            
            console.log(`📐 Setting slot ${slotIndex} (photo ${photoIndex}) default scale: ${defaultScale}`);
            
            // Create transform for this specific slot index
            transforms[slotIndex] = {
              scale: defaultScale,
              translateX: 0,
              translateY: 0,
              autoFillScale: defaultScale
            };
          });
          
          const storageKey = getSlotPhotosStorageKey(frameFromStorage);
          let normalizedSlotPhotos = initialSlotPhotos;
          if (storageKey) {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                const merged = {};
                frameConfigForDefaults.slots.forEach((_, slotIndex) => {
                  if (parsed && Object.prototype.hasOwnProperty.call(parsed, slotIndex)) {
                    merged[slotIndex] = parsed[slotIndex];
                  } else {
                    merged[slotIndex] = initialSlotPhotos[slotIndex] || null;
                  }
                });
                normalizedSlotPhotos = merged;
              } catch (err) {
                console.warn('⚠️ Failed to parse stored slotPhotos for edit page, using defaults', err);
              }
            }
          }

          // Set slot photos for duplicate-photo frames
          setSlotPhotos(normalizedSlotPhotos);
          persistSlotPhotos(frameFromStorage, normalizedSlotPhotos);
          console.log('🎯 Initialized slot photos for duplicate frame:', Object.keys(normalizedSlotPhotos).length, 'slots');
        } else {
          // Standard initialization for non-duplicate frames (one transform per photo)
          parsedPhotos.forEach((_, index) => {
            positions[index] = 'center center';
            
            // Use standard auto-fill scale for all frames
            let defaultScale = 1.6; // Standard auto-fill for portrait frames
            console.log(`📐 Setting standard default scale: ${defaultScale}`);
            
            transforms[index] = {
              scale: defaultScale,
              translateX: 0,
              translateY: 0,
              autoFillScale: defaultScale
            };
          });
        }
        
        setPhotoPositions(positions);
        setPhotoTransforms(transforms);
        
        console.log('✅ Loaded photos:', parsedPhotos.length);
      } catch (error) {
        console.error('❌ Error parsing photos:', error);
      }
    } else {
      console.log('⚠️ No saved photos found in localStorage');
    }

    // Special debugging for Testframe3
    if (frameFromStorage === 'Testframe3') {
      console.log(`🔍 ${frameFromStorage.toUpperCase()} LOADING DEBUG:`);
      console.log('  - selectedFrame value:', frameFromStorage);
      console.log('  - frameConfig from localStorage:', localStorage.getItem('frameConfig'));
      console.log('  - capturedPhotos from localStorage:', localStorage.getItem('capturedPhotos'));
    }
    
    setSelectedFrame(frameFromStorage);
    console.log('🖼️ Loading frame:', frameFromStorage);

    // Try primary config source
    let config = getFrameConfig(frameFromStorage);
    console.log('⚙️ Frame config result (primary):', config);

    // Fallback 1: use stored frameConfig JSON
    if (!config) {
      const storedConfigJson = localStorage.getItem('frameConfig');
      if (storedConfigJson) {
        try {
          const parsed = JSON.parse(storedConfigJson);
          if (parsed?.id === frameFromStorage && parsed?.slots?.length) {
            config = parsed;
            console.log('🧰 Using stored frameConfig from localStorage');
          }
        } catch (e) {
          console.warn('⚠️ Could not parse stored frameConfig JSON', e);
        }
      }
    }

    // Fallback 2: ask frameProvider
    if (!config && frameProvider?.getCurrentConfig) {
      const providerCfg = frameProvider.getCurrentConfig();
      if (providerCfg?.id === frameFromStorage) {
        config = providerCfg;
        console.log('🧠 Using frameProvider currentConfig');
      }
    }

    if (config) {
      setFrameConfig(config);
      setFrameImage(getFrameImage(frameFromStorage));
      console.log('✅ Frame config loaded (final):', config);
      
      // Extra verification for Testframe3
      if (frameFromStorage === 'Testframe3') {
        console.log(`✅ ${frameFromStorage.toUpperCase()} successfully loaded:`);
        console.log('  - Config ID:', config.id);
        console.log('  - Max captures:', config.maxCaptures);
        console.log('  - Slots count:', config.slots?.length);
        console.log('  - Frame image:', getFrameImage(frameFromStorage));
      }
    } else {
      console.error('❌ Failed to resolve frame config after fallbacks for:', frameFromStorage);
      console.error('  - Available configs:', Object.keys(FRAME_CONFIGS || {}));
    }
  }, []);

  // Initialize auto-fill scale when frameConfig is loaded
  useEffect(() => {
    if (frameConfig && photos.length > 0) {
      console.log('🎯 Auto-fitting photos to slots with smart calculation...');
      photos.forEach(async (_, index) => {
        await initializePhotoScale(index);
      });
    }
  }, [frameConfig, photos.length]);

  // Listen for frame changes from frameProvider
  useEffect(() => {
    const checkFrameChange = () => {
      const currentFrameFromProvider = frameProvider.currentFrame;
      const currentFrameFromStorage = localStorage.getItem('selectedFrame');
      
      if (currentFrameFromProvider && currentFrameFromProvider !== selectedFrame) {
        console.log('🔄 Frame changed via frameProvider:', currentFrameFromProvider);
        setSelectedFrame(currentFrameFromProvider);
        
        const config = getFrameConfig(currentFrameFromProvider);
        if (config) {
          setFrameConfig(config);
          setFrameImage(getFrameImage(currentFrameFromProvider));
          console.log('✅ Updated frame config:', config);
        }
      } else if (currentFrameFromStorage && currentFrameFromStorage !== selectedFrame) {
        console.log('🔄 Frame changed via localStorage:', currentFrameFromStorage);
        setSelectedFrame(currentFrameFromStorage);
        
        const config = getFrameConfig(currentFrameFromStorage);
        if (config) {
          setFrameConfig(config);
          setFrameImage(getFrameImage(currentFrameFromStorage));
          console.log('✅ Updated frame config:', config);
        }
      }
    };

    // Check immediately
    checkFrameChange();
    
    // Set up polling to check for changes (since we don't have events)
    const interval = setInterval(checkFrameChange, 500);
    
    return () => clearInterval(interval);
  }, [selectedFrame]);

  // Reset drag state on dragend event (global failsafe)
  useEffect(() => {
    const handleDragEnd = (e) => {
      console.log('🏁 [DnD] Drag ended globally, resetting state');
      setDraggedPhoto(null);
      setDragOverSlot(null);
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape' && draggedPhoto) {
        console.log('⏹️ [DnD] Escape pressed, canceling drag');
        setDraggedPhoto(null);
        setDragOverSlot(null);
      }
    };

    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [draggedPhoto]);

  // Handle drag start
  const handleDragStart = (e, photoIndex, slotIndex) => {
    e.stopPropagation();
    setDraggedPhoto({ photoIndex, slotIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `slot-${slotIndex}`);
    console.log('🎯 [DnD] Drag start dari slot', slotIndex + 1, 'photoIndex:', photoIndex);
  };

  // Handle drag over
  const handleDragOver = (e, slotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(slotIndex);
    e.dataTransfer.dropEffect = 'move';
    console.log('👆 [DnD] Drag over slot', slotIndex + 1);
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if leaving the container completely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSlot(null);
    }
  };

  // Handle drop
  const handleDrop = (e, targetSlotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
    
    console.log('📸 [DnD] Drop ke slot', targetSlotIndex + 1);
    console.log('📸 [DnD] draggedPhoto state:', draggedPhoto);
    
    if (!draggedPhoto) {
      console.log('❌ [DnD] No draggedPhoto state found');
      return;
    }
    
    const { photoIndex: draggedPhotoIndex, slotIndex: sourceSlotIndex } = draggedPhoto;
    
    if (sourceSlotIndex === targetSlotIndex) {
      console.log('❌ [DnD] Same slot, canceling');
      setDraggedPhoto(null);
      return;
    }

    console.log('🔄 [DnD] Swapping slot', sourceSlotIndex + 1, '→', targetSlotIndex + 1);

    // Special handling for frames with duplicate photos (like Testframe2)
    if (frameConfig && frameConfig.duplicatePhotos) {
      console.log('🎯 Processing', frameConfig.id, 'independent slot drag & drop...');

      const newSlotPhotos = { ...slotPhotos };

      const srcSlot = frameConfig.slots[sourceSlotIndex];
      const dstSlot = frameConfig.slots[targetSlotIndex];
      const srcPhotoIdx = srcSlot?.photoIndex ?? sourceSlotIndex;
      const dstPhotoIdx = dstSlot?.photoIndex ?? targetSlotIndex;

      const srcImage = newSlotPhotos[sourceSlotIndex] ?? photos[srcPhotoIdx] ?? null;
      const dstImage = newSlotPhotos[targetSlotIndex] ?? photos[dstPhotoIdx] ?? null;

      newSlotPhotos[sourceSlotIndex] = dstImage;
      newSlotPhotos[targetSlotIndex] = srcImage;

      setSlotPhotos(newSlotPhotos);
      persistSlotPhotos(frameConfig?.id, newSlotPhotos);
      setDraggedPhoto(null);

      // Recalculate smart scales for the two swapped slots only
      console.log(`🔄 Recalculating smart scales for swapped slots: ${sourceSlotIndex + 1} ↔ ${targetSlotIndex + 1}`);
      setTimeout(async () => {
        const affectedSlots = [sourceSlotIndex, targetSlotIndex];
        for (const slotIndex of affectedSlots) {
          const newPhotoForSlot = newSlotPhotos[slotIndex];
          if (newPhotoForSlot) {
            try {
              const smartScale = await calculateSmartScaleAsync(newPhotoForSlot, slotIndex);
              setPhotoTransforms(prev => ({
                ...prev,
                [slotIndex]: {
                  scale: smartScale,
                  translateX: 0,
                  translateY: 0,
                  autoFillScale: smartScale
                }
              }));
              console.log(`✨ Updated smart scale for slot ${slotIndex + 1}: ${smartScale.toFixed(2)}x`);
            } catch (error) {
              console.error(`❌ Failed to update smart scale for slot ${slotIndex + 1}:`, error);
            }
          }
        }
        console.log(`✅ Smart scales updated for swapped slots`);
      }, 100);

      console.log(`🔄 Swapped individual slots in ${frameConfig.id}: slot ${sourceSlotIndex + 1} ↔ slot ${targetSlotIndex + 1}`);
      console.log(`📸 Only these 2 slots changed, other slots remain unchanged`);
      return;
    }

    // Standard drag & drop logic for other frames
    const newPhotos = [...photos];
    const newPhotoPositions = { ...photoPositions };
    const newPhotoTransforms = { ...photoTransforms };
    
    // Swap photos
    const temp = newPhotos[sourceSlotIndex];
    newPhotos[sourceSlotIndex] = newPhotos[targetSlotIndex];
    newPhotos[targetSlotIndex] = temp;
    
    // Swap photo positions
    const tempPos = newPhotoPositions[sourceSlotIndex];
    newPhotoPositions[sourceSlotIndex] = newPhotoPositions[targetSlotIndex];
    newPhotoPositions[targetSlotIndex] = tempPos;
    
    // Swap photo transforms - preserve existing transforms but recalculate later
    const tempTransform = newPhotoTransforms[sourceSlotIndex];
    newPhotoTransforms[sourceSlotIndex] = newPhotoTransforms[targetSlotIndex];
    newPhotoTransforms[targetSlotIndex] = tempTransform;
    
    setPhotos(newPhotos);
    setPhotoPositions(newPhotoPositions);
    setPhotoTransforms(newPhotoTransforms);
    localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
    setDraggedPhoto(null);
    
    // Re-initialize smart scale for swapped photos
    if (frameConfig) {
      console.log(`🔄 Recalculating smart scales for swapped photos (slots ${sourceSlotIndex} ↔ ${targetSlotIndex})`);
      setTimeout(async () => {
        await initializePhotoScale(sourceSlotIndex);
        await initializePhotoScale(targetSlotIndex);
        console.log(`✅ Smart scales updated for swapped photos`);
      }, 100);
    }
    
    console.log(`🔄 Swapped photo from slot ${sourceSlotIndex} to slot ${targetSlotIndex}`);
  };

  // Calculate maximum zoom out scale (minimum scale before gaps appear)
  const calculateMaxZoomOutScale = (slotIndex) => {
    if (!frameConfig || !frameConfig.slots[slotIndex]) return 1;
    
    const slot = frameConfig.slots[slotIndex];
    
    // Use same logic as handlePhotoZoom for minimum scale calculation
    let photoAspectRatio = 4 / 3; // Default camera landscape
    let slotAspectRatio = slot.width / slot.height;
    
    // Calculate minimum scale for edge-to-edge coverage
    let minScaleForCoverage;
    
    // Calculate scale for full coverage
    if (photoAspectRatio > slotAspectRatio) {
      // Photo landscape, slot portrait → fit by height for full coverage
      minScaleForCoverage = 1 / (photoAspectRatio / slotAspectRatio);
    } else {
      // Photo portrait, slot landscape → fit by width for full coverage  
      minScaleForCoverage = slotAspectRatio / photoAspectRatio;
    }
    
    // Apply same bounds as handlePhotoZoom
    let absoluteMinScale = Math.max(0.8, minScaleForCoverage);
    
    console.log(`🔍 Max zoom out for slot ${slotIndex + 1}: ${absoluteMinScale.toFixed(2)}x (minCoverage: ${minScaleForCoverage.toFixed(2)}x)`);
    return absoluteMinScale;
  };

  // Calculate auto-fit scale untuk fit vertical height (ujung atas-bawah foto terlihat)
  const calculateAutoFillScale = (slotIndex) => {
    if (!frameConfig || !frameConfig.slots[slotIndex]) return 1.6;
    
    // Try to get photo image for smart calculation
    const photoImg = getPhotoImageForSlot(slotIndex);
    
    if (photoImg) {
      // Use smart calculation with actual photo dimensions
      return calculateSmartDefaultScale(photoImg, slotIndex, frameConfig);
    }
    
    // Fallback to original logic if photo not available
    const slot = frameConfig.slots[slotIndex];
    
    // Special handling for Testframe4 landscape slots
    if (frameConfig?.id === 'Testframe4') {
      // Testframe4 default to zoom out maksimum + 6 zoom in steps
      console.log(`🎯 Testframe4 slot ${slotIndex + 1}: Setting to MAX ZOOM OUT + 6 zoom in steps`);
      
      const maxZoomOutScale = calculateMaxZoomOutScale(slotIndex);
      
      // Each zoom step is 0.1x increment (same as handlePhotoZoom delta)
      const zoomInSteps = 6;
      const zoomIncrement = 0.1;
      const defaultScale = maxZoomOutScale + (zoomInSteps * zoomIncrement);
      
      console.log(`📏 Testframe4 Slot ${slotIndex + 1}: Default scale = ${defaultScale.toFixed(2)}x (max zoom out: ${maxZoomOutScale.toFixed(2)}x + ${zoomInSteps} steps)`);
      return defaultScale;
    }
    
    // Original logic for portrait frames (Testframe1, 2, 3)
    // Default scale for when photo image not available
    return 1.6; // Conservative default
  };

  // Helper function to get photo image for a slot - ASYNC VERSION
  const getPhotoImageForSlot = (slotIndex) => {
    try {
      if (!photos || !photos[slotIndex]) return null;
      
      // Check if we have duplicate photos (like Testframe2)
      let photoIndex = slotIndex;
      if (frameConfig?.duplicatePhotos && frameConfig.slots[slotIndex]?.photoIndex !== undefined) {
        photoIndex = frameConfig.slots[slotIndex].photoIndex;
      }
      
      if (!photos[photoIndex]) return null;
      
      // For now, return fallback dimensions (will be improved with async loading)
      // Most camera photos are around 4:3 or 16:9 aspect ratio
      // Using representative dimensions for calculation
      return {
        width: 1600, // Representative camera width
        height: 1200 // Representative camera height (4:3 aspect)
      };
    } catch (error) {
      console.log('⚠️ Could not get photo image for smart scale calculation:', error);
      return null;
    }
  };

  // Async function to load photo and calculate smart scale
  const calculateSmartScaleAsync = async (photoDataUrl, slotIndex) => {
    return new Promise((resolve) => {
      if (!photoDataUrl || !frameConfig?.slots[slotIndex]) {
        resolve(1.6); // fallback
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        const smartScale = calculateSmartDefaultScale(img, slotIndex, frameConfig);
        console.log(`✨ Async smart scale for slot ${slotIndex + 1}: ${smartScale.toFixed(2)}x`);
        resolve(smartScale);
      };
      img.onerror = () => {
        console.warn(`⚠️ Failed to load image for smart scale calculation`);
        resolve(1.6); // fallback
      };
      img.src = photoDataUrl;
    });
  };

  // Update photo transforms with smart scale when photos are loaded
  const updateSmartScales = async () => {
    if (!photos || photos.length === 0 || !frameConfig) return;
    
    console.log('🧮 Calculating smart scales for all slots...');
    
    const updates = {};
    
    // For duplicate photo frames, process all slots
    if (frameConfig.duplicatePhotos && frameConfig.slots) {
      for (let slotIndex = 0; slotIndex < frameConfig.slots.length; slotIndex++) {
        const slot = frameConfig.slots[slotIndex];
        
        // Use slotPhotos if available (for independent slots), otherwise use photos array
        const photoForSlot = slotPhotos[slotIndex] || photos[slot.photoIndex];
        
        if (photoForSlot) {
          try {
            const smartScale = await calculateSmartScaleAsync(photoForSlot, slotIndex);
            
            // Keep existing transforms if they exist, only update scale
            const existingTransform = photoTransforms[slotIndex] || { translateX: 0, translateY: 0 };
            
            updates[slotIndex] = {
              ...existingTransform,
              scale: smartScale,
              autoFillScale: smartScale
            };
            console.log(`✨ Smart scale for slot ${slotIndex + 1}: ${smartScale.toFixed(2)}x`);
          } catch (error) {
            console.warn(`⚠️ Failed to calculate smart scale for slot ${slotIndex + 1}:`, error);
          }
        }
      }
    } else {
      // Standard processing for non-duplicate frames
      for (let i = 0; i < photos.length; i++) {
        try {
          const smartScale = await calculateSmartScaleAsync(photos[i], i);
          
          // Keep existing transforms if they exist, only update scale
          const existingTransform = photoTransforms[i] || { translateX: 0, translateY: 0 };
          
          updates[i] = {
            ...existingTransform,
            scale: smartScale,
            autoFillScale: smartScale
          };
        } catch (error) {
          console.error(`❌ Error calculating smart scale for photo ${i + 1}:`, error);
        }
      }
    }
    
    if (Object.keys(updates).length > 0) {
      setPhotoTransforms(prev => ({
        ...prev,
        ...updates
      }));
      console.log('✅ Smart scales updated for', Object.keys(updates).length, 'slots');
    }
  };

  // Effect to update smart scales when photos or frame config changes
  useEffect(() => {
    if (photos.length > 0 && frameConfig) {
      // Small delay to ensure everything is properly loaded
      const timer = setTimeout(() => {
        updateSmartScales();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [photos.length, frameConfig?.id]);

  // Helper function to get photo image for a slot - SYNC VERSION FOR IMMEDIATE USE

  const calculateAutoFillScale_ORIGINAL = (slotIndex) => {
    if (!frameConfig || !frameConfig.slots[slotIndex]) return 1;
    
    const slot = frameConfig.slots[slotIndex];
    
    // Dynamic calculation based on frame type
    const slotAspectRatio = slot.width / slot.height;
    const photoAspectRatio = 4 / 3; // 1.33 (landscape camera)
    
    // Special handling for Testframe4 landscape slots
    if (frameConfig?.id === 'Testframe4') {
      // Testframe4 default to zoom out maksimum + 6 zoom in steps
      console.log(`🎯 Testframe4 slot ${slotIndex + 1}: Setting to MAX ZOOM OUT + 6 zoom in steps`);
      
      const maxZoomOutScale = calculateMaxZoomOutScale(slotIndex);
      
      // Each zoom step is 0.1x increment (same as handlePhotoZoom delta)
      const zoomInSteps = 6;
      const zoomIncrement = 0.1;
      const defaultScale = maxZoomOutScale + (zoomInSteps * zoomIncrement);
      
      console.log(`📏 Testframe4 Slot ${slotIndex + 1}: Default scale = ${defaultScale.toFixed(2)}x (max zoom out: ${maxZoomOutScale.toFixed(2)}x + ${zoomInSteps} steps)`);
      return defaultScale;
    }
    
    // Original logic for portrait frames (Testframe1, 2, 3)
    // Untuk foto landscape (4:3) dalam slot portrait:
    // Kita ingin foto fit berdasarkan HEIGHT agar seluruh tinggi foto terlihat
    
    // objectFit: contain akan otomatis fit foto dalam slot
    // Kita perlu scale tambahan agar foto mengisi slot height dengan optimal
    
    // Simple approach: scale berdasarkan aspect ratio difference
    // Jika foto landscape masuk slot portrait:
    // Foto akan fit by height (atas-bawah pas), ada space kiri-kanan
    // Scale factor untuk mengoptimalkan tinggi
    const heightFitScale = 1.4; // Base scale untuk height fit
    
    // Adjustment berdasarkan ukuran slot
    const slotSizeAdjustment = 1 / slot.height; // Semakin kecil slot, semakin besar scale
    const finalScale = heightFitScale + (slotSizeAdjustment * 0.3);
    
    // Clamp antara 1.2x - 2.2x untuk range yang reasonable
    const clampedScale = Math.max(1.2, Math.min(2.2, finalScale));
    
    console.log(`📏 Slot ${slotIndex + 1}: Vertical-fit scale = ${clampedScale.toFixed(2)}x (slot: ${(slot.width*100).toFixed(0)}%×${(slot.height*100).toFixed(0)}%)`);
    
    return clampedScale;
  };

  // Initialize auto-fit scale for a photo with smart calculation
  const initializePhotoScale = async (photoIndex) => {
    if (!photos[photoIndex] || !frameConfig) {
      console.warn(`⚠️ Cannot initialize photo scale for slot ${photoIndex + 1}: missing photo or frame config`);
      return;
    }

    try {
      // Use smart scale calculation for better fitting
      const smartScale = await calculateSmartScaleAsync(photos[photoIndex], photoIndex);
      console.log(`🔧 Initializing photo ${photoIndex + 1} with smart scale: ${smartScale.toFixed(2)}x`);

      // For duplicate-photo frames, apply the same smart scale to ALL slots that reference this photoIndex
      if (frameConfig?.duplicatePhotos && Array.isArray(frameConfig.slots)) {
        setPhotoTransforms(prev => {
          const next = { ...prev };
          frameConfig.slots.forEach((slot, slotIndex) => {
            const slotPhotoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
            if (slotPhotoIndex === photoIndex) {
              next[slotIndex] = {
                scale: smartScale,
                translateX: 0,
                translateY: 0,
                autoFillScale: smartScale
              };
            }
          });
          return next;
        });
      } else {
        // Standard behavior: apply to this single index
        setPhotoTransforms(prev => ({
          ...prev,
          [photoIndex]: {
            scale: smartScale,
            translateX: 0,
            translateY: 0,
            autoFillScale: smartScale
          }
        }));
      }
    } catch (error) {
      console.error(`❌ Error initializing smart scale for photo ${photoIndex + 1}:`, error);
      
      // Fallback to basic auto-fit scale
      const autoFitScale = calculateAutoFillScale(photoIndex);
      console.log(`🔧 Fallback: Initializing photo ${photoIndex + 1} with auto-fit scale: ${autoFitScale.toFixed(2)}x`);

      if (frameConfig?.duplicatePhotos && Array.isArray(frameConfig.slots)) {
        // Apply fallback consistently to all related slots
        setPhotoTransforms(prev => {
          const next = { ...prev };
          frameConfig.slots.forEach((slot, slotIndex) => {
            const slotPhotoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
            if (slotPhotoIndex === photoIndex) {
              next[slotIndex] = {
                scale: autoFitScale,
                translateX: 0,
                translateY: 0,
                autoFillScale: autoFitScale
              };
            }
          });
          return next;
        });
      } else {
        setPhotoTransforms(prev => ({
          ...prev,
          [photoIndex]: {
            scale: autoFitScale,
            translateX: 0,
            translateY: 0,
            autoFillScale: autoFitScale
          }
        }));
      }
    }
  };

  // Fungsi untuk menghitung ukuran slot dalam pixel
  const calculateSlotDimensions = (frameConfig, slotIndex) => {
    const FRAME_WIDTH = 350; // px - ukuran frame di preview
    const FRAME_HEIGHT = 525; // px - aspect ratio 2:3
    
    const slot = frameConfig.slots[slotIndex];
    if (!slot) return null;
    
    return {
      left: slot.left * FRAME_WIDTH,      // px dari kiri
      top: slot.top * FRAME_HEIGHT,       // px dari atas  
      width: slot.width * FRAME_WIDTH,    // lebar slot dalam px
      height: slot.height * FRAME_HEIGHT, // tinggi slot dalam px
      aspectRatio: slot.width / slot.height // rasio slot
    };
  };

  // Fungsi untuk menghitung style photo viewport (preserving full image)
  const calculatePhotoCropStyle = (frameConfig, slotIndex) => {
    const slotDimensions = calculateSlotDimensions(frameConfig, slotIndex);
    if (!slotDimensions) return {};
    
    const transform = photoTransforms[slotIndex] || { scale: 1, translateX: 0, translateY: 0 };
    
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'contain', // Preserve entire image, no permanent cropping
      objectPosition: 'center center',
      transform: `scale(${transform.scale}) translate(${transform.translateX}px, ${transform.translateY}px)`,
      transformOrigin: 'center center',
      transition: 'transform 0.2s ease'
    };
  };

  // Fungsi untuk reload frame config secara live  
  const reloadFrameConfig = async () => {
    if (isReloading) return; // Prevent multiple calls
    
    setIsReloading(true);
    
    try {
      const frameId = localStorage.getItem('selectedFrame') || 'Testframe1';
      console.log('🔄 Attempting to reload config via manager for:', frameId);
      const newConfig = await reloadFrameConfigFromManager(frameId);
      if (newConfig) {
        setFrameConfig(newConfig);
        localStorage.setItem('frameConfig', JSON.stringify(newConfig));
        setConfigReloadKey(prev => prev + 1);
        console.log('✅ Frame config reloaded (manager):', newConfig);
        // Re-apply smart scale after config reload
        setTimeout(async () => {
          for (const [index] of photos.entries()) {
            await initializePhotoScale(index);
          }
        }, 150);
      } else {
        console.warn('⚠️ Manager reload returned null, using fallback getFrameConfig');
        const fallback = getFrameConfig(frameId);
        if (fallback) {
          setFrameConfig(fallback);
          localStorage.setItem('frameConfig', JSON.stringify(fallback));
          setConfigReloadKey(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('❌ Failed to reload frame config:', error);
    } finally {
      setIsReloading(false);
    }
  };

  // Handle photo zoom (dengan edge-to-edge boundaries)
  const handlePhotoZoom = (photoIndex, delta) => {
    setPhotoTransforms(prev => {
      const current = prev[photoIndex] || { scale: 1, translateX: 0, translateY: 0, autoFillScale: 1 };
      const autoFillScale = current.autoFillScale || calculateAutoFillScale(photoIndex);
      
      // Calculate minimum scale untuk edge-to-edge coverage
      const slot = frameConfig?.slots[photoIndex];
      if (!slot) return prev;
      
      // Get aspect ratios dynamically based on frame configuration
      let photoAspectRatio = 4 / 3; // Default camera landscape
      let slotAspectRatio = slot.width / slot.height;
      
      // Minimum scale agar foto edge bertemu slot edge (no gaps)
      let minScaleForCoverage;
      let absoluteMinScale;
      
      // Special handling for Testframe4 - use left/right boundary
      if (frameConfig?.id === 'Testframe4') {
        console.log(`🎯 Testframe4 slot ${photoIndex + 1}: Using LEFT/RIGHT boundary for zoom out`);
        
        // For Testframe4, minimum zoom out is when photo width fits slot width exactly
        // This means left and right edges of photo touch slot boundaries
        absoluteMinScale = 1.0; // Width-fit scale
        
        console.log(`📐 Testframe4 zoom boundary: ${absoluteMinScale.toFixed(2)}x (width-fit)`);
      } else {
        // Original logic for other frames (Testframe1, 2, 3)
        if (photoAspectRatio > slotAspectRatio) {
          // Foto landscape, slot portrait → fit by height untuk full coverage
          minScaleForCoverage = 1 / (photoAspectRatio / slotAspectRatio);
        } else {
          // Foto portrait, slot landscape → fit by width untuk full coverage  
          minScaleForCoverage = slotAspectRatio / photoAspectRatio;
        }
        
        absoluteMinScale = Math.max(0.8, minScaleForCoverage);
      }
      
      const maxScale = 4;
      
      const newScale = Math.max(absoluteMinScale, Math.min(maxScale, current.scale + delta * 0.1));
      
      // Auto-adjust pan untuk maintain edge-to-edge setelah zoom
      const adjustedTransform = adjustPanForEdgeBoundaries(current, newScale, photoIndex);
      
      console.log(`🔍 Photo ${photoIndex + 1}: Zoom ${delta > 0 ? 'IN' : 'OUT'} to ${newScale.toFixed(2)}x (min: ${absoluteMinScale.toFixed(2)}x for ${frameConfig?.id || 'unknown'} coverage)`);
      
      return {
        ...prev,
        [photoIndex]: {
          ...adjustedTransform,
          scale: newScale,
          autoFillScale: autoFillScale
        }
      };
    });
  };

  // Helper function untuk adjust pan berdasarkan edge boundaries
  const adjustPanForEdgeBoundaries = (current, newScale, photoIndex) => {
    const slot = frameConfig?.slots[photoIndex];
    if (!slot) return current;
    
    // Dynamic aspect ratio based on frame type
    let photoAspectRatio = 4 / 3; // Default camera landscape
    let slotAspectRatio = slot.width / slot.height;
    
    // Calculate foto dimensions setelah scale
    let photoWidthInSlot, photoHeightInSlot;
    
    // Special handling for Testframe4 - width-fit approach
    if (frameConfig?.id === 'Testframe4') {
      console.log(`🎯 Testframe4 boundary adjustment for slot ${photoIndex + 1}: WIDTH-FIT approach`);
      
      // For width-fit: photo width always fits slot width (100%)
      photoWidthInSlot = 100; // Photo width = slot width
      photoHeightInSlot = (100 / photoAspectRatio) * slotAspectRatio; // Proportional height
      
      // At minimum zoom out (1.0x), there should be no horizontal translate allowed
      // Only vertical translate is allowed when photo height > slot height
      const scaledPhotoWidth = photoWidthInSlot * newScale;
      const scaledPhotoHeight = photoHeightInSlot * newScale;
      
      // For width-fit, horizontal translate should be very limited
      const maxTranslateXPx = Math.max(0, (scaledPhotoWidth - 100) / 2) * 2.0; // Limited horizontal movement
      const maxTranslateYPx = Math.max(0, (scaledPhotoHeight - 100) / 2) * 4.0; // More vertical freedom
      
      console.log(`📐 Testframe4 bounds: X±${maxTranslateXPx.toFixed(1)}px, Y±${maxTranslateYPx.toFixed(1)}px (scale: ${newScale.toFixed(2)}x)`);
      
      return {
        ...current,
        translateX: Math.max(-maxTranslateXPx, Math.min(maxTranslateXPx, current.translateX)),
        translateY: Math.max(-maxTranslateYPx, Math.min(maxTranslateYPx, current.translateY))
      };
    }
    
    // Original logic for other frames (Testframe1, 2, 3)
    if (photoAspectRatio > slotAspectRatio) {
      photoWidthInSlot = 100;
      photoHeightInSlot = (100 / photoAspectRatio) * slotAspectRatio;
    } else {
      photoHeightInSlot = 100;
      photoWidthInSlot = (100 * photoAspectRatio) / slotAspectRatio;
    }
    
    const scaledPhotoWidth = photoWidthInSlot * newScale;
    const scaledPhotoHeight = photoHeightInSlot * newScale;
    
    // Standard boundaries for portrait frames
    const maxTranslateXPx = Math.max(0, (scaledPhotoWidth - 100) / 2) * 3.5;
    const maxTranslateYPx = Math.max(0, (scaledPhotoHeight - 100) / 2) * 5.25;
    
    return {
      ...current,
      translateX: Math.max(-maxTranslateXPx, Math.min(maxTranslateXPx, current.translateX)),
      translateY: Math.max(-maxTranslateYPx, Math.min(maxTranslateYPx, current.translateY))
    };
  };

    // Handle photo pan (dengan edge-to-edge boundaries)
  const handlePhotoPan = (photoIndex, deltaX, deltaY) => {
    setPhotoTransforms(prev => {
      const current = prev[photoIndex] || { scale: 1, translateX: 0, translateY: 0, autoFillScale: 1 };
      const autoFillScale = current.autoFillScale || 1;
      const scale = current.scale;
      
      // Calculate exact boundaries berdasarkan foto dan slot dimensions
      const slot = frameConfig?.slots[photoIndex];
      if (!slot) return prev;
      
      // Foto dimensions setelah scale (assuming objectFit contain)
      const photoAspectRatio = 4 / 3; // Camera landscape
      const slotAspectRatio = slot.width / slot.height;
      
      // Calculate actual foto size dalam slot setelah objectFit contain + scale
      let photoWidthInSlot, photoHeightInSlot;
      
      if (photoAspectRatio > slotAspectRatio) {
        // Foto lebih landscape dari slot → foto fit by width
        photoWidthInSlot = 100; // 100% slot width
        photoHeightInSlot = (100 / photoAspectRatio) * slotAspectRatio; // Proportional height
      } else {
        // Foto lebih portrait dari slot → foto fit by height  
        photoHeightInSlot = 100; // 100% slot height
        photoWidthInSlot = (100 * photoAspectRatio) / slotAspectRatio; // Proportional width
      }
      
      // Apply scale to foto dimensions
      const scaledPhotoWidth = photoWidthInSlot * scale;
      const scaledPhotoHeight = photoHeightInSlot * scale;
      
      // Calculate maximum translate untuk edge-to-edge boundaries
      // Foto tidak boleh geser sampai ada gap antara foto edge dan slot edge
      const maxTranslateX = Math.max(0, (scaledPhotoWidth - 100) / 2); // Half of overflow
      const maxTranslateY = Math.max(0, (scaledPhotoHeight - 100) / 2); // Half of overflow
      
      // Convert percentage to pixels (approximate, untuk visual feedback)
      const maxTranslateXPx = maxTranslateX * 3.5; // Slot width ≈ 350px * slot.width
      const maxTranslateYPx = maxTranslateY * 5.25; // Slot height ≈ 525px * slot.height
      
      const newTranslateX = Math.max(-maxTranslateXPx, Math.min(maxTranslateXPx, current.translateX + deltaX));
      const newTranslateY = Math.max(-maxTranslateYPx, Math.min(maxTranslateYPx, current.translateY + deltaY));
      
      console.log(`📍 Photo ${photoIndex + 1}: Pan range ±${maxTranslateXPx.toFixed(0)}px×${maxTranslateYPx.toFixed(0)}px (scaled foto: ${scaledPhotoWidth.toFixed(0)}%×${scaledPhotoHeight.toFixed(0)}%)`);
      
      return {
        ...prev,
        [photoIndex]: {
          ...current,
          translateX: newTranslateX,
          translateY: newTranslateY
        }
      };
    });
  };

  // Reset photo transform (ke auto-fit optimal)
  const resetPhotoTransform = (photoIndex) => {
    const autoFillScale = calculateAutoFillScale(photoIndex);
    console.log(`🔄 Reset Photo ${photoIndex + 1} to auto-fit: ${autoFillScale.toFixed(2)}x with centered position`);
    
    setPhotoTransforms(prev => ({
      ...prev,
      [photoIndex]: { 
        scale: autoFillScale, 
        translateX: 0, // Reset ke center
        translateY: 0, // Reset ke center
        autoFillScale: autoFillScale
      }
    }));
  };

  // Handle mouse down for pan
  const handlePhotoMouseDown = (e, photoIndex) => {
    if (selectedPhotoForEdit === photoIndex && e.button === 0) { // Left click only
      setIsDraggingPhoto(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  // Handle mouse move for pan
  const handlePhotoMouseMove = (e, photoIndex) => {
    if (isDraggingPhoto && selectedPhotoForEdit === photoIndex) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      handlePhotoPan(photoIndex, deltaX * 0.5, deltaY * 0.5); // Reduce sensitivity
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  // Handle mouse up for pan
  const handlePhotoMouseUp = () => {
    setIsDraggingPhoto(false);
  };

  // Debug: Calculate slot dimensions in pixels
  const calculateSlotPixels = (frameConfig, slotIndex) => {
    const FRAME_WIDTH = 350; // px
    const FRAME_HEIGHT = 525; // px
    
    const slot = frameConfig.slots[slotIndex];
    if (!slot) return null;
    
    return {
      left: Math.round(slot.left * FRAME_WIDTH),
      top: Math.round(slot.top * FRAME_HEIGHT),
      width: Math.round(slot.width * FRAME_WIDTH),
      height: Math.round(slot.height * FRAME_HEIGHT),
      aspectRatio: slot.aspectRatio,
      calculatedRatio: (slot.width * FRAME_WIDTH) / (slot.height * FRAME_HEIGHT)
    };
  };

  // Debug function untuk melihat state saat save
  const debugSaveState = () => {
    console.log('🔍 DEBUG SAVE STATE:');
    console.log('📷 Photos:', photos);
    console.log('🖼️ Frame Config:', frameConfig);
    console.log('🎯 Selected Frame:', selectedFrame);
    console.log('🔧 Photo Transforms:', photoTransforms);
    console.log('🖼️ Frame Image:', frameImage);
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple saves
    
    debugSaveState(); // Debug current state
    
    setIsSaving(true);
    try {
      console.log('🎪 Starting save process...');
      console.log('🔧 Current photoTransforms state:', photoTransforms);
      console.log('🔧 PhotoTransforms keys:', Object.keys(photoTransforms));
      console.log('🔧 Photos length:', photos.length);
      console.log('📷 Photos available:', photos.length);
      console.log('🖼️ Frame config:', frameConfig);
      console.log('🎯 Selected frame:', selectedFrame);
      
      // DEBUG: Check frameConfig slots untuk Testframe4
      if (frameConfig.id === 'Testframe4') {
        console.log('🔍 TESTFRAME4 DEBUG - Slot configurations:');
        frameConfig.slots.forEach((slot, index) => {
          console.log(`  Slot ${index + 1}:`, {
            left: slot.left + '%',
            top: slot.top + '%', 
            width: slot.width + '%',
            height: slot.height + '%'
          });
        });
      }
      
      // Create canvas untuk menggabungkan frame dan foto
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size sesuai frame aspect ratio dari preview
      let frameAspectRatio, canvasWidth, canvasHeight;
      
      // Dynamic sizing based on frame type
      if (frameConfig.id === 'Testframe4') {
        // Testframe4 has portrait frame but landscape slots
        frameAspectRatio = 2 / 3; // Portrait frame like others
        canvasWidth = 800;
        canvasHeight = canvasWidth / frameAspectRatio; // 800 / (2/3) = 1200
        console.log('🎯 Testframe4 canvas sizing: portrait frame with landscape slots');
      } else {
        // Other frames (Testframe1, 2, 3)
        frameAspectRatio = 2 / 3; // Frame portrait 2:3 ratio seperti di preview
        canvasWidth = 800;
        canvasHeight = canvasWidth / frameAspectRatio; // 800 / (2/3) = 1200
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      console.log('✅ Canvas created with aspect ratio:', canvasWidth, 'x', canvasHeight, `(${frameConfig.id})`);
      
      // Fill background dengan frame color (blue) seperti di preview
      ctx.fillStyle = '#2563eb'; // Blue color like the frame
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      console.log('✅ Canvas background filled with blue frame color');
      
      if (!frameConfig || !frameConfig.slots) {
        console.error('❌ Frame configuration not found or invalid');
        alert('Frame configuration not found');
        return;
      }
      
      if (photos.length === 0) {
        console.error('❌ No photos to save');
        alert('No photos to save');
        return;
      }
      
      // Load semua foto yang diperlukan
      console.log('📸 Loading photos for canvas...');
      console.log('📷 Photos data check:');
      console.log('Photos array length:', photos.length);
      console.log('Photos array:', photos);
      
      photos.forEach((photo, index) => {
        console.log(`Photo ${index + 1}:`, {
          hasData: !!photo,
          dataType: typeof photo,
          dataLength: photo ? photo.length : 0,
          startsWithData: photo ? photo.startsWith('data:') : false,
          preview: photo ? photo.substring(0, 50) + '...' : 'NO DATA'
        });
      });
      
      if (photos.length === 0) {
        console.error('❌ NO PHOTOS FOUND! Check photos array');
        alert('No photos found to save!');
        return;
      }
      const photoPromises = photos.map((photoDataUrl, index) => {
        return new Promise((resolve) => {
          if (!photoDataUrl) {
            console.warn(`⚠️ Photo ${index + 1}: No data URL`);
            resolve({ img: null, index });
            return;
          }
          
          const img = new Image();
          img.onload = () => {
            console.log(`✅ Photo ${index + 1}: Loaded (${img.width}x${img.height})`);
            resolve({ img, index });
          };
          img.onerror = (error) => {
            console.error(`❌ Photo ${index + 1}: Failed to load`, error);
            resolve({ img: null, index });
          };
          img.src = photoDataUrl;
        });
      });
      
      const loadedPhotos = await Promise.all(photoPromises);
      console.log('📸 Photos loaded result:', loadedPhotos.filter(p => p.img).length, 'of', loadedPhotos.length);
      console.log('📸 Loaded photos details:', loadedPhotos.map(p => ({ 
        index: p.index, 
        hasImg: !!p.img, 
        imgSize: p.img ? `${p.img.width}x${p.img.height}` : 'N/A' 
      })));
      
      // Check photoTransforms
      console.log('🔧 Photo transforms:', photoTransforms);
      console.log('🔧 Transform keys:', Object.keys(photoTransforms));
      
      if (loadedPhotos.filter(p => p.img).length === 0) {
        console.error('❌ NO PHOTOS LOADED SUCCESSFULLY!');
        alert('Failed to load any photos!');
        return;
      }
      
      // Initialize rendered count
      let renderedCount = 0;
      
      // Render photos
      console.log('🖼️ Starting photo rendering loop...');
      console.log('🖼️ Canvas size:', canvasWidth, 'x', canvasHeight);
      
      // FOR DUPLICATE PHOTO FRAMES: iterate through slots instead of photos
      if (frameConfig.duplicatePhotos) {
        console.log('🎯 DUPLICATE PHOTOS MODE: Processing all', frameConfig.slots.length, 'slots for', frameConfig.id);
        console.log('📋 Current slotPhotos state:', slotPhotos);
        console.log('📋 Current photoTransforms state:', photoTransforms);
        
        for (let slotIndex = 0; slotIndex < frameConfig.slots.length; slotIndex++) {
          const currentSlot = frameConfig.slots[slotIndex];
          
          // ✅ PERBAIKAN: Gunakan slotPhotos yang actual (setelah drag & drop) 
          // bukan currentSlot.photoIndex yang statis dari config
          let actualPhotoSrc;
          let actualPhotoIndex;
          
          if (slotPhotos[slotIndex]) {
            // Slot sudah di-assign foto specific (dari drag & drop atau manual assignment)
            actualPhotoSrc = slotPhotos[slotIndex];
            actualPhotoIndex = slotIndex; // Use slotIndex as identifier for transforms
            console.log(`🎯 Slot ${slotIndex + 1}: Using slot-specific photo from slotPhotos`);
          } else {
            // Fallback ke config default photoIndex
            actualPhotoIndex = currentSlot.photoIndex;
            actualPhotoSrc = photos[actualPhotoIndex];
            console.log(`🎯 Slot ${slotIndex + 1}: Using fallback photo index ${actualPhotoIndex}`);
          }
          
          console.log(`🔄 Processing slot ${slotIndex + 1}:`);
          console.log(`  - Config photoIndex: ${currentSlot.photoIndex}`);
          console.log(`  - Actual photo source: ${actualPhotoSrc ? 'Available' : 'Not available'}`);
          console.log(`  - SlotPhotos entry: ${slotPhotos[slotIndex] ? 'Yes' : 'No'}`);
          
          if (!actualPhotoSrc) {
            console.warn(`⚠️ Skipping slot ${slotIndex + 1}: No photo available`);
            continue;
          }
          
          // Load image from actual photo source
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = () => {
              console.log(`✅ Slot ${slotIndex + 1}: Photo loaded (${img.width}x${img.height})`);
              resolve();
            };
            img.onerror = () => {
              console.error(`❌ Slot ${slotIndex + 1}: Failed to load photo`);
              resolve(); // Continue with next photo
            };
            img.src = actualPhotoSrc;
          });
          
          // Skip if image failed to load
          if (!img.complete || img.naturalWidth === 0) {
            console.warn(`⚠️ Skipping slot ${slotIndex + 1}: Image failed to load`);
            continue;
          }
          
          // Get default scale based on frame type
          let defaultScale = 1.6; // Standard for other frames
          if (frameConfig.id === 'Testframe4') {
            defaultScale = 1.1; // Testframe4 specific default (max zoom out + 6 steps)
          }
          
          const transform = photoTransforms[slotIndex] || { scale: defaultScale, translateX: 0, translateY: 0 };
          
          console.log(`🔍 Slot ${slotIndex + 1} transform debug:`);
          console.log(`  - Slot config photoIndex:`, currentSlot.photoIndex);
          console.log(`  - Using actual photo source:`, actualPhotoSrc ? 'Custom' : 'Default');
          console.log(`  - photoTransforms[${slotIndex}]:`, photoTransforms[slotIndex]);
          console.log(`  - Using transform:`, transform);
          
          // KOORDINAT MAPPING: Preview (350px) -> Canvas (800px)
          const PREVIEW_WIDTH = 350;
          const PREVIEW_HEIGHT = 525; // aspect ratio 2:3
          const SCALE_RATIO = canvasWidth / PREVIEW_WIDTH; // 800/350 = 2.286
          
          // Calculate slot position dalam preview coordinates
          const previewSlotX = currentSlot.left * PREVIEW_WIDTH;
          const previewSlotY = currentSlot.top * PREVIEW_HEIGHT;
          const previewSlotWidth = currentSlot.width * PREVIEW_WIDTH;
          const previewSlotHeight = currentSlot.height * PREVIEW_HEIGHT;
          
          // Convert ke canvas coordinates 
          const slotX = previewSlotX * SCALE_RATIO;
          const slotY = previewSlotY * SCALE_RATIO;
          const slotWidth = previewSlotWidth * SCALE_RATIO;
          const slotHeight = previewSlotHeight * SCALE_RATIO;
          
          // MIMIC CSS objectFit: contain behavior
          const imgAspectRatio = img.width / img.height;
          const slotAspectRatio = slotWidth / slotHeight;
          
          let photoDisplayWidth, photoDisplayHeight;
          
          if (imgAspectRatio > slotAspectRatio) {
            // Photo lebih wide - fit by width
            photoDisplayWidth = slotWidth;
            photoDisplayHeight = slotWidth / imgAspectRatio;
          } else {
            // Photo lebih tall - fit by height  
            photoDisplayWidth = slotHeight * imgAspectRatio;
            photoDisplayHeight = slotHeight;
          }
          
          // Center position dalam slot
          const slotCenterX = slotX + (slotWidth / 2);
          const slotCenterY = slotY + (slotHeight / 2);
          
          // Apply user transforms
          const scaledTranslateX = (transform.translateX || 0) * SCALE_RATIO;
          const scaledTranslateY = (transform.translateY || 0) * SCALE_RATIO;
          
          // Render photo dengan clipping untuk clean edges
          ctx.save();
          
          // Clip to slot area  
          ctx.beginPath();
          ctx.rect(slotX, slotY, slotWidth, slotHeight);
          ctx.clip();
          
          // Calculate final photo dimensions dengan scale applied
          const finalPhotoWidth = photoDisplayWidth * transform.scale;
          const finalPhotoHeight = photoDisplayHeight * transform.scale;
          
          // Calculate final position dengan scale dari center + translate
          const finalPhotoX = slotCenterX - (finalPhotoWidth / 2) + scaledTranslateX;
          const finalPhotoY = slotCenterY - (finalPhotoHeight / 2) + scaledTranslateY;
          
          console.log(`📐 Slot ${slotIndex + 1}: Final photo ${finalPhotoWidth.toFixed(1)}x${finalPhotoHeight.toFixed(1)} at ${finalPhotoX.toFixed(1)},${finalPhotoY.toFixed(1)}`);
          
          // Draw photo dengan ukuran dan posisi final
          ctx.drawImage(img, finalPhotoX, finalPhotoY, finalPhotoWidth, finalPhotoHeight);
          
          ctx.restore();
          
          renderedCount++;
          console.log(`✅ Slot ${slotIndex + 1}: Rendered successfully`);
        }
        
      } else {
        // Standard logic for non-duplicate frames  
        for (const { img, index } of loadedPhotos) {
        console.log(`Processing standard photo...`);
        console.log(`🔥 LOOP DEBUG: img exists:`, !!img);
        console.log(`🔥 LOOP DEBUG: img details:`, img ? `${img.width}x${img.height}` : 'NULL');
        
        // FORCE DRAW: Draw something untuk setiap loop iteration
        // ctx.fillStyle = 'purple';
        // ctx.fillRect(400 + (index * 50), 100, 40, 40);
        // Debug draw removed
        
        console.log(`�🔄 Processing photo ${index + 1}...`);
        if (!img) {
          console.warn(`⚠️ Skipping photo ${index + 1}: Failed to load`);
          continue;
        }
        
        if (!frameConfig.slots[index]) {
          console.warn(`⚠️ Skipping photo ${index + 1}: No slot config`);
          continue;
        }
        
        console.log(`✅ Photo ${index + 1}: Ready to process (img: ${img.width}x${img.height})`);
        
        // Get default scale based on frame type
        let defaultScale = 1.6; // Standard for other frames
        if (frameConfig.id === 'Testframe4') {
          defaultScale = 1.1; // Testframe4 specific default (max zoom out + 6 steps)
        }
        
        const standardSlot = frameConfig.slots[index];
        
        // Handle duplicate photos: use slot.photoIndex if available
        const standardPhotoIndex = standardSlot.photoIndex !== undefined ? standardSlot.photoIndex : index;
        const transform = photoTransforms[index] || { scale: defaultScale, translateX: 0, translateY: 0 };
        
        console.log(`🔍 Slot ${index + 1} (Photo ${standardPhotoIndex + 1}) transform debug:`);
        console.log(`  - Slot config photoIndex:`, standardSlot.photoIndex);
        console.log(`  - Using photo index:`, standardPhotoIndex);
        console.log(`  - photoTransforms[${index}]:`, photoTransforms[index]);
        console.log(`  - Using transform:`, transform);
        console.log(`  - Default scale would be:`, defaultScale);
        console.log(`  - Is using default fallback?:`, !photoTransforms[index]);
        
        console.log(`🎯 Processing photo ${index + 1} for ${frameConfig.id}:`);
        
        // KOORDINAT MAPPING: Preview (350px) -> Canvas (800px)
        const PREVIEW_WIDTH = 350;
        const PREVIEW_HEIGHT = 525; // aspect ratio 2:3
        const SCALE_RATIO = canvasWidth / PREVIEW_WIDTH; // 800/350 = 2.286
        
        console.log(`🔍 COORDINATE MAPPING:`)
        console.log(`  - Preview size: ${PREVIEW_WIDTH}x${PREVIEW_HEIGHT}`)
        console.log(`  - Canvas size: ${canvasWidth}x${canvasHeight}`)
        console.log(`  - Scale ratio: ${SCALE_RATIO.toFixed(3)}`)
        
        // Calculate slot position dalam preview coordinates (seperti yang dilihat user)
        const previewSlotX = standardSlot.left * PREVIEW_WIDTH;
        const previewSlotY = standardSlot.top * PREVIEW_HEIGHT;
        const previewSlotWidth = standardSlot.width * PREVIEW_WIDTH;
        const previewSlotHeight = standardSlot.height * PREVIEW_HEIGHT;
        
        // Convert ke canvas coordinates 
        const slotX = previewSlotX * SCALE_RATIO;
        const slotY = previewSlotY * SCALE_RATIO;
        const slotWidth = previewSlotWidth * SCALE_RATIO;
        const slotHeight = previewSlotHeight * SCALE_RATIO;
        
        console.log(`🎯 Slot ${index + 1} coordinates mapping:`);
        console.log(`  - Preview slot: ${previewSlotX.toFixed(1)}, ${previewSlotY.toFixed(1)} (${previewSlotWidth.toFixed(1)}x${previewSlotHeight.toFixed(1)})`);
        console.log(`  - Canvas slot: ${slotX.toFixed(1)}, ${slotY.toFixed(1)} (${slotWidth.toFixed(1)}x${slotHeight.toFixed(1)})`);
        
        // MIMIC CSS objectFit: contain behavior
        // Hitung bagaimana foto original (img.width x img.height) di-fit ke dalam slot
        
        const imgAspectRatio = img.width / img.height;
        const slotAspectRatio = slotWidth / slotHeight;
        
        let photoDisplayWidth, photoDisplayHeight;
        
        if (imgAspectRatio > slotAspectRatio) {
          // Photo lebih wide - fit by width
          photoDisplayWidth = slotWidth;
          photoDisplayHeight = slotWidth / imgAspectRatio;
        } else {
          // Photo lebih tall - fit by height  
          photoDisplayWidth = slotHeight * imgAspectRatio;
          photoDisplayHeight = slotHeight;
        }
        
        console.log(`📐 ObjectFit contain calculation:`);
        console.log(`  - Image: ${img.width}x${img.height} (ratio: ${imgAspectRatio.toFixed(3)})`);
        console.log(`  - Slot: ${slotWidth.toFixed(1)}x${slotHeight.toFixed(1)} (ratio: ${slotAspectRatio.toFixed(3)})`);
        console.log(`  - Photo display: ${photoDisplayWidth.toFixed(1)}x${photoDisplayHeight.toFixed(1)}`);
        
        // Center position dalam slot (sama seperti objectPosition: center)
        const slotCenterX = slotX + (slotWidth / 2);
        const slotCenterY = slotY + (slotHeight / 2);
        
        // Base photo position (centered in slot seperti objectPosition: center)
        let basePhotoX = slotCenterX - (photoDisplayWidth / 2);
        let basePhotoY = slotCenterY - (photoDisplayHeight / 2);
        
        // Apply user transforms dengan scaling yang tepat
        // translateX/Y dalam preview coordinates, harus di-scale untuk canvas
        const scaledTranslateX = (transform.translateX || 0) * SCALE_RATIO;
        const scaledTranslateY = (transform.translateY || 0) * SCALE_RATIO;
        
        console.log(`🔧 User transforms:`);
        console.log(`  - Scale: ${transform.scale}`);
        console.log(`  - Translate preview: ${transform.translateX || 0}, ${transform.translateY || 0}`);
        console.log(`  - Translate canvas: ${scaledTranslateX.toFixed(1)}, ${scaledTranslateY.toFixed(1)}`);
        
        console.log(`📸 Photo ${index + 1}: Base position ${basePhotoX.toFixed(1)},${basePhotoY.toFixed(1)} scale ${transform.scale}`);
        
        // Render photo dengan clipping untuk clean edges
        ctx.save();
        
        // Clip to slot area  
        ctx.beginPath();
        ctx.rect(slotX, slotY, slotWidth, slotHeight);
        ctx.clip();
        
        // Calculate final photo dimensions dengan scale applied (sama seperti CSS scale)
        const finalPhotoWidth = photoDisplayWidth * transform.scale;
        const finalPhotoHeight = photoDisplayHeight * transform.scale;
        
        // Calculate final position dengan scale dari center + translate
        // CSS: transform-origin: center -> scaling terjadi dari center photo
        const finalPhotoX = slotCenterX - (finalPhotoWidth / 2) + scaledTranslateX;
        const finalPhotoY = slotCenterY - (finalPhotoHeight / 2) + scaledTranslateY;
        
        console.log(`Final photo dimensions: ${finalPhotoWidth.toFixed(1)}x${finalPhotoHeight.toFixed(1)} at ${finalPhotoX.toFixed(1)},${finalPhotoY.toFixed(1)}`);
        
        // Draw photo dengan ukuran dan posisi final
        ctx.drawImage(img, finalPhotoX, finalPhotoY, finalPhotoWidth, finalPhotoHeight);
        
        ctx.restore();
        
        renderedCount++;
        console.log(`Slot/Photo ${index + 1}: Rendered successfully`);
        }
      }
      
      console.log(`Photos rendering complete: ${renderedCount} photos rendered`);
      
      // Render frame overlay on top of photos
      if (frameImage) {
        console.log('Rendering frame overlay...');
        
        try {
          const frameImgElement = new Image();
          await new Promise((resolve, reject) => {
            frameImgElement.onload = () => {
              console.log(`✅ Frame image loaded: ${frameImgElement.width}x${frameImgElement.height}`);
              
              // Draw frame overlay on top of everything
              ctx.drawImage(frameImgElement, 0, 0, canvasWidth, canvasHeight);
              console.log('✅ Frame overlay rendered successfully');
              resolve();
            };
            frameImgElement.onerror = (error) => {
              console.error('❌ Failed to load frame image:', error);
              resolve(); // Continue without frame instead of failing
            };
            frameImgElement.src = frameImage;
          });
        } catch (error) {
          console.error('❌ Frame rendering error:', error);
          // Continue without frame
        }
      } else {
        console.warn('⚠️ No frame image to render');
      }
      
      console.log(`🎨 Final rendering complete: ${renderedCount} photos + frame overlay`);
      
      // Debug: Log canvas final state
      console.log('🔍 Canvas final state - creating blob...');
      
      // Convert canvas ke blob dan trigger download
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('❌ Failed to generate blob from canvas');
          alert('Failed to generate image');
          return;
        }
        
        console.log('✅ Blob created:', blob.size, 'bytes');
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename dengan timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        link.download = `photobooth-${selectedFrame}-${timestamp}.png`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        URL.revokeObjectURL(url);
        
        console.log('💾 Photo saved successfully!');
        alert('Photo saved successfully!');
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('❌ Save error:', error);
      alert('Failed to save photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate unique print code
  const generatePrintCode = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FREMIO-${timestamp}-${random}`;
  };

  // Upload photo and generate QR code
  const uploadPhotoForPrint = async (canvas) => {
    try {
      setIsUploading(true);
      
      // Convert canvas to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 0.95);
      });
      
      // Generate unique code
      const uniqueCode = generatePrintCode();
      
      // Create FormData
      const formData = new FormData();
      formData.append('photo', blob, `fremio-${uniqueCode}.png`);
      formData.append('code', uniqueCode);
      formData.append('frameType', selectedFrame);
      formData.append('timestamp', new Date().toISOString());
      
      // For now, simulate backend with local storage (replace with actual API later)
      // Upload to your backend (you'll need to implement this endpoint)
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/upload-for-print`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        // Fallback: create local URL for testing
        const fileUrl = URL.createObjectURL(blob);
        
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(uniqueCode, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        return {
          code: uniqueCode,
          qrCode: qrCodeDataUrl,
          downloadUrl: fileUrl
        };
      }
      
      const result = await response.json();
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(uniqueCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return {
        code: uniqueCode,
        qrCode: qrCodeDataUrl,
        downloadUrl: result.downloadUrl
      };
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Fallback for demo purposes
      const uniqueCode = generatePrintCode();
      const qrCodeDataUrl = await QRCode.toDataURL(uniqueCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return {
        code: uniqueCode,
        qrCode: qrCodeDataUrl,
        downloadUrl: '#demo'
      };
    } finally {
      setIsUploading(false);
    }
  };

  const handlePrint = async () => {
    try {
      console.log('🖨️ Starting print process...');
      
      // Reuse canvas generation logic from handleSave
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size (same as handleSave)
      let frameAspectRatio = 2 / 3;
      const canvasWidth = 800;
      const canvasHeight = canvasWidth / frameAspectRatio;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Fill background
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Render photos (reuse logic from handleSave)
      if (frameConfig?.duplicatePhotos && selectedFrame === 'Testframe2') {
        // Handle Testframe2 with slot-based photos
        const frameSlots = frameConfig.slots || [];
        
        for (let slotIndex = 0; slotIndex < frameSlots.length; slotIndex++) {
          const slot = frameSlots[slotIndex];
          
          // ✅ PERBAIKAN: Gunakan slotPhotos yang actual (setelah drag & drop)
          let actualPhotoSrc;
          
          if (slotPhotos[slotIndex]) {
            // Slot sudah di-assign foto specific (dari drag & drop atau manual assignment)
            actualPhotoSrc = slotPhotos[slotIndex];
          } else {
            // Fallback ke config default photoIndex
            const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
            actualPhotoSrc = photos[photoIndex];
          }
          
          if (actualPhotoSrc) {
            const img = new Image();
            await new Promise((resolve) => {
              img.onload = () => {
                const transform = photoTransforms[slotIndex] || { translateX: 0, translateY: 0, scale: 1 };
                
                ctx.save();
                
                const slotX = slot.x * canvasWidth / 100;
                const slotY = slot.y * canvasHeight / 100;
                const slotWidth = slot.width * canvasWidth / 100;
                const slotHeight = slot.height * canvasHeight / 100;
                
                // Create clipping region
                ctx.beginPath();
                ctx.rect(slotX, slotY, slotWidth, slotHeight);
                ctx.clip();
                
                // Calculate scaled dimensions
                const scaledWidth = slotWidth * transform.scale;
                const scaledHeight = slotHeight * transform.scale;
                
                // Calculate position with transform offset
                const imgX = slotX + (slotWidth - scaledWidth) / 2 + (transform.translateX || 0);
                const imgY = slotY + (slotHeight - scaledHeight) / 2 + (transform.translateY || 0);
                
                ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
                ctx.restore();
                resolve();
              };
              img.src = actualPhotoSrc;
            });
          }
        }
      } else {
        // Handle regular frames
        const frameSlots = frameConfig?.slots || [];
        
        for (let i = 0; i < frameSlots.length && i < photos.length; i++) {
          if (photos[i]) {
            const img = new Image();
            await new Promise((resolve) => {
              img.onload = () => {
                const slot = frameSlots[i];
                const transform = photoTransforms[i] || { x: 0, y: 0, scale: 1 };
                
                ctx.save();
                
                const slotX = slot.x * canvasWidth / 100;
                const slotY = slot.y * canvasHeight / 100;
                const slotWidth = slot.width * canvasWidth / 100;
                const slotHeight = slot.height * canvasHeight / 100;
                
                // Create clipping region
                ctx.beginPath();
                ctx.rect(slotX, slotY, slotWidth, slotHeight);
                ctx.clip();
                
                // Calculate scaled dimensions
                const scaledWidth = slotWidth * transform.scale;
                const scaledHeight = slotHeight * transform.scale;
                
                // Calculate position with transform offset
                const imgX = slotX + (slotWidth - scaledWidth) / 2 + transform.x;
                const imgY = slotY + (slotHeight - scaledHeight) / 2 + transform.y;
                
                ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
                ctx.restore();
                resolve();
              };
              img.src = photos[i];
            });
          }
        }
      }
      
      // Render frame overlay
      if (frameImage) {
        const frameImg = new Image();
        await new Promise((resolve) => {
          frameImg.onload = () => {
            ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);
            resolve();
          };
          frameImg.src = frameImage;
        });
      }
      
      // Upload and generate QR code
      const printData = await uploadPhotoForPrint(canvas);
      
      setPrintCode(printData);
      setShowPrintModal(true);
      
      console.log('✅ Print code generated:', printData.code);
      
    } catch (error) {
      console.error('❌ Print error:', error);
      alert('Failed to prepare photo for printing. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f1eb 0%, #e8ddd4 100%)',
      padding: '2rem'
    }}>
      {/* Main Editor Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '250px 1fr 250px',
        gap: '2rem',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        
        {/* Left Panel - Toggle Tools */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '1.5rem',
          height: 'fit-content'
        }}>
          <h3 style={{
            textAlign: 'center',
            marginBottom: '2rem',
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#333'
          }}>
            Toggle Tools
          </h3>

          {/* Testing Controls */}
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fff3cd',
            borderRadius: '10px',
            border: '1px solid #ffeaa7'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#856404' }}>Testing Controls</h4>
            
            {/* Debug Info */}
            <div style={{ 
              fontSize: '0.7rem', 
              marginBottom: '0.5rem', 
              padding: '0.3rem', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              color: '#6c757d'
            }}>
              Selected: {selectedFrame || 'None'}<br/>
              Provider: {frameProvider?.currentFrame || 'None'}<br/>
              Storage: {localStorage.getItem('selectedFrame') || 'None'}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={async () => {
                  console.log('🔄 Setting FremioSeries-blue-3...');
                  console.log('📋 Before setFrame - selectedFrame:', selectedFrame);
                  console.log('📋 Before setFrame - frameProvider.currentFrame:', frameProvider.currentFrame);
                  console.log('📋 Before setFrame - localStorage:', localStorage.getItem('selectedFrame'));
                  
                  const result = await frameProvider.setFrame('FremioSeries-blue-3');
                  console.log('📋 setFrame result:', result);
                  
                  console.log('📋 After setFrame - frameProvider.currentFrame:', frameProvider.currentFrame);
                  console.log('📋 After setFrame - localStorage:', localStorage.getItem('selectedFrame'));
                  
                  // Force immediate update
                  const newFrame = frameProvider.currentFrame || localStorage.getItem('selectedFrame');
                  if (newFrame && newFrame !== selectedFrame) {
                    console.log('🔄 Forcing immediate frame update to:', newFrame);
                    setSelectedFrame(newFrame);
                    
                    const config = getFrameConfig(newFrame);
                    if (config) {
                      setFrameConfig(config);
                      setFrameImage(getFrameImage(newFrame));
                      console.log('✅ Forced frame config update:', config);
                    }
                  }
                }}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Set Fremio Blue 3
              </button>
              <button
                onClick={async () => {
                  console.log('🔄 Setting FremioSeries-green-3...');
                  await frameProvider.setFrame('FremioSeries-green-3');
                  // Force re-render dengan mengupdate state
                  setActiveToggle(activeToggle === 'filter' ? 'adjust' : 'filter');
                  setTimeout(() => setActiveToggle('filter'), 10);
                }}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Set Fremio Green 3
              </button>
              <button
                onClick={async () => {
                  console.log('🔄 Setting FremioSeries-blue-4...');
                  await frameProvider.setFrame('FremioSeries-blue-4');
                  // Force re-render dengan mengupdate state
                  setActiveToggle(activeToggle === 'filter' ? 'adjust' : 'filter');
                  setTimeout(() => setActiveToggle('filter'), 10);
                }}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Set Fremio Blue 4
              </button>
              <button
                onClick={() => {
                  console.log('🗑️ Clearing localStorage...');
                  localStorage.removeItem('selectedFrame');
                  localStorage.removeItem('capturedPhotos');
                  frameProvider.currentFrame = null;
                  frameProvider.currentConfig = null;
                  // Force re-render
                  setSelectedFrame('');
                  setFrameConfig(null);
                  setFrameImage(null);
                }}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Clear Test Data
              </button>
              
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Filter Toggle */}
            <button
              onClick={() => setActiveToggle('filter')}
              style={{
                background: activeToggle === 'filter' ? '#E8A889' : '#f8f9fa',
                color: activeToggle === 'filter' ? 'white' : '#333',
                border: 'none',
                borderRadius: '15px',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📷</span>
              Photos
            </button>
            
            {/* Adjust Toggle */}
            <button
              onClick={() => setActiveToggle('adjust')}
              style={{
                background: activeToggle === 'adjust' ? '#E8A889' : '#f8f9fa',
                color: activeToggle === 'adjust' ? 'white' : '#333',
                border: 'none',
                borderRadius: '15px',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>⚙️</span>
              Adjust
            </button>
            
            {/* Frame Info */}
            {frameConfig && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#666'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  Current Frame:
                </div>
                <div>{frameConfig.name}</div>
                <div>{frameConfig.description}</div>
                <div style={{ marginTop: '0.5rem' }}>
                  Slots: {frameConfig.maxCaptures}
                </div>
              </div>
            )}

            {/* Debug Toggle */}
            <button
              onClick={() => setDebugMode(!debugMode)}
              style={{
                background: debugMode ? '#ff6b6b' : '#f8f9fa',
                color: debugMode ? '#fff' : '#666',
                border: 'none',
                borderRadius: '15px',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🔧</span>
              {debugMode ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
        </div>

        {/* Center Panel - Preview */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h3 style={{
            marginBottom: '2rem',
            fontSize: '1.4rem',
            fontWeight: '600',
            color: '#333'
          }}>
            Preview
          </h3>
          
          {/* Frame Preview Area */}
          <div style={{
            background: '#f8f9fa',
            borderRadius: '15px',
            padding: '3rem 2rem',
            marginBottom: '2rem',
            minHeight: '500px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {frameConfig && frameImage ? (
              <div style={{
                position: 'relative',
                width: '350px',
                aspectRatio: '2/3',
                maxWidth: '100%',
                margin: '0 auto'
              }}>
                {/* Frame Image - RIGID, tidak berubah */}
                <img
                  src={frameImage}
                  alt={frameConfig.name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    zIndex: 10,
                    pointerEvents: 'none'
                  }}
                  draggable={false}
                />
                
                {/* Photo Slots - menyesuaikan dengan frame rigid */}
                {frameConfig.slots.map((slot, slotIndex) => (
                  <div
                    key={slot.id}
                    style={{
                      position: 'absolute',
                      left: `${slot.left * 100}%`,
                      top: `${slot.top * 100}%`,
                      width: `${slot.width * 100}%`,
                      height: `${slot.height * 100}%`,
                      zIndex: 5,
                      overflow: 'hidden',
                      backgroundColor: dragOverSlot === slotIndex ? 'rgba(232, 168, 137, 0.2)' : '#f8f9fa',
                      border: dragOverSlot === slotIndex ? '3px solid #E8A889' : 
                             draggedPhoto ? '2px dashed #ccc' : 'none',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box',
                      // Pastikan aspect ratio 4:5 untuk slot
                      aspectRatio: slot.aspectRatio ? slot.aspectRatio.replace(':', '/') : '4/5'
                    }}
                    // Drop zone events - attached to container, not image
                    onDragOver={(e) => handleDragOver(e, slotIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, slotIndex)}
                  >
                    {/* Render photo dengan logic duplicate support */}
                    {(() => {
                      // For Testframe2 with independent slots, use slotPhotos
                      let photoSrc;
                      let photoIndex;
                      
                      if (frameConfig?.duplicatePhotos && slotPhotos[slotIndex]) {
                        // Use independent slot photo for Testframe2
                        photoSrc = slotPhotos[slotIndex];
                        photoIndex = slotIndex; // Use slot index as photo index for display
                      } else {
                        // Standard behavior for other frames
                        photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
                        photoSrc = photos[photoIndex];
                      }
                      
                      return photoSrc && (
                        <div style={{ 
                          position: 'relative', 
                          width: '100%', 
                          height: '100%',
                          overflow: 'hidden'
                        }}>
                          <img
                            src={photoSrc}
                            alt={`Photo ${photoIndex + 1}${slot.photoIndex !== undefined ? ` (duplicate)` : ''}`}
                            style={{
                              ...calculatePhotoCropStyle(frameConfig, slotIndex),
                              opacity: draggedPhoto?.slotIndex === slotIndex ? 0.5 : 1,
                              cursor: draggedPhoto?.slotIndex === slotIndex ? 'grabbing' : 
                                     selectedPhotoForEdit === slotIndex ? 'grab' : 'pointer',
                              filter: draggedPhoto?.slotIndex === slotIndex ? 'blur(1px) brightness(0.8)' : 'none',
                              transform: `${calculatePhotoCropStyle(frameConfig, slotIndex).transform} ${draggedPhoto?.slotIndex === slotIndex ? 'scale(0.9)' : ''}`,
                              transition: draggedPhoto?.slotIndex === slotIndex ? 'none' : 'all 0.2s ease',
                              pointerEvents: draggedPhoto && draggedPhoto.slotIndex !== slotIndex ? 'none' : 'auto'
                            }}
                            draggable={true} // Enable drag for all frames including Testframe2
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, photoIndex, slotIndex);
                            }}
                            onClick={(e) => {
                              // Only handle click if not dragging
                              if (!draggedPhoto) {
                                setSelectedPhotoForEdit(selectedPhotoForEdit === slotIndex ? null : slotIndex);
                              }
                            }}
                            onWheel={(e) => {
                              if (selectedPhotoForEdit === slotIndex && !draggedPhoto) {
                                e.preventDefault();
                                const delta = e.deltaY > 0 ? -1 : 1;
                                handlePhotoZoom(slotIndex, delta);
                              }
                            }}
                            onMouseDown={(e) => {
                              // Only handle mouse down if not in drag mode
                              if (!draggedPhoto) {
                                handlePhotoMouseDown(e, slotIndex);
                              }
                            }}
                            onMouseMove={(e) => {
                              if (!draggedPhoto) {
                                handlePhotoMouseMove(e, slotIndex);
                              }
                            }}
                            onMouseUp={(e) => {
                              if (!draggedPhoto) {
                                handlePhotoMouseUp(e);
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!draggedPhoto) {
                                handlePhotoMouseUp(e);
                              }
                            }}
                          />
                          
                          {/* Modern Photo Edit Controls */}
                          {selectedPhotoForEdit === slotIndex && (
                          <div style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '14px',
                            padding: '4px 8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            zIndex: 20,
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}>
                            {/* Zoom Out Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePhotoZoom(slotIndex, -1);
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: 'white',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                backdropFilter: 'blur(10px)'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                e.target.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.transform = 'scale(1)';
                              }}
                            >
                              −
                            </button>
                            
                            {/* Zoom Level Display */}
                            <div style={{
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: '600',
                              minWidth: '28px',
                              textAlign: 'center',
                              background: 'rgba(255, 255, 255, 0.1)',
                              padding: '3px 6px',
                              borderRadius: '10px',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              {(photoTransforms[slotIndex]?.scale || 1).toFixed(1)}x
                            </div>
                            
                            {/* Zoom In Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePhotoZoom(slotIndex, 1);
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: 'white',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease',
                                backdropFilter: 'blur(10px)'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                e.target.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.transform = 'scale(1)';
                              }}
                            >
                              +
                            </button>
                            
                            {/* Reset Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                resetPhotoTransform(slotIndex);
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: 'white',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                transition: 'all 0.2s ease',
                                backdropFilter: 'blur(10px)'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                e.target.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.transform = 'scale(1)';
                              }}
                            >
                              ↺
                            </button>
                          </div>
                        )}
                      </div>
                      );
                    })()}
                    {(() => {
                      const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
                      const photoSrc = photos[photoIndex];
                      return !photoSrc && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#9ca3af',
                        fontSize: '0.7rem',
                        textAlign: 'center',
                        fontWeight: '500'
                      }}>
                        Slot {slotIndex + 1}
                      </div>
                      );
                    })()}
                  </div>
                ))}
                
                {/* Frame Info */}
                <div style={{
                  position: 'absolute',
                  bottom: '-40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.8rem',
                  color: '#666',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  background: 'rgba(255,255,255,0.9)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {frameConfig.name} | {photos.filter(p => p).length}/{frameConfig.maxCaptures} photos
                </div>

                {/* Debug Overlay */}
                {debugMode && frameConfig.slots.map((slot, slotIndex) => {
                  const pixels = calculateSlotPixels(frameConfig, slotIndex);
                  return (
                    <div
                      key={`debug_${slot.id}`}
                      style={{
                        position: 'absolute',
                        left: `${slot.left * 100}%`,
                        top: `${slot.top * 100}%`,
                        width: `${slot.width * 100}%`,
                        height: `${slot.height * 100}%`,
                        border: '2px dashed #ff0000',
                        background: 'rgba(255, 0, 0, 0.1)',
                        zIndex: 15,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#ff0000',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {slot.id}<br/>
                      {pixels.width}x{pixels.height}px<br/>
                      AR: {pixels.calculatedRatio.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                color: '#666',
                fontSize: '1.1rem',
                textAlign: 'center'
              }}>
                {frameConfig ? 'Loading frame...' : 'No frame selected'}
              </div>
            )}
          </div>

          {/* Save and Print Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Debug Button */}
            <button
              onClick={debugSaveState}
              style={{
                background: '#f0f0f0',
                border: '1px solid #ccc',
                color: '#666',
                borderRadius: '15px',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              🔍 Debug Save Data
            </button>
            
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                background: isSaving ? '#f5f5f5' : '#fff',
                border: '2px solid #E8A889',
                color: isSaving ? '#999' : '#E8A889',
                borderRadius: '25px',
                padding: '0.8rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isSaving ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.target.style.background = '#E8A889';
                  e.target.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaving) {
                  e.target.style.background = '#fff';
                  e.target.style.color = '#E8A889';
                }
              }}
            >
              {isSaving ? '💾 Saving...' : 'Save'}
            </button>
            <button
              onClick={handlePrint}
              disabled={isUploading}
              style={{
                background: isUploading ? '#f5f5f5' : '#E8A889',
                border: 'none',
                color: isUploading ? '#999' : 'white',
                borderRadius: '25px',
                padding: '0.8rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isUploading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isUploading) {
                  e.target.style.background = '#d49673';
                }
              }}
              onMouseLeave={(e) => {
                if (!isUploading) {
                  e.target.style.background = '#E8A889';
                }
              }}
            >
              {isUploading ? '⏳ Preparing...' : '🖨️ Print'}
            </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Filter or Adjust */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '1.5rem',
          height: 'fit-content'
        }}>
          <h3 style={{
            textAlign: 'center',
            marginBottom: '2rem',
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#333'
          }}>
            {debugMode ? 'Debug Info' : (activeToggle === 'filter' ? 'All Photos' : 'Adjust Settings')}
          </h3>
          
          {debugMode ? (
            /* Debug Panel */
            frameConfig && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1rem', 
                  fontSize: '0.9rem' 
                }}>
                  <div>
                    <strong>Frame:</strong> {frameConfig.name}<br/>
                    <strong>Max Captures:</strong> {frameConfig.maxCaptures}<br/>
                    <strong>Layout Ratio:</strong> {frameConfig.layout.aspectRatio}
                  </div>
                  <button
                    onClick={reloadFrameConfig}
                    disabled={isReloading}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      backgroundColor: isReloading ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isReloading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      opacity: isReloading ? 0.7 : 1
                    }}
                  >
                    {isReloading ? '⏳ Loading...' : '🔄 Reload Config'}
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('=== DRAG & DROP DEBUG ===');
                      console.log('draggedPhoto:', draggedPhoto);
                      console.log('dragOverSlot:', dragOverSlot);
                      console.log('slotPhotos:', slotPhotos);
                      console.log('photoTransforms:', photoTransforms);
                      console.log('frameConfig.duplicatePhotos:', frameConfig?.duplicatePhotos);
                      console.log('photos.length:', photos?.length);
                      console.log('frameConfig.slots.length:', frameConfig?.slots?.length);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      marginLeft: '5px'
                    }}
                  >
                    🔍 Debug D&D
                  </button>
                </div>
                
                <table 
                  key={`debug-table-${configReloadKey}`}
                  style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}
                >
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th style={{ border: '1px solid #ddd', padding: '6px' }}>Slot</th>
                      <th style={{ border: '1px solid #ddd', padding: '6px' }}>Position (%)</th>
                      <th style={{ border: '1px solid #ddd', padding: '6px' }}>Size (px)</th>
                      <th style={{ border: '1px solid #ddd', padding: '6px' }}>Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frameConfig.slots.map((slot, index) => {
                      const pixels = calculateSlotPixels(frameConfig, index);
                      const isRatioCorrect = Math.abs(pixels.calculatedRatio - 0.8) < 0.01;
                      return (
                        <tr key={slot.id}>
                          <td style={{ border: '1px solid #ddd', padding: '6px' }}>{slot.id}</td>
                          <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                            L:{(slot.left * 100).toFixed(0)}% T:{(slot.top * 100).toFixed(0)}%<br/>
                            W:{(slot.width * 100).toFixed(0)}% H:{(slot.height * 100).toFixed(0)}%
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                            {pixels.width}×{pixels.height}px
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                            {pixels.calculatedRatio.toFixed(2)}<br/>
                            {!isRatioCorrect && <span style={{ color: 'red' }}>⚠️</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.8rem', 
                  background: '#f8f9fa', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem' 
                }}>
                  <strong>Instructions:</strong><br/>
                  • Red boxes show slot positions<br/>
                  • Aspect ratio should be 0.80 for 4:5<br/>
                  • Adjust coordinates in frameConfigs.js
                </div>
              </div>
            )
          ) : activeToggle === 'filter' ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                fontSize: '0.9rem',
                color: '#666',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                {selectedPhotoForEdit !== null 
                  ? `✨ Adjusting Photo ${selectedPhotoForEdit + 1} - Smart boundaries ensure slot coverage` 
                  : 'Auto-fit preserves vertical height, Smart limits prevent empty slots'
                }
              </div>
              
              {/* All Photos Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem'
              }}>
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: selectedPhoto === index ? '2px solid #E8A889' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      aspectRatio: '4/5', // Konsisten dengan rasio frame slot
                      backgroundColor: '#f8f9fa'
                    }}
                    onClick={() => setSelectedPhoto(index)}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center center'
                      }}
                    />
                  </div>
                ))}
              </div>
              
              {photos.length === 0 && (
                <div style={{
                  color: '#666',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  No photos available. Take some photos first!
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                color: '#666',
                fontSize: '0.9rem',
                textAlign: 'center',
                padding: '2rem'
              }}>
                Adjustment controls will be displayed here
              </div>
              {/* TODO: Add adjustment controls */}
            </div>
          )}
        </div>
      </div>
      
      {/* Debug Panel - only show if Testframe3 is selected */}
      {selectedFrame === 'Testframe3' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#ff6b6b',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            🔍 {selectedFrame.toUpperCase()} DEBUG
          </div>
          <div>Frame: {selectedFrame}</div>
          <div>Photos: {photos.length}</div>
          <div>Frame Config: {frameConfig ? '✅' : '❌'}</div>
          <div>Max Captures: {frameConfig?.maxCaptures || 'N/A'}</div>
          <button
            onClick={() => {
              console.log(`🔍 ${selectedFrame.toUpperCase()} COMPLETE DEBUG:`);
              console.log('  - selectedFrame:', selectedFrame);
              console.log('  - frameConfig:', frameConfig);
              console.log('  - photos:', photos);
              console.log('  - photoTransforms:', photoTransforms);
              console.log('  - localStorage selectedFrame:', localStorage.getItem('selectedFrame'));
              console.log('  - localStorage frameConfig:', localStorage.getItem('frameConfig'));
              console.log('  - localStorage capturedPhotos:', localStorage.getItem('capturedPhotos'));
            }}
            style={{
              background: 'white',
              color: '#ff6b6b',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              marginTop: '8px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Log Debug Info
          </button>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && printCode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              marginBottom: '1rem',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#333'
            }}>
              🖨️ Ready to Print
            </h3>
            
            <p style={{
              color: '#666',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              Scan QR code with tablet to print
            </p>
            
            {/* QR Code */}
            <div style={{
              background: '#f8f9fa',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem',
              border: '2px solid #e9ecef'
            }}>
              <img 
                src={printCode.qrCode} 
                alt="Print QR Code"
                style={{
                  width: '200px',
                  height: '200px',
                  margin: '0 auto',
                  display: 'block'
                }}
              />
            </div>
            
            {/* Print Code */}
            <div style={{
              background: '#f8f9fa',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#333',
              fontFamily: 'monospace',
              letterSpacing: '1px'
            }}>
              {printCode.code}
            </div>
            
            {/* Instructions */}
            <div style={{
              fontSize: '0.8rem',
              color: '#666',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              <p>📱 Open tablet printer app</p>
              <p>📷 Scan the QR code above</p>
              <p>🖨️ Your photo will print automatically</p>
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setPrintCode(null);
                }}
                style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  color: '#666',
                  borderRadius: '15px',
                  padding: '0.8rem 1.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Close
              </button>
              
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(printCode.code);
                    alert('Print code copied to clipboard!');
                  } catch (error) {
                    console.error('Copy failed:', error);
                  }
                }}
                style={{
                  background: '#E8A889',
                  border: 'none',
                  color: 'white',
                  borderRadius: '15px',
                  padding: '0.8rem 1.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}