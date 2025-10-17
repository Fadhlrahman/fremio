// Enhanced test data for FremioSeries frames

import safeStorage from './safeStorage.js';

export function createFremioSeriesTestData() {
  // Create sample base64 photos (small colored rectangles)
  const createSamplePhoto = (color, text, width = 200, height = 150) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill with solid color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Add border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, width, height);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.fillText(text, width/2, height/2 - 10);
    ctx.fillText('Photo', width/2, height/2 + 10);
    
    return canvas.toDataURL('image/png');
  };

  // Create 3 sample photos for FremioSeries-3 (photobooth style)
  const samplePhotos = [
    createSamplePhoto('#ff6b6b', 'Sample 1'), // Red
    createSamplePhoto('#4ecdc4', 'Sample 2'), // Teal
    createSamplePhoto('#45b7d1', 'Sample 3')  // Blue
  ];

  // Store in localStorage
  safeStorage.setJSON('capturedPhotos', samplePhotos);
  
  // Set a FremioSeries frame (Black 3-slot)
  safeStorage.setItem('selectedFrame', 'FremioSeries-black-3');
  
  // Set frame config for FremioSeries-black-3 (3 photos duplicated to 6 slots)
  const frameConfig = {
    id: 'FremioSeries-black-3',
    name: 'FremioSeries Black 6 Foto',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik - Black Frame',
    imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-blue-3.png',
    duplicatePhotos: true,
    slots: [
      {id: 'slot_1a', left: 0.05, top: 0.03, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 0},
      {id: 'slot_1b', left: 0.55, top: 0.03, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 0},
      {id: 'slot_2a', left: 0.05, top: 0.33, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 1},
      {id: 'slot_2b', left: 0.55, top: 0.33, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 1},
      {id: 'slot_3a', left: 0.05, top: 0.63, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 2},
      {id: 'slot_3b', left: 0.55, top: 0.63, width: 0.41, height: 0.28, aspectRatio: '4:5', zIndex: 2, photoIndex: 2}
    ],
    layout: { aspectRatio: '2:3', orientation: 'portrait', backgroundColor: '#ffffff' }
  };
  
  safeStorage.setJSON('frameConfig', frameConfig);
  const slotPhotoMap = {};
  frameConfig.slots.forEach((slot, idx) => {
    const photoIndex = slot.photoIndex !== undefined ? slot.photoIndex : idx;
    slotPhotoMap[idx] = samplePhotos[photoIndex] || null;
  });
  safeStorage.setJSON(`slotPhotos:${frameConfig.id}`, slotPhotoMap);
  
  console.log('✅ FremioSeries test data created:');
  console.log('- 3 sample photos stored in capturedPhotos');
  console.log('- FremioSeries-black-3 selected as frame');
  console.log('- Frame config with 6 slots (3 photos duplicated) stored');
  console.log('- Ready for Editor.jsx to preview!');
  
  return {
    photos: samplePhotos,
    frame: 'FremioSeries-blue-3',
    config: frameConfig
  };
}

export function clearTestData() {
  safeStorage.removeItem('capturedPhotos');
  safeStorage.removeItem('selectedFrame');
  safeStorage.removeItem('frameConfig');
  safeStorage.removeItem('frameSlots'); // legacy

  if (safeStorage.isAvailable() && typeof window !== 'undefined') {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('slotPhotos:')) {
        window.localStorage.removeItem(key);
      }
    });
  }
  
  console.log('🗑️ Test data cleared from localStorage');
}

// Export original function for compatibility
export function createSampleData() {
  return createFremioSeriesTestData();
}