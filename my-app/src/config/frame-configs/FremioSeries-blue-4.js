// Frame configuration for FremioSeries-blue-4
export const frameConfig = {
  id: 'FremioSeries-blue-4',
  name: 'FremioSeries Blue 4 Foto',
  maxCaptures: 4,
  description: '4 slot foto grid 2x2 - Blue Frame',
  imagePath: '/src/assets/frames/FremioSeries/FremioSeries-4/FremioSeries-blue-4.png',
  duplicatePhotos: true,
  slots: [
    {
      id: 'slot_1a',
      left: 0.05,     // Kolom kiri atas
      top: 0.03,      // Baris 1
      width: 0.41,
      height: 0.2,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b',
      left: 0.545,    // Kolom kanan atas
      top: 0.03,
      width: 0.41,
      height: 0.2,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_2a',
      left: 0.05,     // Kolom kiri baris 2
      top: 0.24,
      width: 0.41,
      height: 0.21,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.545,    // Kolom kanan baris 2
      top: 0.24,
      width: 0.41,
      height: 0.21,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_3a',
      left: 0.05,     // Kolom kiri baris 3
      top: 0.455,
      width: 0.41,
      height: 0.21,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_3b',
      left: 0.545,    // Kolom kanan baris 3
      top: 0.455,
      width: 0.41,
      height: 0.21,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2
    },
    {
      id: 'slot_4a',
      left: 0.05,     // Kolom kiri baris 4
      top: 0.675,
      width: 0.41,
      height: 0.21,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 3
    },
    {
      id: 'slot_4b',
      left: 0.545,    // Kolom kanan baris 4
      top: 0.675,
      width: 0.41,
      height: 0.21,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 3
    }
  ],
  layout: {
    aspectRatio: '2:3',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  }
};

export default frameConfig;