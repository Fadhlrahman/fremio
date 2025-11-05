import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import safeStorage from '../utils/safeStorage.js';
import { BACKGROUND_PHOTO_Z } from '../constants/layers.js';
import html2canvas from 'html2canvas';

export default function EditPhotoMinimal() {
  console.log('🚀 EDITPHOTO MINIMAL RENDERING...');
  
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
    
    try {
      // Load photos
      const capturedPhotos = safeStorage.getJSON('capturedPhotos');
      if (capturedPhotos && Array.isArray(capturedPhotos)) {
        setPhotos(capturedPhotos);
        console.log('✅ Loaded photos:', capturedPhotos.length);
      }

      // Load frame config
      const config = safeStorage.getJSON('frameConfig');
      if (config) {
        setFrameConfig(config);
        console.log('✅ Loaded frame config:', config.id);

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
            console.log('✅ Loaded background photo');
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setLoading(false);
    }
  }, []);

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
        useCORS: true
      });

      const imageData = canvas.toDataURL('image/png');
      
      // Save to localStorage (you can also upload to server here)
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
        background: 'linear-gradient(135deg, #f5f1eb 0%, #e8ddd4 100%)'
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
        color: '#333',
        marginBottom: '2rem',
        marginTop: '1rem'
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
            }}>
              {/* LAYER 1: Background Photo */}
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
                      : BACKGROUND_PHOTO_Z,
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
                        alignItems: 'center',
                        justifyContent: element.data?.align === 'center' ? 'center' : element.data?.align === 'right' ? 'flex-end' : 'flex-start',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.25
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
                      key={`element-${element.id || idx}`}
                      style={{
                        position: 'absolute',
                        left: `${scaledLeft}px`,
                        top: `${scaledTop}px`,
                        width: `${scaledWidth}px`,
                        height: `${scaledHeight}px`,
                        zIndex: elemZIndex,
                        pointerEvents: 'none',
                        background: element.data?.fill || '#f4d3c2',
                        borderRadius: `${(element.data?.borderRadius || 24) * scaleX}px`
                      }}
                    />
                  );
                }

                // Render upload (including converted photo slots)
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
                        overflow: 'hidden',
                        border: element.data?.photoIndex !== undefined ? '2px solid #4CAF50' : 'none'
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
                      {element.data?.photoIndex !== undefined && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          background: '#4CAF50',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          Photo {element.data.photoIndex + 1}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>

            {/* Z-Index Legend */}
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#f0f9ff',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}>
              <strong>✅ Layering Order (z-index):</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', lineHeight: 1.6 }}>
                <li>Background: {BACKGROUND_PHOTO_Z} (paling belakang)</li>
                <li>Photo Slots: {designerElements.find(el => el.data?.photoIndex !== undefined)?.zIndex || 'N/A'}</li>
                <li>Other Elements: 200+ (paling depan)</li>
              </ul>
            </div>
          </div>
        )}

        })}
            </div>

            {/* Save Template Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !frameConfig}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '1rem 2rem',
                background: 'white',
                color: '#333',
                border: '2px solid #ddd',
                borderRadius: '50px',
                fontSize: '1.1rem',
                fontWeight: '500',
                cursor: isSaving || !frameConfig ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '1rem',
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
        )}
      </div>
    </div>
  );
}

        {/* Actions */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            ← Back
          </button>

          <button
            onClick={() => {
              console.log('🔍 Debug Info:');
              console.log('Photos:', photos);
              console.log('FrameConfig:', frameConfig);
              console.log('LocalStorage keys:', Object.keys(localStorage));
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            🔍 Debug Console
          </button>

          <button
            onClick={() => {
              alert('Full EditPhoto.jsx is too large and causing crashes. This minimal version shows loaded data is working.');
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            ℹ️ Info
          </button>
        </div>

        {/* Technical Info */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#666'
        }}>
          <strong>Technical Note:</strong> The original EditPhoto.jsx is 8000+ lines and crashes on load.
          This minimal version proves data loading works. We need to debug the original file to find what's crashing.
        </div>
      </div>
    </div>
  );
}
