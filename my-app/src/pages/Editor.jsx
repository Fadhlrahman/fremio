import React, { useState, useEffect } from 'react';
import frameProvider from '../utils/frameProvider.js';
import { useNavigate } from 'react-router-dom';
import { createSampleData, clearTestData } from '../utils/testData.js';
import { reloadFrameConfig as reloadFrameConfigFromManager } from '../config/frameConfigManager.js';
import { createFremioSeriesTestData } from '../utils/fremioTestData.js';
import safeStorage from '../utils/safeStorage.js';
import draftStorage from '../utils/draftStorage.js';
import { buildFrameConfigFromDraft } from '../utils/draftHelpers.js';
import { deriveFrameLayerPlan } from '../utils/frameLayerPlan.js';
import { BACKGROUND_PHOTO_Z } from '../constants/layers.js';

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
import SalPriadi from '../assets/frames/InspiredBy/Sal Priadi.png';
import InspiredBy7Des from '../assets/frames/InspiredBy/7 Des.png';
import InspiredByAbbeyRoad from '../assets/frames/InspiredBy/Abbey Road.png';
import InspiredByLagipulaHidupAkanBerakhir from '../assets/frames/InspiredBy/Lagipula Hidup Akan Berakhir.png';
import InspiredByMembangunDanMenghancurkan from '../assets/frames/InspiredBy/Membangun & Menghancurkan.png';
import InspiredByMenariDenganBayangan from '../assets/frames/InspiredBy/Menari dengan Bayangan.png';
import InspiredByPSILOVEYOU from '../assets/frames/InspiredBy/PS. I LOVE YOU.png';

