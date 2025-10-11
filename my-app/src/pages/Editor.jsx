import React, { useState, useEffect } from 'react';
import frameProvider from '../utils/frameProvider.js';
import { useNavigate } from 'react-router-dom';
import { createSampleData, clearTestData } from '../utils/testData.js';
import { reloadFrameConfig as reloadFrameConfigFromManager } from '../config/frameConfigManager.js';
import { createFremioSeriesTestData, createTestframe2TestData } from '../utils/fremioTestData.js';
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

export default function Editor() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [frameSlots, setFrameSlots] = useState(null);
  const [frameId, setFrameId] = useState(null);
  const [isReloading, setIsReloading] = useState(false);
  const [duplicatePhotos, setDuplicatePhotos] = useState(false);
  const [slotPhotos, setSlotPhotos] = useState({}); // individual photos per slot (for duplicate-photo frames)
  const [draggedPhoto, setDraggedPhoto] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  const getSlotPhotosStorageKey = (id) => (id ? `slotPhotos:${id}` : null);
  const persistSlotPhotos = (id, data) => {
    const storageKey = getSlotPhotosStorageKey(id);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('⚠️ Failed to persist slotPhotos', err);
    }
  };

  // Frame mapping for imported assets
  const getFrameAsset = (frameName) => {
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
    return frameMap[frameName] || null;
  };

  // Load photos and frame data from localStorage when component mounts
  useEffect(() => {
    console.log('🔄 Editor useEffect started - loading data...');
    
    // Get captured photos from localStorage
    const capturedPhotos = localStorage.getItem('capturedPhotos');
    if (capturedPhotos) {
      const parsedPhotos = JSON.parse(capturedPhotos);
      setPhotos(parsedPhotos);
      console.log('✅ Loaded photos:', parsedPhotos.length);
    } else {
      console.log('⚠️ No captured photos found in localStorage');
    }

  // Get frame data from localStorage (new format with frameConfig)
  const frameName = localStorage.getItem('selectedFrame');
  let frameConfigData = localStorage.getItem('frameConfig');
    
    console.log('🔍 Loading frame data:', { frameName, frameConfigData: !!frameConfigData });
    
    if (frameName && frameConfigData) {
      try {
        const frameConfig = JSON.parse(frameConfigData);
        
        // Get the imported frame asset
        const frameAsset = getFrameAsset(frameName);
        
        console.log('🔍 Frame loading results:', {
          frameName,
          frameAsset: !!frameAsset,
          frameConfig: !!frameConfig,
          slotsCount: frameConfig?.slots?.length
        });
        
        if (frameAsset) {
          setSelectedFrame(frameAsset);
          setFrameSlots(frameConfig.slots); // Extract slots from frameConfig
          setFrameId(frameName);
          setDuplicatePhotos(!!frameConfig.duplicatePhotos);
          // Initialize slotPhotos for duplicate-photo frames so each slot can be independently swapped
                if (frameConfig.duplicatePhotos && Array.isArray(frameConfig.slots)) {
                  const initial = {};
                  frameConfig.slots.forEach((slot, idx) => {
                    const pIdx = slot.photoIndex !== undefined ? slot.photoIndex : idx;
                    initial[idx] = (Array.isArray(photos) && photos[pIdx]) ? photos[pIdx] : null;
                  });

                  const storageKey = getSlotPhotosStorageKey(frameName);
                  let normalized = initial;
                  if (storageKey) {
                    const stored = localStorage.getItem(storageKey);
                    if (stored) {
                      try {
                        const parsed = JSON.parse(stored);
                        const merged = {};
                        frameConfig.slots.forEach((_, idx) => {
                          if (parsed && Object.prototype.hasOwnProperty.call(parsed, idx)) {
                            merged[idx] = parsed[idx];
                          } else {
                            merged[idx] = initial[idx] || null;
                          }
                        });
                        normalized = merged;
                      } catch (err) {
                        console.warn('⚠️ Failed to parse stored slotPhotos, using initial', err);
                      }
                    }
                  }
                  setSlotPhotos(normalized);
                  persistSlotPhotos(frameName, normalized);
                }
          
          console.log('✅ Loaded frame (new format):', frameName);
          console.log('✅ Frame asset:', frameAsset);
          console.log('✅ Loaded slots:', frameConfig.slots);
        } else {
          console.error('❌ Frame asset not found for:', frameName);
          console.error('❌ Available frames in getFrameAsset:', Object.keys({
            'Testframe1': 'Testframe1',
            'Testframe2': 'Testframe2', 
            'Testframe3': 'Testframe3',
            'FremioSeries-blue-2': 'FremioSeries-blue-2',
            'FremioSeries-babyblue-3': 'FremioSeries-babyblue-3',
            'FremioSeries-black-3': 'FremioSeries-black-3',
            'FremioSeries-blue-3': 'FremioSeries-blue-3',
            'FremioSeries-cream-3': 'FremioSeries-cream-3',
            'FremioSeries-green-3': 'FremioSeries-green-3',
            'FremioSeries-maroon-3': 'FremioSeries-maroon-3',
            'FremioSeries-orange-3': 'FremioSeries-orange-3',
            'FremioSeries-pink-3': 'FremioSeries-pink-3',
            'FremioSeries-purple-3': 'FremioSeries-purple-3',
            'FremioSeries-white-3': 'FremioSeries-white-3',
            'FremioSeries-blue-4': 'FremioSeries-blue-4'
          }));
        }
      } catch (error) {
        console.error('❌ Error parsing frameConfig:', error);
      }
    } else {
      // Fallback: try old format
      const legacyFrameData = localStorage.getItem('selectedFrame');
      const legacySlotsData = localStorage.getItem('frameSlots');
      
      // Try provider fallback first if available
      if (frameProvider?.getCurrentConfig) {
        const providerCfg = frameProvider.getCurrentConfig();
        if (providerCfg?.id === frameName) {
          const frameAsset = getFrameAsset(frameName);
          if (frameAsset) {
            setSelectedFrame(frameAsset);
            setFrameSlots(providerCfg.slots);
            setFrameId(frameName);
            setDuplicatePhotos(!!providerCfg.duplicatePhotos);
            console.log('✅ Loaded frame via frameProvider fallback:', frameName);
            return;
          }
        }
      }
      
      if (legacyFrameData && legacySlotsData) {
        // Extract frame name from legacy path
        const frameName = legacyFrameData.split('/').pop().replace('.png', '');
        const frameAsset = getFrameAsset(frameName);
        
        if (frameAsset) {
          setSelectedFrame(frameAsset);
          setFrameSlots(JSON.parse(legacySlotsData));
          setFrameId(frameName);
          console.log('✅ Loaded frame (legacy format):', frameName);
          console.log('✅ Frame asset:', frameAsset);
          console.log('✅ Loaded slots (legacy format):', legacySlotsData);
        }
      } else {
        console.log('❌ No frame data found in localStorage (both formats)');
      }
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
    const activeFrameId = frameId || localStorage.getItem('selectedFrame');
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
      const activeFrameId = frameId || localStorage.getItem('selectedFrame');
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
      localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
      console.log('[DnD] ✅ Berhasil tukar slot', sourceSlotIndex + 1, '↔', targetSlotIndex + 1, '(standard frame)');
    }

    setDraggedPhoto(null);
  };

  // Tools removed on this page per request; keeping only the preview
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '20px',
      paddingTop: '80px',
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
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #ddd'
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

            localStorage.setItem('capturedPhotos', JSON.stringify(samplePhotos));
            localStorage.setItem('selectedFrame', 'FremioSeries-black-3');
            
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
            
            localStorage.setItem('frameConfig', JSON.stringify(frameConfig));
            const slotPhotoMap = {};
            frameConfig.slots.forEach((slot, idx) => {
              const pIdx = slot.photoIndex !== undefined ? slot.photoIndex : idx;
              slotPhotoMap[idx] = samplePhotos[pIdx] || null;
            });
            localStorage.setItem(`slotPhotos:${frameConfig.id}`, JSON.stringify(slotPhotoMap));
            
            console.log('✅ Test data created for FremioSeries-black-3');
            console.log('Photos:', samplePhotos.length);
            console.log('Frame config:', frameConfig);
            
            window.location.reload();
          }}
          style={{
            padding: '5px 10px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🎯 Load Black-3 Test Data
        </button>
        <button 
          onClick={() => {
            createTestframe2TestData();
            window.location.reload();
          }}
          style={{
            padding: '5px 10px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Test Testframe2
        </button>
        <button 
          onClick={() => {
            clearTestData();
            window.location.reload();
          }}
          style={{
            padding: '5px 10px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      
      {/* Main Content: Preview centered (toggle tools removed) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={async () => {
              if (isReloading) return;
              try {
                setIsReloading(true);
                const activeFrameId = frameId || localStorage.getItem('selectedFrame');
                if (!activeFrameId) return;
                const fresh = await reloadFrameConfigFromManager(activeFrameId);
                if (fresh?.slots) {
                  setFrameSlots(fresh.slots);
                  setDuplicatePhotos(!!fresh.duplicatePhotos);
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
                  localStorage.setItem('frameConfig', JSON.stringify(fresh));
                  console.log('✅ Editor: reloaded frame slots');
                }
              } finally {
                setIsReloading(false);
              }
            }}
            style={{
              padding: '6px 12px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            {isReloading ? '⏳ Reloading...' : '🔄 Reload Config'}
          </button>
          
          {/* Drag & Drop Instructions */}
          <div style={{
            padding: '6px 12px',
            background: '#e3f2fd',
            color: '#1565c0',
            borderRadius: '8px',
            fontSize: '0.8rem',
            border: '1px solid #bbdefb'
          }}>
            💡 Drag foto antar slot untuk menukar posisi
          </div>
        </div>
        {/* Preview Area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '500px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '1.1rem',
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
              width: '350px',
              height: '525px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid #e5e5e5',
              overflow: 'hidden'
            }}>
              {/* Photos placed into slots */}
              {frameSlots.map((slot, idx) => {
                const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : idx;
                const src = duplicatePhotos ? (slotPhotos[idx] || photos[photoIndex]) : photos[photoIndex];
                if (!src) return null;
                return (
                  <div
                    key={`slot-${slot.id || idx}`}
                    style={{
                      position: 'absolute',
                      left: `${(slot.left || 0) * 100}%`,
                      top: `${(slot.top || 0) * 100}%`,
                      width: `${(slot.width || 0) * 100}%`,
                      height: `${(slot.height || 0) * 100}%`,
                      overflow: 'hidden',
                      borderRadius: '6px',
                      background: '#ddd',
                      outline: dragOverSlot === idx ? '3px solid #4f46e5' : 'none',
                      transition: 'outline 120ms ease',
                      cursor: draggedPhoto?.slotIndex === idx ? 'grabbing' : 'grab',
                      opacity: draggedPhoto?.slotIndex === idx ? 0.85 : 1,
                      boxShadow: dragOverSlot === idx ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={() => setDraggedPhoto(null)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnter={(e) => handleDragEnter(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                  >
                    <img
                      src={src}
                      alt={`Photo ${idx + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        cursor: draggedPhoto?.slotIndex === idx ? 'grabbing' : 'grab',
                        opacity: draggedPhoto?.slotIndex === idx ? 0.7 : 1,
                        transform: draggedPhoto?.slotIndex === idx ? 'scale(0.95)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                );
              })}

              {/* Frame overlay */}
              <img
                src={selectedFrame}
                alt="Frame"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none'
                }}
              />
            </div>
          ) : (
            <div style={{
              height: '460px',
              width: '350px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              background: '#fff',
              border: '1px dashed #ccc',
              borderRadius: '12px'
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
              console.log('LocalStorage capturedPhotos:', localStorage.getItem('capturedPhotos'));
              console.log('LocalStorage selectedFrame:', localStorage.getItem('selectedFrame'));
              console.log('LocalStorage frameConfig:', localStorage.getItem('frameConfig'));
              console.log('LocalStorage frameSlots (legacy):', localStorage.getItem('frameSlots'));
            }}
            style={{
              marginTop: '10px',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              padding: '8px 20px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            🔍 Debug Drag & Drop
          </button>
          
          {/* Test Data Buttons */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
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
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: '0.7rem',
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
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: '0.7rem',
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