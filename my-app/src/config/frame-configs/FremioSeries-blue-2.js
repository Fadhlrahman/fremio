// Frame configuration for FremioSeries-blue-2
export const frameConfig = {
  id: 'FremioSeries-blue-2',
  name: 'FremioSeries Blue 2 Foto',
  maxCaptures: 2,
  description: '2 slot foto vertikal - Blue Frame',
  imagePath: '/src/assets/frames/FremioSeries/FremioSeries-2/FremioSeries-blue-2.png',
  duplicatePhotos: true,
  slots: [
    {
      id: 'slot_1a',
      left: 0.05,     // Kolom kiri
      top: 0.03,      // Baris 1
      width: 0.44,    // Lebar proporsional untuk 2 kolom
      height: 0.41,    // Rasio 4:5 dalam orientasi portrait
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_1b', 
      left: 0.52,    // Kolom kanan
      top: 0.03,      // Baris 1 (sama seperti 1a)
      width: 0.44,
      height: 0.41,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0
    },
    {
      id: 'slot_2a',
      left: 0.05,     // Kolom kiri
      top: 0.44,      // Baris 2
      width: 0.44,
      height: 0.41,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    },
    {
      id: 'slot_2b',
      left: 0.52,    // Kolom kanan
      top: 0.44,      // Baris 2 (sama seperti 2a)
      width: 0.44,
      height: 0.41,
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1
    }
  ],
  layout: {
    aspectRatio: '2:3',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  }
};

export default frameConfig;