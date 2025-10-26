// Frame configuration for Inspired By "PS. I LOVE YOU"
export const frameConfig = {
  id: 'InspiredBy-PSILOVEYOU',
  name: 'Inspired By PS. I LOVE YOU',
  maxCaptures: 3,
  description: 'Layout photobooth 3 x 2 terinspirasi PS. I LOVE YOU.',
  imagePath: '/src/assets/frames/InspiredBy/PS. I LOVE YOU.png',
  duplicatePhotos: true,
  layout: {
    aspectRatio: '9:16',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  },
  slots: [
    {
      id: 'slot_1a',
      left: 0.07,
      top: 0.085,
      width: 0.4,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b',
      left: 0.56,
      top: 0.085,
      width: 0.4,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_2a',
      left: 0.05,
      top: 0.32,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.54,
      top: 0.32,
      width: 0.42,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_3a',
      left: 0.07,
      top: 0.55,
      width: 0.4,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_3b',
      left: 0.56,
      top: 0.55,
      width: 0.4,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    }
  ]
};

export default frameConfig;
