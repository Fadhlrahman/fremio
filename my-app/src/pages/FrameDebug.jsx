import React, { useState, useEffect } from 'react';
import { getFrameConfig } from '../config/frameConfigs.js';
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

export default function FrameDebug() {
  const [selectedFrame, setSelectedFrame] = useState('FremioSeries-blue-2');
  const [frameConfig, setFrameConfig] = useState(null);
  const [frameImage, setFrameImage] = useState(null);

  // Frame image mapping
  const getFrameImage = (frameName) => {
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
      'FremioSeries-blue-4': FremioSeriesBlue4
    };
    return frameMap[frameName] || null;
  };  // Calculate slot dimensions in pixels
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

  useEffect(() => {
    const config = getFrameConfig(selectedFrame);
    if (config) {
      setFrameConfig(config);
      setFrameImage(getFrameImage(selectedFrame));
    }
  }, [selectedFrame]);

  return (
    <div style={{ padding: '2rem', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1>Frame Debug Tool</h1>
      
      {/* Frame Selector */}
      <div style={{ marginBottom: '2rem' }}>
        <label>Select Frame: </label>
        <select 
          value={selectedFrame} 
          onChange={(e) => setSelectedFrame(e.target.value)}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        >
          <option value="FremioSeries-blue-2">FremioSeries Blue 2 (4 slots)</option>
          <option value="FremioSeries-babyblue-3">FremioSeries Baby Blue 3 (6 slots)</option>
          <option value="FremioSeries-black-3">FremioSeries Black 3 (6 slots)</option>
          <option value="FremioSeries-blue-3">FremioSeries Blue 3 (6 slots)</option>
          <option value="FremioSeries-cream-3">FremioSeries Cream 3 (6 slots)</option>
          <option value="FremioSeries-green-3">FremioSeries Green 3 (6 slots)</option>
          <option value="FremioSeries-maroon-3">FremioSeries Maroon 3 (6 slots)</option>
          <option value="FremioSeries-orange-3">FremioSeries Orange 3 (6 slots)</option>
          <option value="FremioSeries-pink-3">FremioSeries Pink 3 (6 slots)</option>
          <option value="FremioSeries-purple-3">FremioSeries Purple 3 (6 slots)</option>
          <option value="FremioSeries-white-3">FremioSeries White 3 (6 slots)</option>
          <option value="FremioSeries-blue-4">FremioSeries Blue 4 (8 slots)</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Frame Preview with Slot Overlay */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '10px' }}>
          <h3>Frame with Slot Overlay</h3>
          {frameConfig && frameImage && (
            <div style={{
              position: 'relative',
              width: '350px',
              height: '525px',
              margin: '0 auto',
              border: '1px solid #ddd'
            }}>
              {/* Frame Image */}
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
              />
              
              {/* Slot Overlays */}
              {frameConfig.slots.map((slot, index) => {
                const pixels = calculateSlotPixels(frameConfig, index);
                return (
                  <div
                    key={slot.id}
                    style={{
                      position: 'absolute',
                      left: `${slot.left * 100}%`,
                      top: `${slot.top * 100}%`,
                      width: `${slot.width * 100}%`,
                      height: `${slot.height * 100}%`,
                      border: '2px dashed #ff0000',
                      background: 'rgba(255, 0, 0, 0.1)',
                      zIndex: 5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#ff0000'
                    }}
                  >
                    {slot.id}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Slot Data Table */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '10px' }}>
          <h3>Slot Metadata Debug</h3>
          {frameConfig && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Frame:</strong> {frameConfig.name}<br/>
                <strong>Max Captures:</strong> {frameConfig.maxCaptures}<br/>
                <strong>Layout Ratio:</strong> {frameConfig.layout.aspectRatio}
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Slot ID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Percentage</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Pixels</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Aspect Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {frameConfig.slots.map((slot, index) => {
                    const pixels = calculateSlotPixels(frameConfig, index);
                    return (
                      <tr key={slot.id}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{slot.id}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          L: {(slot.left * 100).toFixed(1)}%<br/>
                          T: {(slot.top * 100).toFixed(1)}%<br/>
                          W: {(slot.width * 100).toFixed(1)}%<br/>
                          H: {(slot.height * 100).toFixed(1)}%
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          L: {pixels.left}px<br/>
                          T: {pixels.top}px<br/>
                          W: {pixels.width}px<br/>
                          H: {pixels.height}px
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          Expected: {slot.aspectRatio}<br/>
                          Actual: {pixels.calculatedRatio.toFixed(2)}<br/>
                          {slot.aspectRatio === '4:5' && Math.abs(pixels.calculatedRatio - 0.8) > 0.01 && 
                            <span style={{ color: 'red' }}>⚠️ Mismatch!</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '10px', marginTop: '2rem' }}>
        <h3>Recommendations</h3>
        <ul>
          <li>Red dashed boxes show where photos should be placed</li>
          <li>Check if red boxes align with the visual frame slots</li>
          <li>Aspect ratio should be 0.80 for 4:5 ratio slots</li>
          <li>If boxes don't align, adjust coordinates in frameConfigs.js</li>
        </ul>
      </div>
    </div>
  );
}