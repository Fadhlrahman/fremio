// Frame configuration for FremioSeries-babyblue-3
export const frameConfig = {
  id: 'FremioSeries-babyblue-3',
  name: 'FremioSeries Baby Blue 6 Foto',
  maxCaptures: 3,
  description: '3 foto x 2 = 6 slot photobooth klasik - Baby Blue Frame',
  imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-babyblue-3.png',
  duplicatePhotos: true,
  slots: [
    // Pasangan foto 1
    {
      id: 'slot_1a',
      left: 0.05,
      top: 0.03,
      width: 0.41,
      height: 0.28,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b', 
      left: 0.55,
      top: 0.03,
      width: 0.41,
      height: 0.28,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    // Pasangan foto 2  
    {
      id: 'slot_2a',
      left: 0.05,
      top: 0.33,
      width: 0.41,   
      height: 0.28,  
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.55,
      top: 0.33,
      width: 0.41,   
      height: 0.28,  
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    // Pasangan foto 3
    {
      id: 'slot_3a',
      left: 0.05,
      top: 0.63,
      width: 0.41,   
      height: 0.28,  
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_3b',
      left: 0.55,
      top: 0.63,
      width: 0.41,   
      height: 0.28,  
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    }
  ],
  layout: {
    aspectRatio: '2:3',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  }
};

export default frameConfig;