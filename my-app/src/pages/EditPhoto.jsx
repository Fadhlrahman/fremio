import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import frameProvider from '../utils/frameProvider.js';

export default function EditPhoto() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [activeToggle, setActiveToggle] = useState('filter'); // 'filter' or 'adjust'
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  // Load photos from localStorage when component mounts
  useEffect(() => {
    const savedPhotos = localStorage.getItem('capturedPhotos');
    if (savedPhotos) {
      try {
        const parsedPhotos = JSON.parse(savedPhotos);
        setPhotos(parsedPhotos);
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    }
  }, []);

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
              <span style={{ fontSize: '1.5rem' }}>🎨</span>
              Filter
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
          
          {/* Photo Display Area */}
          <div style={{
            background: '#f8f9fa',
            borderRadius: '15px',
            padding: '2rem',
            marginBottom: '2rem',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {photos.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                maxWidth: '500px'
              }}>
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    style={{
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: selectedPhoto === index ? '3px solid #E8A889' : '2px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setSelectedPhoto(index)}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                color: '#666',
                fontSize: '1.1rem'
              }}>
                No photos available for editing
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
            {activeToggle === 'filter' ? 'Filter or Adjust' : 'Adjust Settings'}
          </h3>
          
          {activeToggle === 'filter' ? (
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
                Filter options will be displayed here
              </div>
              {/* TODO: Add filter options */}
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