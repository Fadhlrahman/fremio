import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import safeStorage from '../utils/safeStorage.js';
import { BACKGROUND_PHOTO_Z } from '../constants/layers.js';
import html2canvas from 'html2canvas';

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

  useEffect(() => {
    console.log('📦 Loading data from localStorage...');
    
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
        
        // If frameConfig is incomplete (no background photo image), try to load from draft
        if (config && config.isCustom) {
          const backgroundPhoto = config.designer?.elements?.find(el => el?.type === 'background-photo');
          if (backgroundPhoto && !backgroundPhoto.data?.image) {
            console.log('⚠️ Background photo found but no image, loading from draft...');
            
            const activeDraftId = safeStorage.getItem('activeDraftId');
            if (activeDraftId) {
              try {
                const { default: draftStorage } = await import('../utils/draftStorage.js');
                const draft = await draftStorage.getDraftById(activeDraftId);
                
                if (draft && draft.elements) {
                  const draftBackgroundPhoto = draft.elements.find(el => el?.type === 'background-photo');
                  if (draftBackgroundPhoto && draftBackgroundPhoto.data?.image) {
                    console.log('✅ Found background photo image in draft, restoring...');
                    
                    // Rebuild frameConfig from draft to get complete data
                    const { buildFrameConfigFromDraft } = await import('../utils/draftHelpers.js');
                    config = buildFrameConfigFromDraft(draft);
                    
                    // Save complete frameConfig back to localStorage
                    safeStorage.setJSON('frameConfig', config);
                  }
                }
              } catch (error) {
                console.error('❌ Failed to load from draft:', error);
              }
            }
          }
        }
        
        // Validasi: frameConfig harus ada dan punya id
        if (!config || !config.id) {
          alert('Frame belum dipilih atau data frame tidak valid. Silakan pilih frame terlebih dahulu.');
          navigate('/frames');
          return;
        }

        setFrameConfig(config);
        // Log detail frameConfig untuk debug
        console.log('✅ Loaded frame config:', config.id);
        console.log('📋 Frame details:', config);

        // Load designer elements (unified layering system)
        if (config.isCustom && Array.isArray(config.designer?.elements)) {
          // Extract photo elements and convert to uploads
          const photoElements = config.designer.elements.filter(el => el?.type === 'photo');
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
            setBackgroundPhotoElement(backgroundPhoto);
            console.log('✅ Loaded background photo:', {
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
            console.log('⚠️ No background photo found in frameConfig');
          }
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
    if (designerElements.length === 0 || photos.length === 0) return;

    console.log('🔄 Filling photo elements with real images...');
    const updatedElements = designerElements.map(el => {
      if (el.type === 'upload' && typeof el.data?.photoIndex === 'number') {
        const photoData = photos[el.data.photoIndex];
        if (photoData) {
          console.log(`✅ Filling photo slot ${el.data.photoIndex} with image`);
          return { 
            ...el, 
            data: { ...el.data, image: photoData }
          };
        }
      }
      return el;
    });

    setDesignerElements(updatedElements);
  }, [photos]);

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
        background: '#E8E8E8'
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
      background: '#E8E8E8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem'
    }}>
      {/* Preview Title */}
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: '400',
        color: '#9CA3AF',
        marginBottom: '0.5rem',
        marginTop: '1rem'
      }}>
        Preview
      </h1>

      {/* Frame Name Info */}
      {frameConfig && (
        <p style={{
          fontSize: '0.9rem',
          color: '#6B7280',
          marginBottom: '2rem',
          fontWeight: '500'
        }}>
          {frameConfig.name || frameConfig.id}
          {frameConfig.isCustom && (
            <span style={{
              marginLeft: '0.5rem',
              padding: '0.25rem 0.5rem',
              background: '#E0E7FF',
              color: '#4F46E5',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              Custom
            </span>
          )}
        </p>
      )}

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
          gap: '2rem'
        }}>
          {/* Frame Canvas Container */}
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            {/* Frame Canvas */}
            <div
              id="frame-preview-canvas"
              style={{
                position: 'relative',
                width: '280px',
                height: '498px',
                margin: '0 auto',
                background: frameConfig.designer?.canvasBackground || '#fff',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                overflow: 'hidden'
              }}
            >
              {/* LAYER 1: Background Photo */}
              {backgroundPhotoElement && backgroundPhotoElement.data?.image && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 0, // Background photo always has z-index 0
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={backgroundPhotoElement.data.image}
                    alt="Background"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}

              {/* LAYER 2 & 3: Designer Elements (photos as uploads, text, shapes, real uploads) */}
              {designerElements && designerElements.length > 0 && designerElements.map((element, idx) => {
                if (!element || !element.type) return null;

                const elemZIndex = Number.isFinite(element.zIndex) ? element.zIndex : 200 + idx;
                
                // Calculate scaled positions
                const previewWidth = 280;
                const previewHeight = 498;
                const canvasWidth = frameConfig?.layout?.canvasWidth || 1080;
                const canvasHeight = frameConfig?.layout?.canvasHeight || 1920;
                
                const scaleX = previewWidth / canvasWidth;
                const scaleY = previewHeight / canvasHeight;
                
                const scaledLeft = (element.x || 0) * scaleX;
                const scaledTop = (element.y || 0) * scaleY;
                const scaledWidth = (element.width || 100) * scaleX;
                const scaledHeight = (element.height || 100) * scaleY;

                // Render text
                if (element.type === 'text') {
                  const fontSize = (element.data?.fontSize || 24) * scaleX;
                  return (
                    <div
                      key={`element-${element.id || idx}`}
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
                        left: `${scaledLeft}px`,
                        top: `${scaledTop}px`,
                        width: `${scaledWidth}px`,
                        height: `${scaledHeight}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        background: element.data?.fill || '#000',
                        borderRadius: element.data?.shape === 'circle' ? '50%' : 
                                     `${(element.data?.borderRadius || 0) * scaleX}px`,
                        opacity: element.data?.opacity !== undefined ? element.data.opacity : 1
                      }}
                    />
                  );
                }

                // Render upload (including converted photos)
                if (element.type === 'upload' && element.data?.image) {
                  return (
                    <div
                      key={`element-${element.id || idx}`}
                      style={{
                        position: 'absolute',
                        left: `${scaledLeft}px`,
                        top: `${scaledTop}px`,
                        width: `${scaledWidth}px`,
                        height: `${scaledHeight}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        borderRadius: `${(element.data?.borderRadius || 24) * scaleX}px`,
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={element.data.image}
                        alt={element.data?.photoIndex !== undefined ? `Photo ${element.data.photoIndex + 1}` : 'Upload'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: element.data?.objectFit || 'cover'
                        }}
                      />
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            width: '100%',
            maxWidth: '400px'
          }}>
            {/* Back to Frames Button */}
            <button
              onClick={() => navigate('/frames')}
              style={{
                flex: 1,
                padding: '1rem 2rem',
                background: 'white',
                color: '#6B7280',
                border: '2px solid #E5E7EB',
                borderRadius: '50px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#F9FAFB';
                e.target.style.borderColor = '#D1D5DB';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#E5E7EB';
              }}
            >
              ← Frames
            </button>

            {/* Save Template Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !frameConfig}
              style={{
                flex: 1,
                padding: '1rem 2rem',
                background: 'white',
                color: '#333',
                border: '2px solid #ddd',
                borderRadius: '50px',
                fontSize: '1.1rem',
                fontWeight: '500',
                cursor: isSaving || !frameConfig ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                if (!isSaving && frameConfig) {
                  e.target.style.background = '#f8f8f8';
                  e.target.style.borderColor = '#999';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaving && frameConfig) {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#ddd';
                }
              }}
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
