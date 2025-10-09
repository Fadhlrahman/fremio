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
        left: 0.25,     // 25% dari kiri - centered
        top: 0.025,      // 8% dari atas - digeser lebih ke atas
        width: 0.5,     // 50% lebar - rasio 4:5 = 0.8, jadi 50% width
        height: 0.4,   // 32% tinggi - untuk rasio 4:5
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_2', 
        left: 0.25,     // 25% dari kiri - centered sama dengan slot 1
        top: 0.44,      // 42% dari atas - digeser lebih ke atas
        width: 0.5,     // 50% lebar - sama dengan slot 1
        height: 0.4,   // 32% tinggi - sama dengan slot 1
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
    name: 'Frame 3 Foto',
    maxCaptures: 3,
    description: '3 slot foto vertikal',
    imagePath: '/src/assets/Testframe2.png',
    slots: [
      {
        id: 'slot_1',
        left: 0.25,     // 25% dari kiri - centered
        top: 0.15,      // 15% dari atas - slot pertama
        width: 0.5,     // 50% lebar - rasio 4:5
        height: 0.22,   // 22% tinggi - untuk 3 slot dengan rasio 4:5
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_2',
        left: 0.25,     // 25% dari kiri - centered sama dengan slot lain
        top: 0.40,      // 40% dari atas - slot kedua
        width: 0.5,     // 50% lebar - sama dengan slot lain
        height: 0.22,   // 22% tinggi - sama dengan slot lain
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_3',
        left: 0.25,     // 25% dari kiri - centered sama dengan slot lain
        top: 0.65,      // 65% dari atas - slot ketiga
        width: 0.5,     // 50% lebar - sama dengan slot lain
        height: 0.22,   // 22% tinggi - sama dengan slot lain
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

  Testframe3: {
    id: 'Testframe3',
    name: 'Frame 4 Foto',
    maxCaptures: 4,
    description: '4 slot foto grid 2x2',
    imagePath: '/src/assets/Testframe3.png',
    slots: [
      {
        id: 'slot_1',
        left: 0.15,     // 15% dari kiri (kiri atas) - margin untuk grid
        top: 0.18,      // 18% dari atas - margin untuk grid
        width: 0.32,    // 32% lebar - untuk rasio 4:5 dalam grid 2x2
        height: 0.28,   // 28% tinggi - untuk rasio 4:5 dalam grid 2x2
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_2',
        left: 0.53,     // 53% dari kiri (kanan atas) - margin seimbang
        top: 0.18,      // 18% dari atas - sama dengan slot 1
        width: 0.32,    // 32% lebar - sama dengan slot lain
        height: 0.28,   // 28% tinggi - sama dengan slot lain
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_3',
        left: 0.15,     // 15% dari kiri (kiri bawah) - sama dengan slot 1
        top: 0.54,      // 54% dari atas - slot bawah
        width: 0.32,    // 32% lebar - sama dengan slot lain
        height: 0.28,   // 28% tinggi - sama dengan slot lain
        aspectRatio: '4:5', // Rasio Instagram portrait
        zIndex: 2
      },
      {
        id: 'slot_4',
        left: 0.53,     // 53% dari kiri (kanan bawah) - sama dengan slot 2
        top: 0.54,      // 54% dari atas - sama dengan slot 3
        width: 0.32,    // 32% lebar - sama dengan slot lain
        height: 0.28,   // 28% tinggi - sama dengan slot lain
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