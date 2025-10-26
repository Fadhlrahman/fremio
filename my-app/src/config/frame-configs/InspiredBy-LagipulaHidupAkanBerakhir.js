// Frame configuration for Inspired By "Lagipula Hidup Akan Berakhir"
export const frameConfig = {
  id: 'InspiredBy-LagipulaHidupAkanBerakhir',
  name: 'Inspired By Lagipula Hidup Akan Berakhir',
  maxCaptures: 3,
  description: 'Layout photobooth 3 x 2 terinspirasi Lagipula Hidup Akan Berakhir.',
  imagePath: '/src/assets/frames/InspiredBy/Lagipula Hidup Akan Berakhir.png',
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
      top: 0.12,
      width: 0.42,
      height: 0.24,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b',
      left: 0.535,
      top: 0.12,
      width: 0.42,
      height: 0.24,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_2a',
      left: 0.05,
      top: 0.37,
      width: 0.42,
      height: 0.24,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.535,
      top: 0.37,
      width: 0.42,
      height: 0.24,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_3a',
      left: 0.05,
      top: 0.64,
      width: 0.42,
      height: 0.24,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_3b',
      left: 0.535,
      top: 0.64,
      width: 0.42,
      height: 0.24,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    }
  ]
};

export default frameConfig;
