// Frame configuration for Testframe1
export const frameConfig = {
  id: 'Testframe1',
  name: 'Frame 2 Foto',
  maxCaptures: 2,
  description: '2 slot foto vertikal',
  imagePath: '/src/assets/frames/Testframe1.png',
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
};

export default frameConfig;