import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadFrameConfig } from '../utils/frameConfigLoader';
import FramePreview from '../components/FramePreview';

export default function EditPhoto() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [frameConfig, setFrameConfig] = useState(null);
  const [activeToggle, setActiveToggle] = useState('filter');

  // Load photos and frame config on mount
  useEffect(() => {
    // Load photos from localStorage
    const savedPhotos = localStorage.getItem('capturedPhotos');
    if (savedPhotos) {
      try {
        setPhotos(JSON.parse(savedPhotos));
      } catch (e) {
        setPhotos([]);
      }
    }
    // Load selected frame config
    const selectedFrameId = localStorage.getItem('selectedFrame') || 'blue-vertical-3slot';
    loadFrameConfig(selectedFrameId).then(cfg => setFrameConfig(cfg));
  }, []);

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
          }}>Toggle Tools</h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
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
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🎨</span> Filter
            </button>
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
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>⚙️</span> Adjust
            </button>
          </div>
        </div>
        {/* Center Panel - Preview */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '500px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%)',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: '2rem'
        }}>
          <h3 style={{
            marginBottom: '2rem',
            fontSize: '1.4rem',
            fontWeight: '600',
            color: '#333'
          }}>Preview</h3>
          {frameConfig ? (
            <FramePreview photos={photos} frameConfig={frameConfig} />
          ) : (
            <div style={{ textAlign: 'center', color: '#666' }}>Frame config not loaded</div>
          )}
          {/* Save & Print Buttons */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            marginTop: '2rem'
          }}>
            <button style={{
              border: '2px solid #E8A889',
              color: '#E8A889',
              borderRadius: '50px',
              padding: '0.5rem 2rem',
              fontWeight: '600',
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>Save</button>
            <button style={{
              background: '#E8A889',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              padding: '0.5rem 2rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>Print</button>
          </div>
        </div>
        {/* Right Panel - Filter/Adjust */}
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
          }}>{activeToggle === 'filter' ? 'Filter' : 'Adjustment'}</h3>
          {activeToggle === 'filter' ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              textAlign: 'center',
              color: '#666'
            }}>
              <div style={{ padding: '2rem' }}>Filter options will be displayed here</div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              textAlign: 'center',
              color: '#666'
            }}>
              <div style={{ padding: '2rem' }}>Adjustment controls will be displayed here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}