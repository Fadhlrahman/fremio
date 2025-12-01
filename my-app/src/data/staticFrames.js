// Static fallback frames data - updated 2025-12-02
// This provides instant loading while fresh data loads in background

export const STATIC_FRAMES = [
  {
    id: "7f5fe81b-4342-4049-ae6c-18e7b926cca8",
    name: "Cherish Pink Elegance",
    category: "Fremio Series",
    image_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764335547744_Cherish_Pink_Elegance.png",
    thumbnail_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764335547744_Cherish_Pink_Elegance.png"
  },
  {
    id: "d3254c20-0d9b-4dc2-91ee-ea9a96fdb6f7",
    name: "Blue Picnic Vibes",
    category: "Fremio Series",
    image_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764335173018_Blue_Picnic_Vibes.png",
    thumbnail_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764335173018_Blue_Picnic_Vibes.png"
  },
  {
    id: "02097dcc-5d75-468b-8d18-f11cc657b14b",
    name: "Our Love Memory",
    category: "Fremio Series",
    image_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764334019709_Our_Love_Memory.png",
    thumbnail_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764334019709_Our_Love_Memory.png"
  },
  {
    id: "3f9bbc23-bc3a-43a2-805f-d81146096a50",
    name: "YIPIE",
    category: "Fremio Series",
    image_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764333750555_YIPIE.png",
    thumbnail_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764333750555_YIPIE.png"
  },
  {
    id: "b33cf2aa-6ee8-4a85-b1a4-880cdc2c6a9a",
    name: "Snap Your Joy",
    category: "Fremio Series",
    image_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764333576320_Snap_Your_Joy.png",
    thumbnail_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764333576320_Snap_Your_Joy.png"
  },
  {
    id: "8a9875dd-5960-4bec-9475-1071a5eb8af4",
    name: "Pixel Fun Adventure",
    category: "Fremio Series",
    image_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764245117632_Pixel_Fun_Adventure.png",
    thumbnail_url: "https://hzhthvlsussqbwuhkfsh.supabase.co/storage/v1/object/public/frames/custom/1764245117632_Pixel_Fun_Adventure.png"
  }
];

// Default slots for 4-photo frame (standard layout)
// Values are in decimal (0-1) representing percentage of frame dimensions
// These get multiplied by frame width/height (1080x1920) in getCustomFrameConfig
const DEFAULT_SLOTS = [
  { id: 'slot_1', left: 0.05, top: 0.05, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 0, aspectRatio: '4:5' },
  { id: 'slot_2', left: 0.53, top: 0.05, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 1, aspectRatio: '4:5' },
  { id: 'slot_3', left: 0.05, top: 0.28, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 2, aspectRatio: '4:5' },
  { id: 'slot_4', left: 0.53, top: 0.28, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 3, aspectRatio: '4:5' }
];

// Process static frames to match expected format
export const getStaticFrames = () => {
  return STATIC_FRAMES.map(frame => ({
    ...frame,
    imagePath: frame.image_url || frame.thumbnail_url,
    thumbnailUrl: frame.thumbnail_url || frame.image_url,
    maxCaptures: frame.max_captures || 4,
    slots: frame.slots && frame.slots.length > 0 ? frame.slots : DEFAULT_SLOTS,
    isStatic: true // Mark as static for debugging
  }));
};
