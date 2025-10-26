// Frame configuration for Inspired By "7 Des"
export const frameConfig = {
  id: 'InspiredBy-7Des',
  name: 'Inspired By 7 Des',
  maxCaptures: 4,
  description: 'Layout photobooth 4 x 2 (8 slot) terinspirasi lagu 7 Des.',
  imagePath: '/src/assets/frames/InspiredBy/7 Des.png',
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
      top: 0.055,
      width: 0.42,
      height: 0.23,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b',
      left: 0.535,
      top: 0.055,
      width: 0.42,
      height: 0.23,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_2a',
      left: 0.05,
      top: 0.28,
      width: 0.42,
      height: 0.225,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.535,
      top: 0.28,
      width: 0.42,
      height: 0.225,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_3a',
      left: 0.05,
      top: 0.495,
      width: 0.42,
      height: 0.225,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_3b',
      left: 0.535,
      top: 0.495,
      width: 0.42,
      height: 0.225,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_4a',
      left: 0.05,
      top: 0.72,
      width: 0.42,
      height: 0.225,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 3
    },
    {
      id: 'slot_4b',
      left: 0.535,
      top: 0.72,
      width: 0.42,
      height: 0.225,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 3
    }
  ]
};

export default frameConfig;
