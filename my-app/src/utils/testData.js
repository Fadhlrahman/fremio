// Test data for development - creates sample photos and frame selection

import FremioSeriesBlue2Config from '../config/frame-configs/FremioSeries-blue-2.js';

export function createSampleData() {
  // Create sample base64 photos (small colored rectangles)
  const createSamplePhoto = (color, width = 200, height = 150) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill with solid color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Add some text
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sample Photo', width/2, height/2);
    
    return canvas.toDataURL('image/png');
  };

  // Create 3 sample photos
  const samplePhotos = [
    createSamplePhoto('#ff6b6b'), // Red
    createSamplePhoto('#4ecdc4'), // Teal
    createSamplePhoto('#45b7d1')  // Blue
  ];

  // Store in localStorage
  localStorage.setItem('capturedPhotos', JSON.stringify(samplePhotos));
  
  // Set a sample frame (FremioSeries-blue-2)
  localStorage.setItem('selectedFrame', 'FremioSeries-blue-2');
  
  // Persist frame config for FremioSeries-blue-2
  const frameConfig = {
    ...FremioSeriesBlue2Config,
    id: 'FremioSeries-blue-2'
  };
  
  localStorage.setItem('frameConfig', JSON.stringify(frameConfig));
  
  console.log('✅ Sample data created:');
  console.log('- 3 sample photos stored in capturedPhotos');
  console.log('- FremioSeries-blue-2 selected as frame');
  console.log('- Frame config with duplicated slots stored');
  
  return {
    photos: samplePhotos,
  frame: 'FremioSeries-blue-2',
    config: frameConfig
  };
}

export function clearTestData() {
  localStorage.removeItem('capturedPhotos');
  localStorage.removeItem('selectedFrame');
  localStorage.removeItem('frameConfig');
  localStorage.removeItem('frameSlots'); // legacy
  
  console.log('🗑️ Test data cleared from localStorage');
}