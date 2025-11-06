import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import safeStorage from '../utils/safeStorage.js';
import { BACKGROUND_PHOTO_Z } from '../constants/layers.js';
import html2canvas from 'html2canvas';
import { clearFrameCache, clearStaleFrameCache } from '../utils/frameCacheCleaner.js';

export default function EditPhoto() {
  console.log('🚀 EDITPHOTO RENDERING...');
  
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [frameConfig, setFrameConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [designerElements, setDesignerElements] = useState([]);
  const [backgroundPhotoElement, setBackgroundPhotoElement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    hueRotate: 0
  });
  const [activeFilter, setActiveFilter] = useState(null);
  const photosFilled = React.useRef(false);

  useEffect(() => {
    console.log('📦 Loading data from localStorage...');
    
    // Clear stale cache (older than 24 hours)
    clearStaleFrameCache();
    
    const loadFrameData = async () => {
      try {
        // Load photos
        const capturedPhotos = safeStorage.getJSON('capturedPhotos');
        if (capturedPhotos && Array.isArray(capturedPhotos)) {
          setPhotos(capturedPhotos);
          console.log('✅ Loaded photos:', capturedPhotos.length);
        }

        // Load frame config
        let config = safeStorage.getJSON('frameConfig');
        
        // Validate frameConfig timestamp to prevent stale cache
        if (config) {
          const storedTimestamp = safeStorage.getItem('frameConfigTimestamp');
          const configTimestamp = config.__timestamp;
          
          console.log('🕐 Timestamp validation:', {
            storedTimestamp,
            configTimestamp,
            match: storedTimestamp === String(configTimestamp)
          });
          
          // If timestamps don't match, frameConfig is stale
          if (storedTimestamp && configTimestamp && storedTimestamp !== String(configTimestamp)) {
            console.warn('⚠️ FrameConfig timestamp mismatch, clearing stale data');
            safeStorage.removeItem('frameConfig');
            safeStorage.removeItem('frameConfigTimestamp');
            config = null;
          }
        }
        
        // If frameConfig is incomplete (no background photo or missing image), try to load from draft
        if (config && config.isCustom) {
          const backgroundPhoto = config.designer?.elements?.find(el => el?.type === 'background-photo');
          const needsReload = !backgroundPhoto || !backgroundPhoto.data?.image;
          
          if (needsReload) {
            console.log('⚠️ Background photo missing or incomplete, loading from draft...');
            console.log('  - Has background photo element:', !!backgroundPhoto);
            console.log('  - Has image data:', !!backgroundPhoto?.data?.image);
            
            const activeDraftId = safeStorage.getItem('activeDraftId');
            if (activeDraftId) {
              try {
                const { default: draftStorage } = await import('../utils/draftStorage.js');
                const draft = await draftStorage.getDraftById(activeDraftId);
                
                if (draft && draft.elements) {
                  const draftBackgroundPhoto = draft.elements.find(el => el?.type === 'background-photo');
                  if (draftBackgroundPhoto && draftBackgroundPhoto.data?.image) {
                    console.log('✅ Found background photo image in draft, restoring...');
                    console.log('  - Image length:', draftBackgroundPhoto.data.image.length);
                    console.log('  - Image preview:', draftBackgroundPhoto.data.image.substring(0, 50));
                    
                    // Rebuild frameConfig from draft to get complete data
                    const { buildFrameConfigFromDraft } = await import('../utils/draftHelpers.js');
                    config = buildFrameConfigFromDraft(draft);
                    
                    // Try to save complete frameConfig back to localStorage (might fail if too large)
                    try {
                      safeStorage.setJSON('frameConfig', config);
                      console.log('✅ Saved complete frameConfig to localStorage');
                    } catch (storageError) {
                      console.warn('⚠️ Could not save frameConfig to localStorage (too large):', storageError);
                      // That's OK - we'll load from draft next time
                    }
                  } else {
                    console.warn('⚠️ No background photo with image found in draft');
                  }
                } else {
                  console.warn('⚠️ Draft not found or has no elements:', activeDraftId);
                }
              } catch (error) {
                console.error('❌ Failed to load from draft:', error);
              }
            } else {
              console.warn('⚠️ No activeDraftId found in localStorage');
            }
          } else {
            console.log('✅ Background photo with image already present in frameConfig');
          }
        }
        
        // Validasi: frameConfig harus ada dan punya id
        if (!config || !config.id) {
          alert('[FREMIO] Frame belum dipilih atau data frame tidak valid.\n\nPenyebab umum:\n- Anda belum memilih frame\n- Data frame corrupt atau expired\n- Belum ambil foto\n\nSolusi:\n1. Pilih frame dulu di halaman Frames\n2. Ambil foto baru\n3. Jika tetap gagal, klik Reset di menu Settings');
          navigate('/frames');
          return;
        }

        setFrameConfig(config);
        // Log detail frameConfig untuk debug
        console.log('✅ Loaded frame config:', config.id);
        console.log('📋 Frame details:', config);

        // Load designer elements (unified layering system)
        // Support both custom frames and regular frames (converted from slots)
        if (Array.isArray(config.designer?.elements)) {
          // Extract photo elements and convert to uploads
          const photoElements = config.designer.elements.filter(el => el?.type === 'photo');
          console.log('📸 Found photo elements:', photoElements.length);
          photoElements.forEach((el, idx) => {
            console.log(`   Photo ${idx}:`, {
              id: el.id,
              type: el.type,
              photoIndex: el.data?.photoIndex,
              hasImage: !!el.data?.image,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height
            });
          });
          
          const photoAsUploadElements = photoElements.map((photoEl, idx) => ({
            ...photoEl,
            type: 'upload', // Convert to upload for unified rendering
            data: { 
              ...photoEl.data, 
              image: null, // Will be filled later
              photoIndex: photoEl.data?.photoIndex !== undefined ? photoEl.data.photoIndex : idx 
            }
          }));

          // Get other designer elements (text, shapes, uploads)
          const otherDesignerElems = config.designer.elements.filter(el => 
            el && 
            el.type !== 'photo' && 
            el.type !== 'background-photo' &&
            !el?.data?.__capturedOverlay
          );

          // Combine all elements
          const allDesignerElements = [...photoAsUploadElements, ...otherDesignerElems];
          setDesignerElements(allDesignerElements);
          console.log('✅ Loaded designer elements:', allDesignerElements.length);

          // Load background photo
          const backgroundPhoto = config.designer.elements.find(el => el?.type === 'background-photo');
          if (backgroundPhoto) {
            // Verify background photo has image
            if (backgroundPhoto.data?.image) {
              setBackgroundPhotoElement(backgroundPhoto);
              console.log('✅ Loaded background photo with image:', {
                id: backgroundPhoto.id,
                hasImage: !!backgroundPhoto.data?.image,
                imageLength: backgroundPhoto.data?.image?.length,
                imagePreview: backgroundPhoto.data?.image?.substring(0, 50),
                zIndex: backgroundPhoto.zIndex,
                x: backgroundPhoto.x,
                y: backgroundPhoto.y,
                width: backgroundPhoto.width,
                height: backgroundPhoto.height
              });
            } else {
              console.warn('⚠️ Background photo found but missing image data!');
              console.log('   This might happen if localStorage was cleared or data was sanitized');
              console.log('   Background photo will not be displayed');
              setBackgroundPhotoElement(null);
            }
          } else {
            console.warn('⚠️ No background photo found in frameConfig.designer.elements');
            console.log('   Elements found:', config.designer.elements.map(el => ({ type: el.type, id: el.id })));
            setBackgroundPhotoElement(null);
          }
        } else {
          console.warn('⚠️ No designer.elements found in frameConfig');
          console.log('📋 Available properties:', Object.keys(config));
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Error loading data:', error);
        setLoading(false);
      }
    };
    
    loadFrameData();
  }, [navigate]);

  // Fill photo elements with real captured photos
  useEffect(() => {
    // Prevent infinite loop by using ref
    if (photosFilled.current) {
      return;
    }
    
    if (designerElements.length === 0 || photos.length === 0) {
      console.log('⏭️ Skipping photo fill:', {
        hasElements: designerElements.length > 0,
        hasPhotos: photos.length > 0
      });
      return;
    }

    console.log('🔄 Checking if photo elements need filling...');
    console.log('   Designer elements:', designerElements.length);
    console.log('   Available photos:', photos.length);
    console.log('   Elements detail:', designerElements.map(el => ({
      id: el.id?.slice(0, 8),
      type: el.type,
      photoIndex: el.data?.photoIndex,
      hasImage: !!el.data?.image
    })));
    
    // Check if any elements need filling
    const photoSlots = designerElements.filter(el => 
      el.type === 'upload' && 
      typeof el.data?.photoIndex === 'number'
    );
    
    const needsFilling = photoSlots.some(el => !el.data.image);
    
    if (!needsFilling) {
      console.log('✅ All photo elements already filled');
      photosFilled.current = true;
      return;
    }

    console.log('🔄 Filling photo elements with real images...');
    console.log(`   Found ${photoSlots.length} photo slots`);
    
    const updatedElements = designerElements.map(el => {
      if (el.type === 'upload' && typeof el.data?.photoIndex === 'number') {
        const photoData = photos[el.data.photoIndex];
        if (photoData) {
          console.log(`✅ Filling photo slot ${el.data.photoIndex} with image`);
          console.log(`   Photo data length: ${photoData.length}`);
          console.log(`   Photo data preview: ${photoData.substring(0, 50)}...`);
          return { 
            ...el, 
            data: { ...el.data, image: photoData }
          };
        } else {
          console.warn(`⚠️ No photo data found for slot ${el.data.photoIndex}`);
          console.warn(`   Available photos: ${photos.length}, requested index: ${el.data.photoIndex}`);
        }
      }
      return el;
    });

    setDesignerElements(updatedElements);
    photosFilled.current = true;
  }, [photos, designerElements]);

  // Filter presets (9 filters - no Cool Tone, no blur)
  const filterPresets = [
    { name: 'Original', icon: '📷', filters: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 } },
    { name: 'Black & White', icon: '⚫', filters: { brightness: 100, contrast: 115, saturate: 0, grayscale: 100, sepia: 0, blur: 0, hueRotate: 0 } },
    { name: 'Sepia', icon: '🟤', filters: { brightness: 110, contrast: 90, saturate: 80, grayscale: 0, sepia: 70, blur: 0, hueRotate: 0 } },
    { name: 'Warm Tone', icon: '🌅', filters: { brightness: 108, contrast: 98, saturate: 115, grayscale: 0, sepia: 15, blur: 0, hueRotate: 15 } },
    { name: 'High Contrast', icon: '⚡', filters: { brightness: 105, contrast: 140, saturate: 120, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 } },
    { name: 'Soft Light', icon: '☁️', filters: { brightness: 110, contrast: 85, saturate: 90, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 } },
    { name: 'Vivid', icon: '🌈', filters: { brightness: 110, contrast: 125, saturate: 160, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 } },
    { name: 'Fade', icon: '🌫️', filters: { brightness: 108, contrast: 75, saturate: 85, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 } },
    { name: 'Grayscale', icon: '⬜', filters: { brightness: 105, contrast: 100, saturate: 0, grayscale: 100, sepia: 0, blur: 0, hueRotate: 0 } }
  ];

  const applyFilterPreset = (preset) => {
    setFilters(preset.filters);
    setActiveFilter(preset.name);
  };

  const resetFilters = () => {
    setFilters({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 });
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
      `.trim()
    };
  };

  // Save function
  const handleSave = async () => {
    if (!frameConfig) {
      alert('No frame loaded');
      return;
    }

    setIsSaving(true);
    setSaveMessage('Saving...');

    try {
      const previewCanvas = document.getElementById('frame-preview-canvas');
      if (!previewCanvas) {
        throw new Error('Preview canvas not found');
      }

      // Capture with html2canvas
      const canvas = await html2canvas(previewCanvas, {
        scale: 2,
        backgroundColor: frameConfig.designer?.canvasBackground || '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 0
      });

      const imageData = canvas.toDataURL('image/png');
      
      // Save to localStorage
      const timestamp = Date.now();
      const savedImages = safeStorage.getJSON('savedImages') || [];
      savedImages.push({
        id: timestamp,
        frameId: frameConfig.id,
        image: imageData,
        timestamp,
        photos: photos.length
      });
      safeStorage.setJSON('savedImages', savedImages);

      setSaveMessage('✅ Saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      setSaveMessage('❌ Failed to save');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fdf7f4'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf7f4',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1rem',
      paddingTop: '0.5rem'
    }}>
      {/* Debug Info: Show if frameConfig or photos missing */}
      {(!frameConfig || photos.length === 0) && (
        <div style={{
          background: '#fff7ed',
          color: '#b45309',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          maxWidth: '600px',
          fontSize: '0.95rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <strong>Debug Info:</strong>
          <div>frameConfig: {JSON.stringify(safeStorage.getJSON('frameConfig'))}</div>
          <div>frameConfigTimestamp: {String(safeStorage.getItem('frameConfigTimestamp'))}</div>
          <div>capturedPhotos: {JSON.stringify(safeStorage.getJSON('capturedPhotos'))}</div>
          <div>activeDraftId: {String(safeStorage.getItem('activeDraftId'))}</div>
        </div>
      )}

      {/* Preview Title */}
      <h1 style={{
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#000000',
        marginBottom: '0.75rem',
        marginTop: '0.5rem',
        fontFamily: 'Poppins, sans-serif'
      }}>
        Preview
      </h1>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          fontSize: '0.9rem',
          background: saveMessage.includes('✅') ? '#d4edda' : '#f8d7da',
          color: saveMessage.includes('✅') ? '#155724' : '#721c24',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          {saveMessage}
        </div>
      )}

      {/* Photo Preview */}
      {frameConfig && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          width: '100%',
          maxWidth: '900px'
        }}>
          {/* Frame Canvas Container */}
          <div style={{
            background: 'white',
            padding: '1rem',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            width: 'fit-content',
            height: `${1920 * 0.25 + 32}px` // scaled height + padding
          }}>
            {/* Frame Canvas */}
            <div
              id="frame-preview-canvas"
              style={{
                position: 'relative',
                width: '1080px',
                height: '1920px',
                margin: '0 auto',
                background: frameConfig && frameConfig.designer ? frameConfig.designer.canvasBackground || '#fff' : '#fff',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                transform: 'scale(0.25)',
                transformOrigin: 'top center'
              }}
            >
              {/* LAYER 1: Background Photo */}
              {backgroundPhotoElement && backgroundPhotoElement.data?.image && (
                <img
                  src={backgroundPhotoElement.data.image}
                  alt="Background"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: BACKGROUND_PHOTO_Z,
                    ...getFilterStyle()
                  }}
                />
              )}
              
              {/* LAYER 2 & 3: Designer Elements (photos as uploads, text, shapes, real uploads) */}
              {designerElements && designerElements.length > 0 && designerElements.map((element, idx) => {
                if (!element || !element.type) return null;
                const elemZIndex = Number.isFinite(element.zIndex) ? element.zIndex : 200 + idx;
                
                // Render text
                if (element.type === 'text') {
                  return (
                    <div
                      key={`element-${element.id || idx}`}
                      style={{
                        position: 'absolute',
                        left: `${element.x || 0}px`,
                        top: `${element.y || 0}px`,
                        width: `${element.width || 100}px`,
                        height: `${element.height || 100}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        fontFamily: element.data?.fontFamily || 'Inter',
                        fontSize: `${element.data?.fontSize || 24}px`,
                        color: element.data?.color || '#111827',
                        fontWeight: element.data?.fontWeight || 500,
                        textAlign: element.data?.align || 'left',
                        display: 'flex',
                        alignItems: element.data?.verticalAlign === 'middle' ? 'center' : 
                                   element.data?.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
                        justifyContent: element.data?.align === 'center' ? 'center' : 
                                       element.data?.align === 'right' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {element.data?.text || ''}
                    </div>
                  );
                }
                
                // Render shape
                if (element.type === 'shape') {
                  return (
                    <div
                      key={`element-${element.id || idx}`}
                      style={{
                        position: 'absolute',
                        left: `${element.x || 0}px`,
                        top: `${element.y || 0}px`,
                        width: `${element.width || 100}px`,
                        height: `${element.height || 100}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        background: element.data?.fill || '#000',
                        borderRadius: element.data?.shape === 'circle' ? '50%' : 
                                     `${element.data?.borderRadius || 0}px`,
                        opacity: element.data?.opacity !== undefined ? element.data.opacity : 1
                      }}
                    />
                  );
                }
                
                // Render upload (including converted photos)
                if (element.type === 'upload') {
                  const hasImage = !!element.data?.image;
                  const isPhotoSlot = typeof element.data?.photoIndex === 'number';
                  
                  if (!hasImage && isPhotoSlot) {
                    console.warn(`⚠️ Photo slot ${element.data.photoIndex} missing image!`);
                  }
                  
                  if (!hasImage) {
                    // Render placeholder for empty photo slots
                    return (
                      <div
                        key={`element-${element.id || idx}`}
                        style={{
                          position: 'absolute',
                          left: `${element.x || 0}px`,
                          top: `${element.y || 0}px`,
                          width: `${element.width || 100}px`,
                          height: `${element.height || 100}px`,
                          zIndex: elemZIndex,
                          pointerEvents: 'none',
                          borderRadius: `${element.data?.borderRadius || 24}px`,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f3f4f6',
                          border: '2px dashed #d1d5db'
                        }}
                      >
                        <span style={{
                          fontSize: '48px',
                          color: '#9ca3af'
                        }}>📷</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={`element-${element.id || idx}`}
                      style={{
                        position: 'absolute',
                        left: `${element.x || 0}px`,
                        top: `${element.y || 0}px`,
                        width: `${element.width || 100}px`,
                        height: `${element.height || 100}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        borderRadius: `${element.data?.borderRadius || 24}px`,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fff'
                      }}
                    >
                      <img
                        src={element.data.image}
                        alt={element.data?.photoIndex !== undefined ? `Photo ${element.data.photoIndex + 1}` : 'Upload'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          ...getFilterStyle()
                        }}
                      />
                    </div>
                  );
                }
                
                return null;
              })}
              
              {/* LAYER 4: Frame Overlay (frameImage) - Always on top */}
              {frameConfig && !frameConfig.isCustom && frameConfig.frameImage && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 9999,
                    pointerEvents: 'none'
                  }}
                >
                  <img
                    src={frameConfig.frameImage}
                    alt="Frame Overlay"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Filter Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'thin',
            scrollbarColor: '#D1D5DB #F3F4F6',
            WebkitOverflowScrolling: 'touch'
          }}>
            {filterPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyFilterPreset(preset)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: activeFilter === preset.name ? '#4F46E5' : 'white',
                  color: activeFilter === preset.name ? 'white' : '#333',
                  border: `2px solid ${activeFilter === preset.name ? '#4F46E5' : '#E5E7EB'}`,
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                  minWidth: '75px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (activeFilter !== preset.name) {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.background = '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilter !== preset.name) {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = 'white';
                  }
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{preset.icon}</span>
                <span style={{ fontSize: '0.7rem' }}>{preset.name}</span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            width: '100%',
            maxWidth: '400px',
            marginTop: '1rem',
            justifyContent: 'center'
          }}>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              onClick={async () => {
                console.log('🎨 Memulai download dengan canvas manual...');
                
                try {
                  // Buat canvas baru
                  const canvas = document.createElement('canvas');
                  canvas.width = 1080;
                  canvas.height = 1920;
                  const ctx = canvas.getContext('2d');
                  
                  // Background color
                  ctx.fillStyle = frameConfig?.designer?.canvasBackground || '#ffffff';
                  ctx.fillRect(0, 0, 1080, 1920);
                  
                  // Helper function untuk object-fit: cover
                  const drawImageCover = (ctx, img, x, y, w, h) => {
                    const imgRatio = img.width / img.height;
                    const boxRatio = w / h;
                    
                    let sourceX = 0, sourceY = 0, sourceW = img.width, sourceH = img.height;
                    
                    if (imgRatio > boxRatio) {
                      // Image lebih lebar, crop kiri-kanan
                      sourceW = img.height * boxRatio;
                      sourceX = (img.width - sourceW) / 2;
                    } else {
                      // Image lebih tinggi, crop atas-bawah
                      sourceH = img.width / boxRatio;
                      sourceY = (img.height - sourceH) / 2;
                    }
                    
                    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, x, y, w, h);
                  };
                  
                  // Load dan draw background photo
                  if (backgroundPhotoElement && backgroundPhotoElement.data?.image) {
                    const bgImg = new Image();
                    bgImg.crossOrigin = 'anonymous';
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
                      bgImg.src = backgroundPhotoElement.data.image;
                    });
                  }
                  
                  // Sort designer elements by z-index to draw in correct order
                  const sortedElements = [...designerElements].sort((a, b) => {
                    const zIndexA = Number.isFinite(a?.zIndex) ? a.zIndex : 200;
                    const zIndexB = Number.isFinite(b?.zIndex) ? b.zIndex : 200;
                    return zIndexA - zIndexB;
                  });
                  
                  console.log('📊 Rendering elements in order:', sortedElements.map(el => ({
                    type: el.type,
                    id: el.id?.slice(0, 8),
                    zIndex: el.zIndex,
                    text: el.type === 'text' ? el.data?.text : undefined
                  })));
                  
                  // Draw designer elements
                  for (const element of sortedElements) {
                    if (!element || !element.type) continue;
                    
                    if (element.type === 'upload' && element.data?.image) {
                      const img = new Image();
                      img.crossOrigin = 'anonymous';
                      await new Promise((resolve, reject) => {
                        img.onload = () => {
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
                          
                          // Draw dengan object-fit: cover
                          drawImageCover(ctx, img, x, y, w, h);
                          ctx.restore();
                          resolve();
                        };
                        img.onerror = reject;
                        img.src = element.data.image;
                      });
                    } else if (element.type === 'shape') {
                      ctx.save();
                      ctx.fillStyle = element.data?.fill || '#000';
                      ctx.globalAlpha = element.data?.opacity !== undefined ? element.data.opacity : 1;
                      
                      const x = element.x || 0;
                      const y = element.y || 0;
                      const w = element.width || 100;
                      const h = element.height || 100;
                      const r = element.data?.borderRadius || 0;
                      
                      if (element.data?.shape === 'circle') {
                        ctx.beginPath();
                        ctx.arc(x + w/2, y + h/2, Math.min(w, h)/2, 0, Math.PI * 2);
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
                    } else if (element.type === 'text') {
                      ctx.save();
                      
                      const fontSize = element.data?.fontSize || 24;
                      const fontWeight = element.data?.fontWeight || 500;
                      const fontFamily = element.data?.fontFamily || 'Inter';
                      
                      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                      ctx.fillStyle = element.data?.color || '#111827';
                      ctx.textAlign = element.data?.align || 'left';
                      
                      const x = element.x || 0;
                      const y = element.y || 0;
                      const w = element.width || 100;
                      const h = element.height || 100;
                      const text = element.data?.text || '';
                      
                      // Handle multi-line text (split by \n)
                      const lines = text.split('\n');
                      const lineHeight = fontSize * 1.2; // Standard line height
                      
                      // Calculate starting position based on alignment
                      let textX = x;
                      if (element.data?.align === 'center') textX = x + w / 2;
                      else if (element.data?.align === 'right') textX = x + w;
                      
                      // Calculate starting Y based on vertical alignment
                      let startY = y;
                      const totalTextHeight = lines.length * lineHeight;
                      
                      if (element.data?.verticalAlign === 'middle') {
                        startY = y + (h - totalTextHeight) / 2 + fontSize;
                      } else if (element.data?.verticalAlign === 'bottom') {
                        startY = y + h - totalTextHeight + fontSize;
                      } else {
                        startY = y + fontSize;
                      }
                      
                      // Draw each line
                      lines.forEach((line, index) => {
                        const lineY = startY + (index * lineHeight);
                        ctx.fillText(line, textX, lineY);
                      });
                      
                      ctx.restore();
                    }
                  }
                  
                  // Draw frame overlay if exists
                  if (frameConfig && !frameConfig.isCustom && frameConfig.frameImage) {
                    const frameImg = new Image();
                    frameImg.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                      frameImg.onload = () => {
                        ctx.drawImage(frameImg, 0, 0, 1080, 1920);
                        resolve();
                      };
                      frameImg.onerror = reject;
                      frameImg.src = frameConfig.frameImage;
                    });
                  }
                  
                  // Download
                  console.log('Canvas created:', { width: canvas.width, height: canvas.height });
                  const link = document.createElement('a');
                  link.download = 'fremio-photo.png';
                  link.href = canvas.toDataURL('image/png', 1.0);
                  link.click();
                  
                  console.log('✅ Download selesai!');
                } catch (error) {
                  console.error('❌ Error saat download:', error);
                  alert('Gagal download foto: ' + error.message);
                }
              }}
            >
              Download Photo
            </button>
            <button
              onClick={() => {
                alert('Fitur Download Video belum tersedia.');
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Download Video
            </button>
          </div>

          {/* Navigation Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            width: '100%',
            maxWidth: '400px',
            marginTop: '1rem',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => {
                if (window.confirm('Kembali ke halaman utama? Cache frame akan dibersihkan.')) {
                  clearFrameCache();
                  navigate('/');
                }
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🏠 Back to Home
            </button>
            <button
              onClick={() => {
                if (window.confirm('Buat frame baru? Cache frame saat ini akan dibersihkan.')) {
                  clearFrameCache();
                  navigate('/create');
                }
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#8B5CF6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: '600'
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