export default function Editor() {
  console.log('🚀 EDITOR COMPONENT RENDERING...');
  
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [frameSlots, setFrameSlots] = useState(null);
  const [frameLayerPlan, setFrameLayerPlan] = useState(null);
  const [frameId, setFrameId] = useState(null);
  const [isReloading, setIsReloading] = useState(false);
  const [duplicatePhotos, setDuplicatePhotos] = useState(false);
  const [slotPhotos, setSlotPhotos] = useState({}); // individual photos per slot (for duplicate-photo frames)
  const [draggedPhoto, setDraggedPhoto] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [designerElements, setDesignerElements] = useState([]); // elements from custom frame designer
  const [backgroundPhotoElement, setBackgroundPhotoElement] = useState(null); // background photo from custom frame
  const [frameConfig, setFrameConfig] = useState(null); // store full frame config for rendering

  const getSlotPhotosStorageKey = (id) => (id ? `slotPhotos:${id}` : null);
  const persistSlotPhotos = (id, data) => {
    const storageKey = getSlotPhotosStorageKey(id);
    if (!storageKey) return;
    try {
      safeStorage.setJSON(storageKey, data);
    } catch (err) {
      console.warn('⚠️ Failed to persist slotPhotos', err);
    }
  };

  // Frame mapping for imported assets.
  const getFrameAsset = (frameName) => {
    const frameMap = {
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
      'FremioSeries-blue-4': FremioSeriesBlue4,
      'SalPriadi': SalPriadi,
      'InspiredBy-7Des': InspiredBy7Des,
      'InspiredBy-AbbeyRoad': InspiredByAbbeyRoad,
      'InspiredBy-LagipulaHidupAkanBerakhir': InspiredByLagipulaHidupAkanBerakhir,
      'InspiredBy-MembangunDanMenghancurkan': InspiredByMembangunDanMenghancurkan,
      'InspiredBy-MenariDenganBayangan': InspiredByMenariDenganBayangan,
      'InspiredBy-PSILOVEYOU': InspiredByPSILOVEYOU
    };
    return frameMap[frameName] || null;
  };

  // Helper: Check if frame ID is a custom frame
  const isCustomFrameId = (frameId) => {
    return typeof frameId === 'string' && frameId.startsWith('custom-');
  };

  // Helper: Resolve frame ID from storage or fallback
  const resolveStoredFrameId = () => {
    const stored = safeStorage.getItem('selectedFrame');
    if (stored) return stored;

    const frameConfig = safeStorage.getJSON('frameConfig');
    if (frameConfig?.id) return frameConfig.id;

    const activeDraftId = safeStorage.getItem('activeDraftId');
    if (activeDraftId) return `custom-${activeDraftId}`;

    const providerConfig = frameProvider?.getCurrentConfig?.();
    if (providerConfig?.id) return providerConfig.id;

    return null;
  };

  // Helper: Resolve frame config from various sources
  const resolveFrameConfig = (frameId) => {
    // Try cached config first
    const cachedConfig = safeStorage.getJSON('frameConfig');
    if (cachedConfig?.id === frameId) {
      console.log('✅ Using cached frameConfig for:', frameId);
      return cachedConfig;
    }

    // Try frameProvider
    const providerConfig = frameProvider?.getCurrentConfig?.();
    if (providerConfig?.id === frameId) {
      console.log('✅ Using frameProvider config for:', frameId);
      return providerConfig;
    }

    // For custom frames, try rebuilding from draft
    if (isCustomFrameId(frameId)) {
      const draftId = frameId.replace('custom-', '');
      const draft = draftStorage?.getDraftById?.(draftId);
      if (draft) {
        console.log('✅ Rebuilding config from draft:', draftId);
        const rebuilt = buildFrameConfigFromDraft(draft);
        if (rebuilt) {
          safeStorage.setJSON('frameConfig', rebuilt);
          return rebuilt;
        }
      }
    }

    return null;
  };

  // Helper: Get frame image source (for custom frames, use base64)
  const resolveFrameImage = (frameId, frameConfig) => {
    // Try built-in frame asset first
    const builtInAsset = getFrameAsset(frameId);
    if (builtInAsset) {
      console.log('✅ Using built-in frame asset for:', frameId);
      return builtInAsset;
    }

    // For custom frames, try multiple sources
    if (isCustomFrameId(frameId)) {
      if (frameConfig?.frameImage) {
        console.log('✅ Using custom frame base64 from config.frameImage for:', frameId);
        return frameConfig.frameImage;
      }
      
      if (frameConfig?.preview) {
        console.log('✅ Using custom frame base64 from config.preview for:', frameId);
        return frameConfig.preview;
      }
      
      // If not in config, try loading from draft directly
      const draftId = frameId.replace('custom-', '');
      const draft = draftStorage?.getDraftById?.(draftId);
      if (draft?.preview) {
        console.log('✅ Using custom frame base64 from draft.preview for:', frameId);
        return draft.preview;
      }
      
      console.error('❌ No frameImage found in config or draft for custom frame:', frameId);
    }

    return null;
  };

  // Load photos and frame data from localStorage when component mounts
  useEffect(() => {
    console.log('🔄 Editor useEffect started - loading data...');
    console.log('🔍 Checking localStorage keys:', Object.keys(localStorage));
    
    try {
      // Get captured photos from localStorage
      const capturedPhotos = safeStorage.getJSON('capturedPhotos');
      console.log('📦 Raw capturedPhotos from localStorage:', capturedPhotos);
      console.log('📦 Type:', typeof capturedPhotos, 'IsArray:', Array.isArray(capturedPhotos));
      
      if (capturedPhotos) {
        const parsedPhotos = Array.isArray(capturedPhotos) ? capturedPhotos : [];
        setPhotos(parsedPhotos);
        console.log('✅ Loaded photos:', parsedPhotos.length, 'photos');
        if (parsedPhotos.length > 0) {
          parsedPhotos.forEach((photo, idx) => {
            console.log(`📷 Photo ${idx}:`, photo ? `${photo.substring(0, 50)}... (length: ${photo.length})` : 'null/undefined');
          });
        }
      } else {
        console.log('⚠️ No captured photos found in localStorage');
        console.log('🔍 All localStorage contents:');
        Object.keys(localStorage).forEach(key => {
          console.log(`  - ${key}:`, localStorage.getItem(key)?.substring(0, 100));
        });
        setPhotos([]); // Explicitly set empty array
      }

      // Resolve frame ID from multiple sources
      const frameId = resolveStoredFrameId();
      console.log('🔍 Resolved frame ID:', frameId);

      if (!frameId) {
        console.error('❌ No frame ID could be resolved');
        return;
      }

      // Resolve frame config
      const frameConfig = resolveFrameConfig(frameId);
      console.log('🔍 Resolved frame config:', {
        frameId,
        hasConfig: !!frameConfig,
        slotsCount: frameConfig?.slots?.length,
        isCustom: isCustomFrameId(frameId)
      });

      if (!frameConfig) {
        console.error('❌ No frame config could be resolved for:', frameId);
        return;
      }

      // Store frame config to state for rendering
      setFrameConfig(frameConfig);

      // Resolve frame image
      const frameImage = resolveFrameImage(frameId, frameConfig);
      console.log('🔍 Resolved frame image:', {
        frameId,
        hasImage: !!frameImage,
        imageType: frameImage?.startsWith('data:') ? 'base64' : 'imported'
      });

      if (!frameImage) {
        console.error('❌ No frame image could be resolved for:', frameId);
        return;
      }

      // Set all frame state
      setSelectedFrame(frameImage);
      setFrameSlots(frameConfig.slots);
      setFrameId(frameId);
      setDuplicatePhotos(!!frameConfig.duplicatePhotos);

      // Load designer elements for custom frames (elements like text, shapes that should render on top)
      const designerElems = Array.isArray(frameConfig?.designer?.elements) 
        ? frameConfig.designer.elements.filter(el => 
            el && 
            el.type !== 'photo' && 
            el.type !== 'background-photo' &&
            !el?.data?.__capturedOverlay
          )
        : [];
      setDesignerElements(designerElems);
      console.log('🎨 Loaded designer elements:', designerElems.length);
      console.log('🎨 Designer elements detail:', designerElems.map(el => ({
        type: el.type,
        id: el.id?.slice(0, 8),
        zIndex: el.zIndex,
        hasData: !!el.data,
        text: el.data?.text,
        fill: el.data?.fill,
        image: el.data?.image ? 'has image' : 'no image'
      })));

      // Load background photo element for custom frames
      const backgroundPhoto = Array.isArray(frameConfig?.designer?.elements)
        ? frameConfig.designer.elements.find(el => el?.type === 'background-photo')
        : null;
      setBackgroundPhotoElement(backgroundPhoto);
      if (backgroundPhoto) {
        console.log('🖼️ Loaded background photo:', {
          id: backgroundPhoto.id?.slice(0, 8),
          zIndex: backgroundPhoto.zIndex,
          hasImage: !!backgroundPhoto.data?.image,
          width: backgroundPhoto.width,
          height: backgroundPhoto.height
        });
      }

      // Derive layering plan for slots so downstream renders respect creator ordering
      let layerPlan = null;
      try {
        const storedPlan = safeStorage.getJSON('frameLayerPlan');
        if (
          storedPlan &&
          storedPlan.version === 1 &&
          storedPlan.sourceFrameId === frameConfig.id &&
          storedPlan.slotCount === frameConfig.slots.length &&
          (!storedPlan.sourceSignature || storedPlan.sourceSignature === frameConfig?.metadata?.signature)
        ) {
          layerPlan = storedPlan;
        }
      } catch (error) {
        console.warn('⚠️ Failed to load stored frame layer plan', error);
      }

      if (!layerPlan) {
        layerPlan = deriveFrameLayerPlan(frameConfig);
        if (layerPlan) {
          try {
            safeStorage.setJSON('frameLayerPlan', layerPlan);
          } catch (error) {
            console.warn('⚠️ Failed to persist frame layer plan', error);
          }
        } else {
          safeStorage.removeItem('frameLayerPlan');
        }
      }

      setFrameLayerPlan(layerPlan);

      // Initialize slotPhotos for duplicate-photo frames
      if (frameConfig.duplicatePhotos && Array.isArray(frameConfig.slots)) {
        const initial = {};
        frameConfig.slots.forEach((slot, idx) => {
          const pIdx = slot.photoIndex !== undefined ? slot.photoIndex : idx;
          initial[idx] = (Array.isArray(capturedPhotos) && capturedPhotos[pIdx]) ? capturedPhotos[pIdx] : null;
        });

        const storageKey = getSlotPhotosStorageKey(frameId);
        let normalized = initial;
        if (storageKey) {
          const stored = safeStorage.getJSON(storageKey);
          if (stored) {
            const merged = {};
            frameConfig.slots.forEach((_, idx) => {
              if (stored && Object.prototype.hasOwnProperty.call(stored, idx)) {
                merged[idx] = stored[idx];
              } else {
                merged[idx] = initial[idx] || null;
              }
            });
            normalized = merged;
          }
        }
        setSlotPhotos(normalized);
        persistSlotPhotos(frameId, normalized);
      }

      console.log('✅ Editor: Frame loaded successfully:', {
        frameId,
        slotsCount: frameConfig.slots?.length,
        duplicatePhotos: frameConfig.duplicatePhotos,
        isCustom: isCustomFrameId(frameId)
      });
    } catch (error) {
      console.error('❌ FATAL ERROR in Editor useEffect:', error);
      console.error('Error stack:', error.stack);
    }
  }, []);

  // Ensure slotPhotos are initialized once photos and frameSlots are available (for duplicate-photo frames)
  useEffect(() => {
    if (!duplicatePhotos) return;
    if (!Array.isArray(frameSlots) || frameSlots.length === 0) return;
    if (!Array.isArray(photos) || photos.length === 0) return;

    // If slotPhotos is empty or has missing entries, populate from photos using slot.photoIndex mapping
    const needsInit = Object.keys(slotPhotos || {}).length === 0 || frameSlots.some((_, idx) => !slotPhotos[idx]);
    if (!needsInit) return;

    const initial = { ...(slotPhotos || {}) };
    frameSlots.forEach((slot, idx) => {
      if (!initial[idx]) {
        const pIdx = slot.photoIndex !== undefined ? slot.photoIndex : idx;
        initial[idx] = photos[pIdx] || null;
      }
    });
    setSlotPhotos(initial);
    const activeFrameId = frameId || safeStorage.getItem('selectedFrame');
    persistSlotPhotos(activeFrameId, initial);
  }, [duplicatePhotos, frameSlots, photos]);

  // Drag and Drop handlers for preview.
  const handleDragStart = (e, slotIndex) => {
    e.stopPropagation();
    setDraggedPhoto({ slotIndex });
    console.log('[DnD] 🎯 Mulai drag dari slot', slotIndex + 1);
    
    // Set required data for cross-browser compatibility
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `slot-${slotIndex}`);
    
    // Use the slot image as the drag preview when available
    const imgEl = e.target.tagName === 'IMG' ? e.target : e.currentTarget.querySelector('img');
    if (imgEl) {
      e.dataTransfer.setDragImage(imgEl, imgEl.offsetWidth / 2, imgEl.offsetHeight / 2);
    }
  };

  const handleDragOver = (e, slotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(slotIndex);
    e.dataTransfer.dropEffect = 'move';
    console.log('[DnD] 👆 Hover over slot', slotIndex + 1);
  };

  const handleDragEnter = (e, slotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(slotIndex);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're leaving the slot area completely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSlot(null);
    }
  };

  const handleDrop = (e, targetSlotIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
    
    console.log('[DnD] 📸 Drop ke slot', targetSlotIndex + 1);
    console.log('[DnD] draggedPhoto state:', draggedPhoto);
    console.log('[DnD] duplicatePhotos:', duplicatePhotos);
    console.log('[DnD] frameSlots length:', frameSlots?.length);
    console.log('[DnD] photos length:', photos?.length);
    console.log('[DnD] slotPhotos:', slotPhotos);
    
    if (!draggedPhoto) {
      console.log('[DnD] ❌ No draggedPhoto state');
      return;
    }

    const sourceSlotIndex = draggedPhoto.slotIndex;
    if (sourceSlotIndex === targetSlotIndex) {
      console.log('[DnD] ❌ Same slot, no swap needed');
      setDraggedPhoto(null);
      return;
    }

    // Duplicate-photo frames: swap only the targeted slots...
    if (duplicatePhotos && Array.isArray(frameSlots)) {
  const newSlotPhotos = { ...slotPhotos };
      const srcSlot = frameSlots[sourceSlotIndex];
      const dstSlot = frameSlots[targetSlotIndex];
      const srcPhotoIdx = srcSlot?.photoIndex !== undefined ? srcSlot.photoIndex : sourceSlotIndex;
      const dstPhotoIdx = dstSlot?.photoIndex !== undefined ? dstSlot.photoIndex : targetSlotIndex;
      const srcImg = newSlotPhotos[sourceSlotIndex] || photos[srcPhotoIdx] || null;
      const dstImg = newSlotPhotos[targetSlotIndex] || photos[dstPhotoIdx] || null;

      newSlotPhotos[sourceSlotIndex] = dstImg;
      newSlotPhotos[targetSlotIndex] = srcImg;

  setSlotPhotos(newSlotPhotos);
  const activeFrameId = frameId || safeStorage.getItem('selectedFrame');
      persistSlotPhotos(activeFrameId, newSlotPhotos);

      setDraggedPhoto(null);
      console.log('[DnD] ✅ Berhasil tukar slot', sourceSlotIndex + 1, '↔', targetSlotIndex + 1, '(duplicate-photos frame, independent)');
      return;
    }

    // Standard frames: swap the corresponding photo indices for the two slots
    if (Array.isArray(frameSlots)) {
      const srcSlot = frameSlots[sourceSlotIndex];
      const dstSlot = frameSlots[targetSlotIndex];
      const srcPhotoIdx = srcSlot?.photoIndex !== undefined ? srcSlot.photoIndex : sourceSlotIndex;
      const dstPhotoIdx = dstSlot?.photoIndex !== undefined ? dstSlot.photoIndex : targetSlotIndex;

      const newPhotos = [...photos];
      const tmp = newPhotos[srcPhotoIdx];
      newPhotos[srcPhotoIdx] = newPhotos[dstPhotoIdx];
      newPhotos[dstPhotoIdx] = tmp;
  setPhotos(newPhotos);
  safeStorage.setJSON('capturedPhotos', newPhotos);
      console.log('[DnD] ✅ Berhasil tukar slot', sourceSlotIndex + 1, '↔', targetSlotIndex + 1, '(standard frame)');
    }

    setDraggedPhoto(null);
  };

  // Tools removed on this page per request; keeping only the preview
  console.log('🎨 EDITOR RENDER:', {
    hasPhotos: !!photos,
    photosLength: photos?.length,
    hasFrameSlots: !!frameSlots,
    frameSlotsLength: frameSlots?.length,
    hasSelectedFrame: !!selectedFrame,
    frameId
  });
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '12px',
      paddingTop: '44px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Testing Buttons - Development Only */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '5px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #e1e1e1'
      }}>
        <button 
          onClick={() => {
            // Create specific test data for FremioSeries-black-3
            const createSamplePhoto = (color, text, width = 400, height = 500) => {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              
              ctx.fillStyle = color;
              ctx.fillRect(0, 0, width, height);
              
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 8;
              ctx.strokeRect(0, 0, width, height);
              
              ctx.fillStyle = 'white';
              ctx.font = 'bold 32px Arial';
              ctx.textAlign = 'center';
              ctx.shadowColor = 'black';
              ctx.shadowBlur = 4;
              ctx.fillText(`FOTO ${text}`, width/2, height/2 - 20);
              ctx.fillText('Test Image', width/2, height/2 + 20);
              
              return canvas.toDataURL('image/png');
            };

            const samplePhotos = [
              createSamplePhoto('#e74c3c', '1'), // Red
              createSamplePhoto('#2ecc71', '2'), // Green  
              createSamplePhoto('#3498db', '3')  // Blue
            ];

            safeStorage.setJSON('capturedPhotos', samplePhotos);
            safeStorage.setItem('selectedFrame', 'FremioSeries-black-3');
            
            const frameConfig = {
              id: 'FremioSeries-black-3',
              name: 'FremioSeries Black 6 Foto',
              maxCaptures: 3,
              duplicatePhotos: true,
              slots: [
                {id: 'slot_1a', left: 0.05, top: 0.03, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 0},
                {id: 'slot_1b', left: 0.545, top: 0.03, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 0},
                {id: 'slot_2a', left: 0.05, top: 0.33, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 1},
                {id: 'slot_2b', left: 0.545, top: 0.33, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 1},
                {id: 'slot_3a', left: 0.05, top: 0.63, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 2},
                {id: 'slot_3b', left: 0.545, top: 0.63, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 2}
              ]
            };
            
            safeStorage.setJSON('frameConfig', frameConfig);
            const slotPhotoMap = {};
            frameConfig.slots.forEach((slot, idx) => {
              const pIdx = slot.photoIndex !== undefined ? slot.photoIndex : idx;
              slotPhotoMap[idx] = samplePhotos[pIdx] || null;
            });
            safeStorage.setJSON(`slotPhotos:${frameConfig.id}`, slotPhotoMap);
            
            console.log('✅ Test data created for FremioSeries-black-3');
            console.log('Photos:', samplePhotos.length);
            console.log('Frame config:', frameConfig);
            
            window.location.reload();
          }}
          style={{
            padding: '4px 9px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          🎯 Load Black-3 Test Data
        </button>
        <button 
          onClick={() => {
            clearTestData();
            window.location.reload();
          }}
          style={{
            padding: '4px 9px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      
      {/* DEBUG INFO PANEL */}
      <div style={{
        position: 'fixed',
        left: '10px',
        top: '60px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '300px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#fbbf24' }}>🔍 DEBUG INFO</div>
        
        <div style={{ marginBottom: '6px' }}>
          <strong>Photos:</strong> {photos ? `${photos.length} items` : 'NULL'}
        </div>
        {photos && photos.length > 0 && (
          <div style={{ marginBottom: '6px', fontSize: '10px' }}>
            {photos.map((p, i) => (
              <div key={i}>
                Photo {i}: {p ? `${p.substring(0, 30)}... (${p.length} chars)` : 'NULL'}
              </div>
            ))}
          </div>
        )}
        
        <div style={{ marginBottom: '6px' }}>
          <strong>FrameSlots:</strong> {frameSlots ? `${frameSlots.length} slots` : 'NULL'}
        </div>
        {frameSlots && frameSlots.length > 0 && (
          <div style={{ marginBottom: '6px', fontSize: '10px' }}>
            {frameSlots.map((slot, i) => (
              <div key={i}>
                Slot {i}: zIndex={slot.zIndex}, photoIndex={slot.photoIndex}
              </div>
            ))}
          </div>
        )}
        
        <div style={{ marginBottom: '6px' }}>
          <strong>FrameId:</strong> {frameId || 'NULL'}
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <strong>SelectedFrame:</strong> {selectedFrame ? 'YES' : 'NO'}
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <strong>DuplicatePhotos:</strong> {duplicatePhotos ? 'YES' : 'NO'}
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <strong>DesignerElements:</strong> {designerElements?.length || 0}
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <strong>BackgroundPhoto:</strong> {backgroundPhotoElement ? 'YES' : 'NO'}
        </div>
        
        <div style={{ marginBottom: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444' }}>
          <strong style={{ color: '#fbbf24' }}>Rendering Condition:</strong>
        </div>
        <div style={{ marginBottom: '4px' }}>
          frameSlots: <span style={{ color: frameSlots ? '#10b981' : '#ef4444' }}>{frameSlots ? '✓' : '✗'}</span>
        </div>
        <div style={{ marginBottom: '4px' }}>
          photos: <span style={{ color: photos ? '#10b981' : '#ef4444' }}>{photos ? '✓' : '✗'}</span>
        </div>
        <div style={{ marginBottom: '4px' }}>
          photos.length &gt; 0: <span style={{ color: (photos && photos.length > 0) ? '#10b981' : '#ef4444' }}>{(photos && photos.length > 0) ? '✓' : '✗'}</span>
        </div>
        <div style={{ marginBottom: '4px', fontWeight: 'bold', color: (frameSlots && photos && photos.length > 0) ? '#10b981' : '#ef4444' }}>
          SHOULD RENDER: {(frameSlots && photos && photos.length > 0) ? 'YES ✓' : 'NO ✗'}
        </div>
      </div>

      {/* Main Content: Preview centered (toggle tools removed) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '460px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Actions */}
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={async () => {
              if (isReloading) return;
              try {
                setIsReloading(true);
                const activeFrameId = frameId || safeStorage.getItem('selectedFrame');
                if (!activeFrameId) return;
                const fresh = await reloadFrameConfigFromManager(activeFrameId);
                if (fresh?.slots) {
                  setFrameConfig(fresh);
                  setFrameSlots(fresh.slots);
                  setDuplicatePhotos(!!fresh.duplicatePhotos);
                  
                  // Reload designer elements for custom frames
                  const designerElems = Array.isArray(fresh?.designer?.elements) 
                    ? fresh.designer.elements.filter(el => 
                        el && 
                        el.type !== 'photo' && 
                        el.type !== 'background-photo' &&
                        !el?.data?.__capturedOverlay
                      )
                    : [];
                  setDesignerElements(designerElems);
                  
                  // Reload background photo for custom frames
                  const backgroundPhoto = Array.isArray(fresh?.designer?.elements)
                    ? fresh.designer.elements.find(el => el?.type === 'background-photo')
                    : null;
                  setBackgroundPhotoElement(backgroundPhoto);
                  
                  // Rebuild slotPhotos mapping for duplicate-photo frames from current photos
                  if (fresh.duplicatePhotos) {
                    const initial = {};
                    fresh.slots.forEach((slot, idx) => {
                      const pIdx = slot.photoIndex !== undefined ? slot.photoIndex : idx;
                      initial[idx] = (Array.isArray(photos) && photos[pIdx]) ? photos[pIdx] : null;
                    });
                    setSlotPhotos(initial);
                    persistSlotPhotos(activeFrameId, initial);
                  } else {
                    setSlotPhotos({});
                  }
                  safeStorage.setJSON('frameConfig', fresh);

                  const updatedPlan = deriveFrameLayerPlan(fresh);
                  if (updatedPlan) {
                    setFrameLayerPlan(updatedPlan);
                    try {
                      safeStorage.setJSON('frameLayerPlan', updatedPlan);
                    } catch (error) {
                      console.warn('⚠️ Failed to persist reloaded frame layer plan', error);
                    }
                  } else {
                    setFrameLayerPlan(null);
                    safeStorage.removeItem('frameLayerPlan');
                  }
                  console.log('✅ Editor: reloaded frame slots');
                }
              } finally {
                setIsReloading(false);
              }
            }}
            style={{
              padding: '5px 10px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem'
            }}
          >
            {isReloading ? '⏳ Reloading...' : '🔄 Reload Config'}
          </button>
          
          {/* Drag & Drop Instructions */}
          <div style={{
            padding: '3px 8px',
            background: '#e8f2ff',
            color: '#0f3d8c',
            borderRadius: '999px',
            fontSize: '0.7rem',
            border: '1px solid #c7ddff'
          }}>
            💡 Drag foto antar slot untuk menukar posisi
          </div>
        </div>
        {/* Preview Area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '300px'
        }}>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '0.85rem',
            fontWeight: '500',
            color: '#333',
            textAlign: 'center'
          }}>
            Preview
          </h3>
          {/* Preview canvas */}
          {selectedFrame && frameSlots && Array.isArray(frameSlots) ? (
            <div style={{
              position: 'relative',
              width: '188px',
              height: '282px',
              background: isCustomFrameId(frameId) 
                ? (frameConfig?.layout?.backgroundColor || frameConfig?.designer?.canvasBackground || '#fff')
                : '#fff',
              borderRadius: '10px',
              boxShadow: '0 3px 10px rgba(15,23,42,0.12)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}>
              {/* LAYER 1: Background photo (uses original z-index from element) */}
              {backgroundPhotoElement && backgroundPhotoElement.data?.image && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: Number.isFinite(backgroundPhotoElement.zIndex) 
                      ? backgroundPhotoElement.zIndex 
                      : BACKGROUND_PHOTO_Z, // Fallback to -4000
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={backgroundPhotoElement.data.image}
                    alt="Background"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              )}

              {/* LAYER 2: Photo slots (uses original z-index from slot object) */}
              {(() => {
                console.log('🎬 PHOTO RENDERING BLOCK:', {
                  hasFrameSlots: !!frameSlots,
                  frameSlotsLength: frameSlots?.length,
                  hasPhotos: !!photos,
                  photosLength: photos?.length,
                  photosIsArray: Array.isArray(photos),
                  condition: frameSlots && photos && photos.length > 0,
                  willRender: !!(frameSlots && photos && photos.length > 0)
                });

                if (!frameSlots || !photos || photos.length === 0) {
                  console.error('❌ PHOTO RENDERING BLOCKED:', {
                    frameSlots: !!frameSlots,
                    photos: !!photos,
                    photosLength: photos?.length
                  });
                  return <div style={{
                    position: 'absolute',
                    inset: '10px',
                    background: 'rgba(255, 0, 0, 0.2)',
                    border: '3px dashed red',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: 'red',
                    fontWeight: 600,
                    textAlign: 'center',
                    zIndex: 9999
                  }}>
                    ❌ NO PHOTOS<br/>
                    frameSlots: {frameSlots ? 'YES' : 'NO'}<br/>
                    photos: {photos ? 'YES' : 'NO'}<br/>
                    photos.length: {photos?.length || 0}
                  </div>;
                }

                return frameSlots.map((slot, slotIndex) => {
                const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : slotIndex;
                const source = duplicatePhotos
                  ? slotPhotos?.[slotIndex] || photos[photoIndex]
                  : photos[photoIndex];

                if (!source) {
                  console.warn(`⚠️ No photo for slot ${slotIndex}`);
                  return null;
                }

                const isDragged = draggedPhoto?.slotIndex === slotIndex;
                const isDragOver = dragOverSlot === slotIndex;
                
                // ✅ USE ORIGINAL Z-INDEX from slot (same as designer elements)
                // Fallback to safe default if not present
                const photoZIndex = Number.isFinite(slot.zIndex) && slot.zIndex >= 0
                  ? slot.zIndex
                  : 100 + slotIndex;

                console.log(`✅ Rendering photo slot ${slotIndex}:`, {
                  slotId: slot.id,
                  slotZIndex: slot.zIndex,
                  finalZIndex: photoZIndex,
                  usedOriginal: Number.isFinite(slot.zIndex),
                  zIndex: photoZIndex,
                  hasSource: !!source,
                  position: { left: slot.left, top: slot.top, width: slot.width, height: slot.height }
                });

                return (
                  <div
                    key={`photo-slot-${slotIndex}`}
                    style={{
                      position: 'absolute',
                      left: `${(slot.left || 0) * 100}%`,
                      top: `${(slot.top || 0) * 100}%`,
                      width: `${(slot.width || 0) * 100}%`,
                      height: `${(slot.height || 0) * 100}%`,
                      overflow: 'hidden',
                      borderRadius: '6px',
                      background: '#f0f0f0',
                      outline: isDragOver ? '3px solid #4f46e5' : 'none',
                      cursor: isDragged ? 'grabbing' : 'grab',
                      opacity: isDragged ? 0.85 : 1,
                      boxShadow: isDragOver ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
                      zIndex: photoZIndex,
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, slotIndex)}
                    onDragEnd={() => setDraggedPhoto(null)}
                    onDragOver={(e) => handleDragOver(e, slotIndex)}
                    onDragEnter={(e) => handleDragEnter(e, slotIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, slotIndex)}
                  >
                    <img
                      src={source}
                      alt={`Photo ${slotIndex + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                );
                });
              })()}

              {/* LAYER 3: Designer elements - text, shapes, uploads (uses original z-index) */}
              {designerElements && designerElements.length > 0 && designerElements.map((element, idx) => {
                if (!element || !element.type) return null;

                // ✅ USE ORIGINAL Z-INDEX from element (same as photo slots)
                // Fallback to safe default if not present
                const elemZIndex = Number.isFinite(element.zIndex)
                  ? element.zIndex
                  : 200 + idx;
                
                // Calculate scaled positions
                const previewWidth = 188;
                const previewHeight = 282;
                const canvasWidth = frameConfig?.layout?.canvasWidth || 1080;
                const canvasHeight = frameConfig?.layout?.canvasHeight || 1920;
                
                const scaleX = previewWidth / canvasWidth;
                const scaleY = previewHeight / canvasHeight;
                
                const scaledLeft = (element.x || 0) * scaleX;
                const scaledTop = (element.y || 0) * scaleY;
                const scaledWidth = (element.width || 100) * scaleX;
                const scaledHeight = (element.height || 100) * scaleY;

                console.log(`✅ Rendering designer element ${idx}:`, {
                  type: element.type,
                  id: element.id?.slice(0, 8),
                  elementZIndex: element.zIndex,
                  finalZIndex: elemZIndex,
                  usedOriginal: Number.isFinite(element.zIndex),
                });

                // Render text
                if (element.type === 'text') {
                  const fontSize = (element.data?.fontSize || 24) * scaleX;
                  return (
                    <div
                      key={`designer-${element.id || idx}`}
                      style={{
                        position: 'absolute',
                        left: `${scaledLeft}px`,
                        top: `${scaledTop}px`,
                        width: `${scaledWidth}px`,
                        height: `${scaledHeight}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        fontFamily: element.data?.fontFamily || 'Inter',
                        fontSize: `${fontSize}px`,
                        color: element.data?.color || '#111827',
                        fontWeight: element.data?.fontWeight || 500,
                        textAlign: element.data?.align || 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: element.data?.align === 'center' ? 'center' : element.data?.align === 'right' ? 'flex-end' : 'flex-start',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.25,
                      }}
                    >
                      {element.data?.text || 'Text'}
                    </div>
                  );
                }

                // Render shape
                if (element.type === 'shape') {
                  return (
                    <div
                      key={`designer-${element.id || idx}`}
                      style={{
                        position: 'absolute',
                        left: `${scaledLeft}px`,
                        top: `${scaledTop}px`,
                        width: `${scaledWidth}px`,
                        height: `${scaledHeight}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        background: element.data?.fill || '#f4d3c2',
                        borderRadius: `${(element.data?.borderRadius || 24) * scaleX}px`,
                      }}
                    />
                  );
                }

                // Render upload
                if (element.type === 'upload' && element.data?.image) {
                  return (
                    <div
                      key={`designer-${element.id || idx}`}
                      style={{
                        position: 'absolute',
                        left: `${scaledLeft}px`,
                        top: `${scaledTop}px`,
                        width: `${scaledWidth}px`,
                        height: `${scaledHeight}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        borderRadius: `${(element.data?.borderRadius || 24) * scaleX}px`,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={element.data.image}
                        alt="Element"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: element.data?.objectFit || 'cover',
                        }}
                      />
                    </div>
                  );
                }

                return null;
              })}

              {/* LAYER 4: Frame overlay - only for non-custom frames (z-index = 1000, paling depan) */}
              {!isCustomFrameId(frameId) && selectedFrame && (
                <img
                  src={selectedFrame}
                  alt="Frame"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    zIndex: 1000,
                  }}
                />
              )}
            </div>
          ) : (
            <div style={{
              height: '260px',
              width: '188px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              background: '#fff',
              border: '1px dashed #cbd5f5',
              borderRadius: '10px'
            }}>
              No frame selected
            </div>
          )}
        </div>
          
          {/* Debug Button */}
          <button 
            onClick={() => {
              console.log('=== DEBUG EDITOR DATA ===');
              console.log('Photos from state:', photos);
              console.log('SelectedFrame from state:', selectedFrame);
              console.log('FrameSlots from state:', frameSlots);
              console.log('DuplicatePhotos:', duplicatePhotos);
              console.log('SlotPhotos:', slotPhotos);
              console.log('DraggedPhoto:', draggedPhoto);
              console.log('DragOverSlot:', dragOverSlot);
              console.log('LocalStorage capturedPhotos:', safeStorage.getItem('capturedPhotos'));
              console.log('LocalStorage selectedFrame:', safeStorage.getItem('selectedFrame'));
              console.log('LocalStorage frameConfig:', safeStorage.getItem('frameConfig'));
              console.log('LocalStorage frameSlots (legacy):', safeStorage.getItem('frameSlots'));
            }}
            style={{
              marginTop: '8px',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '13px',
              padding: '7px 18px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            🔍 Debug Drag & Drop
          </button>
          
          {/* Test Data Buttons */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => {
                const data = createSampleData();
                // Reload component data
                window.location.reload();
              }}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '5px 10px',
                fontSize: '0.68rem',
                cursor: 'pointer'
              }}
            >
              Create Test Data
            </button>
            
            <button 
              onClick={() => {
                clearTestData();
                window.location.reload();
              }}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '5px 10px',
                fontSize: '0.68rem',
                cursor: 'pointer'
              }}
            >
              Clear Test Data
            </button>
          </div>
        {/* End of Preview section and actions */}
      </div>
    </div>
  );
}