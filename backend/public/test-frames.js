// Test script untuk memastikan frame FremioSeries berfungsi
console.log('🧪 Testing FremioSeries frames...');

// Test 1: Check localStorage data
const frameName = localStorage.getItem('selectedFrame');
const frameConfig = localStorage.getItem('frameConfig');
const capturedPhotos = localStorage.getItem('capturedPhotos');

console.log('📋 Current localStorage data:');
console.log('  - selectedFrame:', frameName);
console.log('  - frameConfig exists:', !!frameConfig);
console.log('  - capturedPhotos exists:', !!capturedPhotos);

if (frameConfig) {
  try {
    const config = JSON.parse(frameConfig);
    console.log('  - frame slots count:', config?.slots?.length);
    console.log('  - frame maxCaptures:', config?.maxCaptures);
    console.log('  - has duplicatePhotos:', config?.duplicatePhotos);
  } catch (e) {
    console.error('  - Error parsing frameConfig:', e);
  }
}

if (capturedPhotos) {
  try {
    const photos = JSON.parse(capturedPhotos);
    console.log('  - photos count:', photos?.length);
  } catch (e) {
    console.error('  - Error parsing capturedPhotos:', e);
  }
}

// Test 2: Simulate setting a FremioSeries frame
console.log('\n🎯 Testing frame selection...');

// Simulate frameProvider behavior
async function testFrameSelection() {
  try {
    // Test dengan FremioSeries-blue-3
    const testFrameName = 'FremioSeries-blue-3';
    console.log(`Testing frame: ${testFrameName}`);
    
    // Simulate frame config (simplified version)
    const testConfig = {
      id: testFrameName,
      name: 'FremioSeries Blue 6 Foto',
      maxCaptures: 3,
      description: '3 foto x 2 = 6 slot photobooth klasik - Blue Frame',
      duplicatePhotos: true,
      slots: [
        {id: 'slot_1a', left: 0.05, top: 0.03, width: 0.41, height: 0.28, photoIndex: 0},
        {id: 'slot_1b', left: 0.55, top: 0.03, width: 0.41, height: 0.28, photoIndex: 0},
        {id: 'slot_2a', left: 0.05, top: 0.33, width: 0.41, height: 0.28, photoIndex: 1},
        {id: 'slot_2b', left: 0.55, top: 0.33, width: 0.41, height: 0.28, photoIndex: 1},
        {id: 'slot_3a', left: 0.05, top: 0.63, width: 0.41, height: 0.28, photoIndex: 2},
        {id: 'slot_3b', left: 0.55, top: 0.63, width: 0.41, height: 0.28, photoIndex: 2}
      ]
    };
    
    // Save to localStorage
    localStorage.setItem('selectedFrame', testFrameName);
    localStorage.setItem('frameConfig', JSON.stringify(testConfig));
    
    console.log('✅ Test frame data saved to localStorage');
    console.log('✅ Ready for Editor.jsx to load!');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testFrameSelection();