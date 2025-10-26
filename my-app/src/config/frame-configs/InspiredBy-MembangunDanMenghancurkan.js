// Frame configuration for Inspired By "Membangun & Menghancurkan"
export const frameConfig = {
  id: 'InspiredBy-MembangunDanMenghancurkan',
  name: 'Inspired By Membangun & Menghancurkan',
  maxCaptures: 3,
  description: 'Layout photobooth 3 x 2 terinspirasi Membangun & Menghancurkan.',
  imagePath: '/src/assets/frames/InspiredBy/Membangun & Menghancurkan.png',
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
      top: 0.125,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b',
      left: 0.535,
      top: 0.125,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_2a',
      left: 0.05,
      top: 0.385,
      width: 0.42,
      height: 0.23,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.535,
      top: 0.385,
      width: 0.42,
      height: 0.23,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_3a',
      left: 0.05,
      top: 0.65,
      width: 0.42,
      height: 0.23,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_3b',
      left: 0.535,
      top: 0.65,
      width: 0.42,
      height: 0.23,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    }
  ]
};

export default frameConfig;
