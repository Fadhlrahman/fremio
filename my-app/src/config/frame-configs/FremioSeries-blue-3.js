// Frame configuration for FremioSeries-blue-3
export const frameConfig = {
  id: 'FremioSeries-blue-3',
  name: 'FremioSeries Blue 6 Foto',
  maxCaptures: 3,
  description: '3 foto x 2 = 6 slot photobooth klasik - Blue Frame',
  imagePath: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-blue-3.png',
  duplicatePhotos: true, // Feature baru: duplicate setiap foto
  slots: [
    // Pasangan foto 1
    {
      id: 'slot_1a',
      left: 0.05,     // Kolom kiri
      top: 0.03,     // Baris 1
      width: 0.41,   // Lebar untuk 2 kolom
      height: 0.28,  // Tinggi untuk 3 baris
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0  // Menggunakan foto ke-0
    },
    {
      id: 'slot_1b', 
  left: 0.545,    // Kolom kanan (standard)
      top: 0.03,     // Baris 1 (sama dengan 1a)
      width: 0.41,   // Lebar sama
      height: 0.28,  // Tinggi sama
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 0  // Menggunakan foto ke-0 (duplicate)
    },
    // Pasangan foto 2  
    {
      id: 'slot_2a',
      left: 0.05,     // Kolom kiri
      top: 0.33,     // Baris 2
      width: 0.41,   
      height: 0.28,  
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1  // Menggunakan foto ke-1
    },
    {
      id: 'slot_2b',
  left: 0.545,    // Kolom kanan (standard)
      top: 0.33,     // Baris 2 (sama dengan 2a)
      width: 0.41,   
      height: 0.28,  
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 1  // Menggunakan foto ke-1 (duplicate)
    },
    // Pasangan foto 3
    {
      id: 'slot_3a',
      left: 0.05,     // Kolom kiri
      top: 0.63,     // Baris 3
      width: 0.41,   
      height: 0.28,  
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2  // Menggunakan foto ke-2
    },
    {
      id: 'slot_3b',
  left: 0.545,    // Kolom kanan (standard)
      top: 0.63,     // Baris 3 (sama dengan 3a)
      width: 0.41,   
      height: 0.28,  
      aspectRatio: '4:5',
      zIndex: 2,
      photoIndex: 2  // Menggunakan foto ke-2 (duplicate)
    }
  ],
  layout: {
    aspectRatio: '9:16',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  }
};

export default frameConfig;