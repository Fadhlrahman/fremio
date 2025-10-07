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
        left: 0.1,      // 10% dari kiri
        top: 0.15,      // 15% dari atas
        width: 0.8,     // 80% lebar
        height: 0.35,   // 35% tinggi
        zIndex: 2
      },
      {
        id: 'slot_2', 
        left: 0.1,      // 10% dari kiri
        top: 0.55,      // 55% dari atas
        width: 0.8,     // 80% lebar
        height: 0.35,   // 35% tinggi
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
    name: 'Frame 3 Foto',
    maxCaptures: 3,
    description: '3 slot foto vertikal',
    imagePath: '/src/assets/Testframe2.png',
    slots: [
      {
        id: 'slot_1',
        left: 0.1,      // 10% dari kiri
        top: 0.1,       // 10% dari atas
        width: 0.8,     // 80% lebar
        height: 0.25,   // 25% tinggi
        zIndex: 2
      },
      {
        id: 'slot_2',
        left: 0.1,      // 10% dari kiri
        top: 0.38,      // 38% dari atas
        width: 0.8,     // 80% lebar
        height: 0.25,   // 25% tinggi
        zIndex: 2
      },
      {
        id: 'slot_3',
        left: 0.1,      // 10% dari kiri
        top: 0.66,      // 66% dari atas
        width: 0.8,     // 80% lebar
        height: 0.25,   // 25% tinggi
        zIndex: 2
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
        left: 0.05,     // 5% dari kiri (kiri atas)
        top: 0.1,       // 10% dari atas
        width: 0.4,     // 40% lebar
        height: 0.35,   // 35% tinggi
        zIndex: 2
      },
      {
        id: 'slot_2',
        left: 0.55,     // 55% dari kiri (kanan atas)
        top: 0.1,       // 10% dari atas
        width: 0.4,     // 40% lebar
        height: 0.35,   // 35% tinggi
        zIndex: 2
      },
      {
        id: 'slot_3',
        left: 0.05,     // 5% dari kiri (kiri bawah)
        top: 0.55,      // 55% dari atas
        width: 0.4,     // 40% lebar
        height: 0.35,   // 35% tinggi
        zIndex: 2
      },
      {
        id: 'slot_4',
        left: 0.55,     // 55% dari kiri (kanan bawah)
        top: 0.55,      // 55% dari atas
        width: 0.4,     // 40% lebar
        height: 0.35,   // 35% tinggi
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