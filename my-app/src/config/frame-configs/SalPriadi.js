// Frame configuration for Sal Priadi special frame
export const frameConfig = {
  id: 'SalPriadi',
  name: 'Sal Priadi 6 Foto',
  maxCaptures: 3,
  description: 'Layout photobooth 3 x 2 dengan nuansa Sal Priadi.',
  imagePath: '/src/assets/frames/InspiredBy/Sal Priadi.png',
  duplicatePhotos: true,
  layout: {
    aspectRatio: '9:16',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  },
  slots: [
    {
      id: 'slot_1a',
      left: 0.05,
      top: 0.105,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b',
      left: 0.535,
      top: 0.105,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_2a',
      left: 0.05,
      top: 0.35,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.535,
      top: 0.35,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_3a',
      left: 0.05,
      top: 0.595,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_3b',
      left: 0.535,
      top: 0.595,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    }
  ],
  layout: {
    aspectRatio: '9:16',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  }
};

export default frameConfig;
