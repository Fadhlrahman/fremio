// Test scenarios untuk sistem frame dinamis
console.log('🧪 Testing Frame System...');

// Test 1: Frame Configuration Loading
console.log('\n📋 Test 1: Frame Configuration Loading');
import { FRAME_CONFIGS, getFrameConfig, isValidFrame, getAllFrameNames } from './src/config/frameConfigs.js';

const frameNames = getAllFrameNames();
console.log('Available frames:', frameNames);

frameNames.forEach(frameName => {
  const config = getFrameConfig(frameName);
  console.log(`${frameName}:`, {
    maxCaptures: config.maxCaptures,
    slotsCount: config.slots.length,
    valid: isValidFrame(frameName)
  });
});

// Test 2: Frame Provider Functionality  
console.log('\n🔧 Test 2: Frame Provider Functionality');
import { FrameDataProvider } from './src/utils/frameProvider.js';

const provider = new FrameDataProvider();

// Test setting different frames
frameNames.forEach(frameName => {
  console.log(`\n--- Testing ${frameName} ---`);
  
  const setSuccess = provider.setFrame(frameName);
  console.log('Set frame result:', setSuccess);
  
  if (setSuccess) {
    const maxCaptures = provider.getMaxCaptures();
    const slots = provider.getSlots();
    console.log('Max captures:', maxCaptures);
    console.log('Slots count:', slots.length);
    
    // Test empty slot creation
    const emptySlots = provider.createEmptySlotPhotos();
    console.log('Empty slots created:', emptySlots.length, 'all null:', emptySlots.every(s => s === null));
    
    // Test canCaptureMore
    console.log('Can capture more (empty):', provider.canCaptureMore(emptySlots));
    
    // Simulate filling slots
    const filledSlots = [...emptySlots];
    for (let i = 0; i < maxCaptures; i++) {
      filledSlots[i] = `fake-photo-${i}`;
      console.log(`After ${i + 1} photos - Can capture more:`, provider.canCaptureMore(filledSlots));
    }
  }
});

// Test 3: localStorage compatibility
console.log('\n💾 Test 3: localStorage compatibility');

// Simulate legacy format
const legacyData = {
  selectedFrame: '/src/assets/Testframe1.png',
  frameSlots: JSON.stringify([
    { left: 0.1, top: 0.1, width: 0.8, height: 0.25 },
    { left: 0.1, top: 0.4, width: 0.8, height: 0.25 }
  ])
};

// Simulate new format
const newData = {
  selectedFrame: 'Testframe2',
  frameConfig: JSON.stringify(getFrameConfig('Testframe2'))
};

console.log('Legacy format test data:', legacyData);
console.log('New format test data:', newData);

console.log('\n✅ All tests completed!');