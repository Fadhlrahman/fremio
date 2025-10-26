// Frame configuration for Testframe3
export const frameConfig = {
  id: 'Testframe3',
  name: 'Frame 4 Foto',
  maxCaptures: 4,
  description: '4 slot foto grid 2x2',
  imagePath: '/src/assets/frames/Testframe3.png',
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
  aspectRatio: '9:16',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  }
};

export default frameConfig;