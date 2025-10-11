// Frame configurations untuk berbagai jenis photobooth frames
// Setiap frame memiliki informasi slots, maksimal capture, dan layout

export const FRAME_CONFIGS = {
  Testframe1: {
    id: 'Testframe1',
    name: 'Frame 2 Foto',
    maxCaptures: 2,
    description: '2 slot foto vertikal',
    imagePath: '/src/assets/Testframe1.png',
    slots: [
      {
        id: 'slot_1',
        left: 0.3,     // 25% dari kiri - centered
        top: 0.03,      // 8% dari atas - digeser lebih ke atas
        width: 0.405,     // 50% lebar - rasio 4:5 = 0.8, jadi 50% width
        height: 0.385,   // 32% tinggi - untuk rasio 4:5
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_2', 
        left: 0.3,     // 25% dari kiri - centered sama dengan slot 1
        top: 0.44,      // 42% dari atas - digeser lebih ke atas
        width: 0.405,     // 50% lebar - sama dengan slot 1
        height: 0.385,   // 32% tinggi - sama dengan slot 1
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      }
    ],
    layout: {
      aspectRatio: '2:3',
      orientation: 'portrait',
      backgroundColor: '#ffffff'
    }
  },

  Testframe2: {
    id: 'Testframe2',
    name: 'Frame 6 Foto (Photobooth Style)',
    maxCaptures: 3,
    description: '3 foto x 2 = 6 slot photobooth klasik',
    imagePath: '/src/assets/Testframe2.png',
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
        left: 0.55,    // Kolom kanan
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
        left: 0.55,    // Kolom kanan
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
        left: 0.55,    // Kolom kanan  
        top: 0.63,     // Baris 3 (sama dengan 3a)
        width: 0.41,   
        height: 0.28,  
        aspectRatio: '4:5',
        zIndex: 2,
        photoIndex: 2  // Menggunakan foto ke-2 (duplicate)
      }
    ],
    layout: {
      aspectRatio: '2:3',
      orientation: 'portrait',
      backgroundColor: '#ffffff'
    }
  },

  Testframe3: {
    id: 'Testframe3',
    name: 'Frame 4 Foto',
    maxCaptures: 4,
    description: '4 slot foto grid 2x2',
    imagePath: '/src/assets/Testframe3.png',
    slots: [
      {
        id: 'slot_1',
        left: 0.3,     // 15% dari kiri (kiri atas) - margin untuk grid
        top: 0.03,      // 18% dari atas - margin untuk grid
        width: 0.4,    // 32% lebar - untuk rasio 4:5 dalam grid 2x2
        height: 0.2,   // 28% tinggi - untuk rasio 4:5 dalam grid 2x2
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_2',
        left: 0.3,     // 53% dari kiri (kanan atas) - margin seimbang
        top: 0.25,      // 18% dari atas - sama dengan slot 1
        width: 0.4,    // 32% lebar - sama dengan slot lain
        height: 0.2,   // 28% tinggi - sama dengan slot lain
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_3',
        left: 0.3,     // 15% dari kiri (kiri bawah) - sama dengan slot 1
        top: 0.46,      // 54% dari atas - slot bawah
        width: 0.4,    // 32% lebar - sama dengan slot lain
        height: 0.2,   // 28% tinggi - sama dengan slot lain
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_4',
        left: 0.3,     // 53% dari kiri (kanan bawah) - sama dengan slot 2
        top: 0.68,      // 54% dari atas - sama dengan slot 3
        width: 0.4,    // 32% lebar - sama dengan slot lain
        height: 0.2,   // 28% tinggi - sama dengan slot lain
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      }
    ],
    layout: {
      aspectRatio: '2:3',
      orientation: 'portrait',
      backgroundColor: '#ffffff'
    }
  }
};

// Helper function untuk mendapatkan konfigurasi frame berdasarkan nama
export const getFrameConfig = (frameName) => {
  return FRAME_CONFIGS[frameName] || null;
};

// Helper function untuk mendapatkan semua frame yang tersedia
export const getAllFrames = () => {
  return Object.values(FRAME_CONFIGS);
};

// Helper function untuk validasi frame
export const isValidFrame = (frameName) => {
  return frameName && FRAME_CONFIGS.hasOwnProperty(frameName);
};