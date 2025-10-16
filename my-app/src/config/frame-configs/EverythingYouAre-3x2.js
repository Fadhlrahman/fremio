// Frame configuration for EverythingYouAre-3x2
export const frameConfig = {
  id: 'EverythingYouAre-3x2',
  name: 'Everything You Are 6 Foto',
  maxCaptures: 3,
  description: '3 foto x 2 = 6 slot photobooth klasik - Everything You Are Frame',
  imagePath: '/src/assets/frames/Everything You Are.png',
  duplicatePhotos: true,
  slots: [
    {
      id: 'slot_1a',
      left: 0.005,
      top: 0.056,
      width: 0.5,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b',
      left: 0.51,
      top: 0.056,
      width: 0.475,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_2a',
      left: 0.015,
      top: 0.35,
      width: 0.475,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.51,
      top: 0.35,
      width: 0.475,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_3a',
      left: 0.015,
      top: 0.64,
      width: 0.475,
      height: 0.22,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_3b',
      left: 0.51,
      top: 0.64,
      width: 0.475,
      height: 0.22,
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
