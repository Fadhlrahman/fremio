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
            createFremioSeriesTestData();
            window.location.reload();
          }}
          style={{
            padding: '5px 10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Test FremioSeries
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
        <div style={{ display: 'flex', gap: '8px' }}>
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
                const src = photos[photoIndex];
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
                      background: '#ddd'
                    }}
                  >
                    <img
                      src={src}
                      alt={`Photo ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
        {/* End of Preview section and actions */}
      </div>
    </div>
  );
}