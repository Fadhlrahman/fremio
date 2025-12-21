// Mock premium frames untuk testing (tanpa PostgreSQL)
export const MOCK_PREMIUM_FRAMES = [
  {
    id: "premium-frame-001",
    name: "Golden Birthday",
    description: "Frame ulang tahun premium dengan efek emas",
    category: "birthday",
    imagePath: "/frames/premium/golden-birthday.png",
    isPremium: true,
    isLocked: true,
    price: 10000,
    maxCaptures: 4,
    slots: [], // Locked - harus bayar dulu
    layout: {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#FFD700",
      elements: [],
    },
  },
  {
    id: "premium-frame-002",
    name: "Diamond Wedding",
    description: "Frame pernikahan mewah dengan diamond effect",
    category: "wedding",
    imagePath: "/frames/premium/diamond-wedding.png",
    isPremium: true,
    isLocked: true,
    price: 10000,
    maxCaptures: 6,
    slots: [],
    layout: {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#E8E8E8",
      elements: [],
    },
  },
  {
    id: "premium-frame-003",
    name: "Luxury Graduation",
    description: "Frame wisuda premium dengan gold accents",
    category: "graduation",
    imagePath: "/frames/premium/luxury-graduation.png",
    isPremium: true,
    isLocked: true,
    price: 10000,
    maxCaptures: 4,
    slots: [],
    layout: {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#1a1a2e",
      elements: [],
    },
  },
];

// Mock free frames
export const MOCK_FREE_FRAMES = [
  {
    id: "free-frame-001",
    name: "Simple Birthday",
    description: "Frame ulang tahun gratis",
    category: "birthday",
    imagePath: "/frames/free/simple-birthday.png",
    isPremium: false,
    isLocked: false,
    price: 0,
    maxCaptures: 2,
    slots: [
      { x: 100, y: 100, width: 200, height: 200, type: "photo" },
      { x: 350, y: 100, width: 200, height: 200, type: "photo" },
    ],
    layout: {
      aspectRatio: "9:16",
      orientation: "portrait",
      backgroundColor: "#ffffff",
      elements: [],
    },
  },
  {
    id: "free-frame-002",
    name: "Basic Collage",
    description: "Collage frame gratis",
    category: "collage",
    imagePath: "/frames/free/basic-collage.png",
    isPremium: false,
    isLocked: false,
    price: 0,
    maxCaptures: 4,
    slots: [
      { x: 50, y: 50, width: 150, height: 150, type: "photo" },
      { x: 250, y: 50, width: 150, height: 150, type: "photo" },
      { x: 50, y: 250, width: 150, height: 150, type: "photo" },
      { x: 250, y: 250, width: 150, height: 150, type: "photo" },
    ],
    layout: {
      aspectRatio: "1:1",
      orientation: "square",
      backgroundColor: "#f5f5f5",
      elements: [],
    },
  },
];

// Get all frames (mix of free and premium)
export const getAllMockFrames = () => {
  return [...MOCK_FREE_FRAMES, ...MOCK_PREMIUM_FRAMES];
};

// Check if user has access to frame
export const checkFrameAccess = (frameId, userPurchases = []) => {
  const frame = getAllMockFrames().find((f) => f.id === frameId);
  if (!frame) return false;
  if (!frame.isPremium) return true; // Free frames always accessible

  // Check if user has purchased access
  return userPurchases.includes(frameId);
};

// Unlock frame after payment (mock)
export const unlockFrame = (frameId) => {
  const frame = getAllMockFrames().find((f) => f.id === frameId);
  if (frame && frame.isPremium) {
    return {
      ...frame,
      isLocked: false,
      slots: [
        // Unlock slots after payment
        { x: 100, y: 100, width: 200, height: 200, type: "photo" },
        { x: 350, y: 100, width: 200, height: 200, type: "photo" },
        { x: 100, y: 350, width: 200, height: 200, type: "photo" },
        { x: 350, y: 350, width: 200, height: 200, type: "photo" },
      ],
      layout: {
        ...frame.layout,
        elements: [
          { type: "text", content: "Premium Unlocked!", x: 100, y: 50 },
        ],
      },
    };
  }
  return frame;
};
