import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFrameConfig } from '../config/frameConfigs.js';
import Testframe1 from '../assets/Testframe1.png';
import Testframe2 from '../assets/Testframe2.png';
import Testframe3 from '../assets/Testframe3.png';

export default function EditPhoto() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [frameConfig, setFrameConfig] = useState(null);
  const [frameImage, setFrameImage] = useState(null);
  const [activeToggle, setActiveToggle] = useState('filter');
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [draggedPhoto, setDraggedPhoto] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [photoPositions, setPhotoPositions] = useState({}); // Store photo positions for fine-tuning
  const [debugMode, setDebugMode] = useState(false); // Debug mode toggle
  const [configReloadKey, setConfigReloadKey] = useState(0); // Force config reload
  const [isReloading, setIsReloading] = useState(false); // Loading state for reload

  // Frame image mapping
  const getFrameImage = (frameId) => {
    const frameMap = {
      'Testframe1': Testframe1,
      'Testframe2': Testframe2,
      'Testframe3': Testframe3
    };
    return frameMap[frameId] || Testframe1;
  };

  // Load photos and frame config on mount
  useEffect(() => {
    // Load photos from localStorage
    const savedPhotos = localStorage.getItem('capturedPhotos');
    if (savedPhotos) {
      try {
        const parsedPhotos = JSON.parse(savedPhotos);
        setPhotos(parsedPhotos);
        
        // Initialize photo positions with better defaults for portrait photos
        const positions = {};
        parsedPhotos.forEach((_, index) => {
          positions[index] = 'center center'; // Centered positioning
        });
        setPhotoPositions(positions);
        
        console.log('✅ Loaded photos:', parsedPhotos.length);
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    }

    // Load selected frame from localStorage
    const selectedFrame = localStorage.getItem('selectedFrame') || 'Testframe1';
    console.log('🖼️ Loading frame:', selectedFrame);
    
    const config = getFrameConfig(selectedFrame);
    if (config) {
      setFrameConfig(config);
      setFrameImage(getFrameImage(selectedFrame));
      console.log('✅ Frame config loaded:', config);
    } else {
      console.error('❌ Failed to load frame config for:', selectedFrame);
    }
  }, []);

  // Handle drag start
  const handleDragStart = (e, photoIndex, slotIndex) => {
    setDraggedPhoto({ photoIndex, slotIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e, slotIndex) => {
    e.preventDefault();
    setDragOverSlot(slotIndex);
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  // Handle drop
  const handleDrop = (e, targetSlotIndex) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    if (!draggedPhoto) return;
    
    const { photoIndex: draggedPhotoIndex, slotIndex: sourceSlotIndex } = draggedPhoto;
    
    if (sourceSlotIndex === targetSlotIndex) {
      setDraggedPhoto(null);
      return;
    }

    // Create new photos array with swapped positions
    const newPhotos = [...photos];
    const newPhotoPositions = { ...photoPositions };
    
    // Swap photos
    const temp = newPhotos[sourceSlotIndex];
    newPhotos[sourceSlotIndex] = newPhotos[targetSlotIndex];
    newPhotos[targetSlotIndex] = temp;
    
    // Swap photo positions
    const tempPos = newPhotoPositions[sourceSlotIndex];
    newPhotoPositions[sourceSlotIndex] = newPhotoPositions[targetSlotIndex];
    newPhotoPositions[targetSlotIndex] = tempPos;
    
    setPhotos(newPhotos);
    setPhotoPositions(newPhotoPositions);
    localStorage.setItem('capturedPhotos', JSON.stringify(newPhotos));
    setDraggedPhoto(null);
    
    console.log(`🔄 Swapped photo from slot ${sourceSlotIndex} to slot ${targetSlotIndex}`);
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

  // Fungsi untuk menghitung style cropping yang presisi
  const calculatePhotoCropStyle = (frameConfig, slotIndex) => {
    const slotDimensions = calculateSlotDimensions(frameConfig, slotIndex);
    if (!slotDimensions) return {};
    
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover', // Crop foto untuk memenuhi slot
      objectPosition: 'center center', // Simpan di tengah slot
    };
  };

  // Fungsi untuk reload frame config secara live  
  const reloadFrameConfig = () => {
    if (isReloading) return; // Prevent multiple calls
    
    setIsReloading(true);
    
    try {
      // Get current selected frame
      const selectedFrame = localStorage.getItem('selectedFrame') || 'Testframe1';
      console.log('🔄 Attempting to reload config for:', selectedFrame);
      
      // Force component re-render with fresh import
      const timestamp = Date.now();
      
      // Use dynamic import with cache busting
      import(`../config/frameConfigs.js?t=${timestamp}`)
        .then(module => {
          console.log('📦 Module reloaded:', module);
          const newConfig = module.getFrameConfig(selectedFrame);
          if (newConfig) {
            setFrameConfig(newConfig);
            setConfigReloadKey(prev => prev + 1);
            console.log('✅ Frame config reloaded successfully:', newConfig);
          } else {
            console.warn('⚠️ No config found for frame:', selectedFrame);
          }
        })
        .catch(error => {
          console.error('❌ Failed to reload module:', error);
          // Fallback: use existing getFrameConfig
          const fallbackConfig = getFrameConfig(selectedFrame);
          if (fallbackConfig) {
            setFrameConfig(fallbackConfig);
            setConfigReloadKey(prev => prev + 1);
            console.log('⚡ Using fallback config reload:', fallbackConfig);
          }
        })
        .finally(() => {
          setIsReloading(false);
        });
        
    } catch (error) {
      console.error('❌ Failed to reload frame config:', error);
      setIsReloading(false);
    }
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

  const handleSave = () => {
    // TODO: Implement save functionality
    alert('Save functionality will be implemented');
  };

  const handlePrint = () => {
    // TODO: Implement print functionality
    alert('Print functionality will be implemented');
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
                      backgroundColor: '#f8f9fa',
                      border: dragOverSlot === slotIndex ? '1px dashed #E8A889' : 'none',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box',
                      // Pastikan aspect ratio 4:5 untuk slot
                      aspectRatio: slot.aspectRatio ? slot.aspectRatio.replace(':', '/') : '4/5'
                    }}
                    onDragOver={(e) => handleDragOver(e, slotIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, slotIndex)}
                  >
                    {photos[slotIndex] && (
                      <div style={{ 
                        position: 'relative', 
                        width: '100%', 
                        height: '100%',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={photos[slotIndex]}
                          alt={`Photo ${slotIndex + 1}`}
                          style={{
                            ...calculatePhotoCropStyle(frameConfig, slotIndex),
                            opacity: draggedPhoto?.slotIndex === slotIndex ? 0.7 : 1,
                            transform: draggedPhoto?.slotIndex === slotIndex ? 'scale(0.98)' : 'scale(1)'
                          }}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, slotIndex, slotIndex)}
                          onMouseDown={(e) => e.target.style.cursor = 'grabbing'}
                          onMouseUp={(e) => e.target.style.cursor = 'grab'}
                        />
                        {/* Drag indicator */}
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '16px',
                          height: '16px',
                          background: 'rgba(0,0,0,0.6)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          color: 'white',
                          pointerEvents: 'none',
                          zIndex: 10
                        }}>
                          ↔
                        </div>
                      </div>
                    )}
                    {!photos[slotIndex] && (
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
                    )}
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
            justifyContent: 'center'
          }}>
            <button
              onClick={handleSave}
              style={{
                background: '#fff',
                border: '2px solid #E8A889',
                color: '#E8A889',
                borderRadius: '25px',
                padding: '0.8rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#E8A889';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.color = '#E8A889';
              }}
            >
              Save
            </button>
            <button
              onClick={handlePrint}
              style={{
                background: '#E8A889',
                border: 'none',
                color: 'white',
                borderRadius: '25px',
                padding: '0.8rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#d49673';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#E8A889';
              }}
            >
              Print
            </button>
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
                Drag photos to frame slots
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
    </div>
  );
}