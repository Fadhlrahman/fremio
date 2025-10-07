// Test data for development - creates sample photos and frame selection

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
  
  // Set a sample frame (Testframe1)
  localStorage.setItem('selectedFrame', 'Testframe1');
  
  // Set frame config for Testframe1
  const frameConfig = {
    id: 'Testframe1',
    name: 'Frame 2 Foto',
    maxCaptures: 2,
    description: '2 slot foto vertikal',
    slots: [
      {
        id: 'slot_1',
        left: 0.1,      // 10% dari kiri
        top: 0.15,      // 15% dari atas  
        width: 0.8,     // 80% lebar
        height: 0.35,   // 35% tinggi
        zIndex: 2
      },
      {
        id: 'slot_2', 
        left: 0.1,      // 10% dari kiri
        top: 0.55,      // 55% dari atas
        width: 0.8,     // 80% lebar
        height: 0.35,   // 35% tinggi
        zIndex: 2
      }
    ]
  };
  
  localStorage.setItem('frameConfig', JSON.stringify(frameConfig));
  
  console.log('✅ Sample data created:');
  console.log('- 3 sample photos stored in capturedPhotos');
  console.log('- Testframe1 selected as frame');
  console.log('- Frame config with 2 slots stored');
  
  return {
    photos: samplePhotos,
    frame: 'Testframe1',
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