import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import filterIcon from '../assets/filter-icon.png';
import adjustIcon from '../assets/adjust-icon.png';
import { createSampleData, clearTestData } from '../utils/testData.js';
import Testframe1 from '../assets/Testframe1.png';
import Testframe2 from '../assets/Testframe2.png';
import Testframe3 from '../assets/Testframe3.png';
import Testframe4 from '../assets/Testframe4.png';

export default function Editor() {
  const navigate = useNavigate();
  const [selectedTool, setSelectedTool] = useState('Filter');
  const [photos, setPhotos] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [frameSlots, setFrameSlots] = useState(null);

  // Frame mapping for imported assets
  const getFrameAsset = (frameName) => {
    const frameMap = {
      'Testframe1': Testframe1,
      'Testframe2': Testframe2,
      'Testframe3': Testframe3,
      'Testframe4': Testframe4
    };
    return frameMap[frameName] || null;
  };

  // Load photos and frame data from localStorage when component mounts
  useEffect(() => {
    // Get captured photos from localStorage
    const capturedPhotos = localStorage.getItem('capturedPhotos');
    if (capturedPhotos) {
      const parsedPhotos = JSON.parse(capturedPhotos);
      setPhotos(parsedPhotos);
      console.log('✅ Loaded photos:', parsedPhotos.length);
    }

    // Get frame data from localStorage (new format with frameConfig)
    const frameName = localStorage.getItem('selectedFrame');
    const frameConfigData = localStorage.getItem('frameConfig');
    
    if (frameName && frameConfigData) {
      try {
        const frameConfig = JSON.parse(frameConfigData);
        
        // Get the imported frame asset
        const frameAsset = getFrameAsset(frameName);
        
        if (frameAsset) {
          setSelectedFrame(frameAsset);
          setFrameSlots(frameConfig.slots); // Extract slots from frameConfig
          
          console.log('✅ Loaded frame (new format):', frameName);
          console.log('✅ Frame asset:', frameAsset);
          console.log('✅ Loaded slots:', frameConfig.slots);
        } else {
          console.error('❌ Frame asset not found for:', frameName);
        }
      } catch (error) {
        console.error('❌ Error parsing frameConfig:', error);
      }
    } else {
      // Fallback: try old format
      const legacyFrameData = localStorage.getItem('selectedFrame');
      const legacySlotsData = localStorage.getItem('frameSlots');
      
      if (legacyFrameData && legacySlotsData) {
        // Extract frame name from legacy path
        const frameName = legacyFrameData.split('/').pop().replace('.png', '');
        const frameAsset = getFrameAsset(frameName);
        
        if (frameAsset) {
          setSelectedFrame(frameAsset);
          setFrameSlots(JSON.parse(legacySlotsData));
          console.log('✅ Loaded frame (legacy format):', frameName);
          console.log('✅ Frame asset:', frameAsset);
          console.log('✅ Loaded slots (legacy format):', legacySlotsData);
        }
      } else {
        console.log('❌ No frame data found in localStorage (both formats)');
      }
    }
  }, []);

  const tools = [
    { name: 'Filter', icon: '🎨' },
    { name: 'Saturasi', icon: '🌈' }
  ];

  const filterOptions = [
    { name: 'Normal', preview: '#ffffff' },
    { name: 'Sepia', preview: '#deb887' },
    { name: 'Grayscale', preview: '#808080' },
    { name: 'Vintage', preview: '#d2b48c' },
    { name: 'Cool', preview: '#87ceeb' },
    { name: 'Warm', preview: '#ffa07a' }
  ];

  const saturasiOptions = [
    { name: '0%', value: 0 },
    { name: '25%', value: 25 },
    { name: '50%', value: 50 },
    { name: '75%', value: 75 },
    { name: '100%', value: 100 },
    { name: '125%', value: 125 },
    { name: '150%', value: 150 }
  ];
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
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '200px 1fr 200px',
        gap: '20px',
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Tools Panel (Kiri) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          height: '500px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '1.1rem',
            fontWeight: '500',
            color: '#333',
            textAlign: 'center'
          }}>
            Tools
          </h3>
          
          <div style={{
            background: '#E8C4B8',
            borderRadius: '50px',
            padding: '30px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '30px',
            flex: 1,
            justifyContent: 'center'
          }}>
            {/* Tool 1 - Filter */}
            <button
              onClick={() => setSelectedTool('Filter')}
              style={{
                background: selectedTool === 'Filter' ? '#333' : 'transparent',
                border: 'none',
                borderRadius: '12px',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '8px'
              }}
            >
              <img 
                src={filterIcon} 
                alt="Filter" 
                style={{
                  width: '40px',
                  height: '40px',
                  filter: selectedTool === 'Filter' ? 'invert(1)' : 'none'
                }}
              />
            </button>
            
            {/* Tool 2 - Adjust */}
            <button
              onClick={() => setSelectedTool('Saturasi')}
              style={{
                background: selectedTool === 'Saturasi' ? '#333' : 'transparent',
                border: 'none',
                borderRadius: '12px',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '8px'
              }}
            >
              <img 
                src={adjustIcon} 
                alt="Adjust" 
                style={{
                  width: '40px',
                  height: '40px',
                  filter: selectedTool === 'Saturasi' ? 'invert(1)' : 'none'
                }}
              />
            </button>
          </div>
        </div>

        {/* Preview Area (Tengah) */}
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
          
          {/* Photo Preview Container with Frame */}
          <div style={{
            background: '#f0f0f0',
            borderRadius: '20px',
            padding: '30px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px',
            flex: 1
          }}>
            {selectedFrame && frameSlots ? (
              // Show with frame if frame data is available
              <div style={{
                position: 'relative',
                width: '280px',
                height: '420px',
                background: '#ffffff',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #e0e0e0'
              }}>
                {/* Debug info */}
                <div style={{ 
                  position: 'absolute', 
                  top: '-40px', 
                  left: 0, 
                  fontSize: '10px', 
                  color: '#666',
                  background: '#f0f0f0',
                  padding: '4px',
                  borderRadius: '4px',
                  zIndex: 10
                }}>
                  Frame: {selectedFrame ? 'Found' : 'Missing'} | Slots: {frameSlots ? frameSlots.length : 0} | Photos: {photos.length}
                </div>
                
                {/* Background layer */}
                <div style={{ 
                  position: 'absolute', 
                  width: '100%', 
                  height: '100%', 
                  background: '#ffffff',
                  zIndex: 1 
                }} />
                
                {/* Photos in slots */}
                {photos && photos.length > 0 && frameSlots && frameSlots.map((slot, idx) => {
                  const photo = photos[idx];
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${slot.left * 100}%`,
                        top: `${slot.top * 100}%`,
                        width: `${slot.width * 100}%`,
                        height: `${slot.height * 100}%`,
                        background: photo ? 'transparent' : '#f8f8f8',
                        border: photo ? 'none' : '2px dashed #ddd',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: '#999',
                        zIndex: 2
                      }}
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt={`Photo ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            border: 'none'
                          }}
                        />
                      ) : (
                        <span>Empty Slot</span>
                      )}
                    </div>
                  );
                })}
                
                {/* Frame overlay */}
                <img
                  src={selectedFrame}
                  alt="Frame"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    zIndex: 3
                  }}
                  onLoad={() => console.log('✅ Frame image loaded successfully:', selectedFrame)}
                  onError={(e) => console.error('❌ Frame image failed to load:', selectedFrame, e)}
                />
              </div>
            ) : photos && photos.length > 0 ? (
              // Fallback: show photos without frame if frame data is missing
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                alignItems: 'center',
                maxWidth: '300px'
              }}>
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    style={{
                      width: '200px',
                      height: '150px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      background: '#fff'
                    }}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#999',
                fontSize: '1.1rem'
              }}>
                Tidak ada foto yang tersedia.<br />
                Silakan ambil foto terlebih dahulu.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0'
          }}>
            <button style={{
              background: 'white',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '25px 0 0 25px',
              padding: '12px 30px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              borderRight: '0.5px solid #ddd'
            }}>
              Save
            </button>
            <button style={{
              background: 'white',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '0 25px 25px 0',
              padding: '12px 30px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              borderLeft: '0.5px solid #ddd'
            }}>
              Print
            </button>
          </div>
          
          {/* Debug Button */}
          <button 
            onClick={() => {
              console.log('=== DEBUG EDITOR DATA ===');
              console.log('Photos from state:', photos);
              console.log('SelectedFrame from state:', selectedFrame);
              console.log('FrameSlots from state:', frameSlots);
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
            Debug Data
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
        </div>

        {/* Sub-Tools Panel (Kanan) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          height: '500px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '1.1rem',
            fontWeight: '500',
            color: '#333',
            textAlign: 'center'
          }}>
            Sub - Tools
          </h3>
          
          <div style={{
            background: '#E8C4B8',
            borderRadius: '50px',
            padding: '30px 20px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {selectedTool === 'Filter' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'center'
              }}>
                {/* Filter 1 - Dark Brown */}
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#8B4513',
                    cursor: 'pointer',
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                />
                
                {/* Filter 2 - Medium Brown */}
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#D2691E',
                    cursor: 'pointer',
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                />
                
                {/* Filter 3 - Light Brown */}
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#F4A460',
                    cursor: 'pointer',
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                />
                
                {/* Filter 4 - Tan */}
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#CD853F',
                    cursor: 'pointer',
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                />
                
                {/* Filter 5 - Light Tan */}
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#DEB887',
                    cursor: 'pointer',
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                />
              </div>
            )}

            {selectedTool === 'Saturasi' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '60px',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'center'
              }}>
                {/* Slider 1 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div
                    style={{
                      width: '100px',
                      height: '30px',
                      background: '#333',
                      borderRadius: '15px',
                      position: 'relative',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 5px'
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        background: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        left: '10px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        transition: 'left 0.2s ease'
                      }}
                    />
                  </div>
                </div>
                
                {/* Slider 2 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div
                    style={{
                      width: '100px',
                      height: '30px',
                      background: '#333',
                      borderRadius: '15px',
                      position: 'relative',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 5px'
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        background: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        left: '40px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        transition: 'left 0.2s ease'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}