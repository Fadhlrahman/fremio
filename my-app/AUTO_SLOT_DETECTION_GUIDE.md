# 🎯 Automatic Slot Detection - User Guide

## 🌟 Fitur Baru: Auto-Detect Slot dari PNG

Sistem sekarang **otomatis mendeteksi** area transparan di PNG frame dan membuat slot foto secara otomatis!

---

## 🚀 Cara Kerja

### **Step 1: Upload PNG Frame**

```
Admin Panel → Upload Frame → Choose PNG File
```

### **Step 2: Auto-Detection**

Sistem otomatis:

- ✅ Scan area transparan di PNG
- ✅ Identifikasi rectangular regions
- ✅ Generate slot configurations
- ✅ Set posisi, ukuran, aspect ratio

### **Step 3: Review & Edit**

- ✅ Lihat slot yang terdeteksi
- ✅ Edit posisi jika perlu
- ✅ Tambah/hapus slot manual
- ✅ Upload frame

---

## 📐 Detection Algorithm

### **Transparent Area Detection**

```javascript
1. Load PNG image
2. Scan all pixels (RGBA)
3. Find pixels with alpha < 50
4. Group connected transparent pixels
5. Create bounding rectangles
6. Merge nearby rectangles
7. Sort by position (top→bottom, left→right)
8. Generate slot configs
```

### **Parameters**

```javascript
{
  minWidth: 80px,        // Minimum slot width
  minHeight: 100px,      // Minimum slot height
  alphaThreshold: 50,    // Transparency threshold (0-255)
  mergeTolerance: 15px,  // Distance to merge rectangles
  maxSlots: 8            // Maximum slots to detect
}
```

---

## 🎨 Frame Design Guidelines

### **Untuk Auto-Detection Optimal**

#### ✅ **DO's**

1. **Clear Transparent Areas**

   - Alpha channel = 0 (fully transparent)
   - Rectangular shapes
   - Well-defined boundaries

2. **Consistent Spacing**

   - Minimum 10px between slots
   - Clear separation

3. **Standard Sizes**

   - Slot width: 80-400px
   - Slot height: 100-500px
   - Aspect ratio: 4:5 or 3:4

4. **Clean Edges**
   - No anti-aliasing on slot edges
   - Sharp transparent boundaries

#### ❌ **DON'Ts**

1. **Complex Shapes**

   - Circular slots (akan jadi rectangular)
   - Irregular shapes
   - Curved edges

2. **Partial Transparency**

   - Semi-transparent areas (alpha 50-200)
   - Gradient transparency
   - Feathered edges

3. **Tiny Slots**

   - Width < 80px
   - Height < 100px

4. **Too Many Slots**
   - Maximum 8 slots recommended
   - Performance issues dengan >10 slots

---

## 🖼️ Sample Frame Structures

### **3-Slot Vertical (Most Common)**

```
┌──────────────────────┐
│  ████████████████   │
│  ┌──────────────┐   │  ← Slot 1 (top)
│  │  TRANSPARENT │   │
│  └──────────────┘   │
│  ████████████████   │
│  ┌──────────────┐   │  ← Slot 2 (middle)
│  │  TRANSPARENT │   │
│  └──────────────┘   │
│  ████████████████   │
│  ┌──────────────┐   │  ← Slot 3 (bottom)
│  │  TRANSPARENT │   │
│  └──────────────┘   │
│  ████████████████   │
└──────────────────────┘
```

### **4-Slot Grid**

```
┌──────────────────────┐
│  ████████████████   │
│  ┌──────┐  ┌──────┐ │  ← Slot 1, 2
│  │ TR 1 │  │ TR 2 │ │
│  └──────┘  └──────┘ │
│  ████████████████   │
│  ┌──────┐  ┌──────┐ │  ← Slot 3, 4
│  │ TR 3 │  │ TR 4 │ │
│  └──────┘  └──────┘ │
│  ████████████████   │
└──────────────────────┘
```

### **6-Slot Mixed**

```
┌──────────────────────┐
│  ┌──────────────────┐│  ← Slot 1 (large top)
│  │   TRANSPARENT    ││
│  └──────────────────┘│
│  ┌──────┐  ┌──────┐ │  ← Slot 2, 3
│  │ TR 2 │  │ TR 3 │ │
│  └──────┘  └──────┘ │
│  ┌──────┐  ┌──────┐ │  ← Slot 4, 5
│  │ TR 4 │  │ TR 5 │ │
│  └──────┘  └──────┘ │
│  ┌──────────────────┐│  ← Slot 6 (large bottom)
│  │   TRANSPARENT    ││
│  └──────────────────┘│
└──────────────────────┘
```

---

## 🔧 Manual Adjustments

### **After Auto-Detection**

#### **Re-detect Slots**

```
Klik "Re-detect Slots" untuk scan ulang
```

- Jika hasil tidak sesuai
- Setelah edit PNG
- Testing different settings

#### **Manual Edit**

```
Edit setiap slot:
- Left (X): 0-100%
- Top (Y): 0-100%
- Width: 0-100%
- Height: 0-100%
- Aspect Ratio: 1:1, 3:4, 4:5, 16:9
```

#### **Add/Remove Slots**

```
- "Tambah Manual": Tambah slot baru
- "Hapus": Hapus slot tertentu
```

---

## 📊 Detection Results

### **Success Indicators**

```
✅ 3 slots detected
✅ Positions valid (0-1 range)
✅ Sizes appropriate (>5% of frame)
✅ Aspect ratios calculated
✅ Auto-sorted by position
```

### **Warning Indicators**

```
⚠️ 0 slots detected
→ No transparent areas found
→ Areas too small (<80x100px)
→ Transparency not clear (alpha > 50)
```

### **Error Handling**

```
❌ Detection failed
→ Invalid PNG format
→ Image too large
→ Browser compatibility issue
→ Use manual slot addition
```

---

## 🧪 Testing

### **Test Frame 1: Simple 3-Slot**

```javascript
// Generate test frame
const canvas = document.createElement("canvas");
canvas.width = 500;
canvas.height = 888;
const ctx = canvas.getContext("2d");

// Background (white with border)
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, 500, 888);
ctx.strokeStyle = "#ff0000";
ctx.lineWidth = 10;
ctx.strokeRect(0, 0, 500, 888);

// Transparent slots
ctx.clearRect(100, 150, 300, 200); // Slot 1
ctx.clearRect(100, 400, 300, 200); // Slot 2
ctx.clearRect(100, 650, 300, 200); // Slot 3

// Download
const link = document.createElement("a");
link.download = "test-frame-3-slots.png";
link.href = canvas.toDataURL("image/png");
link.click();
```

### **Validate Detection**

```javascript
import { quickDetectSlots } from "../utils/slotDetector";

const slots = await quickDetectSlots(frameImageDataURL);
console.log("Detected slots:", slots.length);
slots.forEach((slot, i) => {
  console.log(`Slot ${i + 1}:`, {
    position: `${(slot.left * 100).toFixed(1)}%, ${(slot.top * 100).toFixed(
      1
    )}%`,
    size: `${(slot.width * 100).toFixed(1)}% x ${(slot.height * 100).toFixed(
      1
    )}%`,
    ratio: slot.aspectRatio,
  });
});
```

---

## 🎬 Workflow Examples

### **Workflow A: Perfect Auto-Detection**

```
1. Design PNG with 3 clear transparent rectangles
2. Upload to admin panel
3. ✅ "Berhasil mendeteksi 3 slot!"
4. Review positions → OK
5. Upload frame → Success!
```

### **Workflow B: Manual Adjustment**

```
1. Upload PNG with complex transparency
2. ⚠️ "Terdeteksi 2 slot (expected 4)"
3. Click "Re-detect Slots"
4. Still 2 slots
5. Click "Tambah Manual" → Add missing slots
6. Upload frame → Success!
```

### **Workflow C: Full Manual**

```
1. Upload PNG with gradient transparency
2. ⚠️ "Tidak ada slot terdeteksi"
3. Click "Tambah Manual" 4x
4. Set positions manually
5. Upload frame → Success!
```

---

## 🐛 Troubleshooting

### **No Slots Detected**

**Problem**: Detection returns 0 slots

**Causes**:

- ❌ PNG has no transparent areas
- ❌ Transparent areas too small
- ❌ Semi-transparent (alpha 50-200)
- ❌ Feathered edges

**Solutions**:

1. Check PNG in image editor
2. Ensure alpha channel = 0
3. Make slots larger (min 80x100px)
4. Use hard edges (no anti-aliasing)
5. Add slots manually

### **Wrong Number of Slots**

**Problem**: Detected 2 slots, expected 3

**Causes**:

- ❌ Slots too close (merged)
- ❌ One slot too small
- ❌ Irregular shapes

**Solutions**:

1. Increase spacing between slots (>15px)
2. Enlarge small slots
3. Use rectangular shapes
4. Click "Re-detect Slots"
5. Edit/add manually

### **Incorrect Positions**

**Problem**: Slots in wrong locations

**Causes**:

- ❌ Multiple transparent areas merged
- ❌ Background has transparency
- ❌ Unexpected transparent pixels

**Solutions**:

1. Clean PNG (remove stray transparent pixels)
2. Solid background (alpha = 255)
3. Clear slot boundaries
4. Manual position adjustment

---

## 📈 Performance

### **Detection Speed**

- **Small PNG (500x888)**: ~100-300ms
- **Large PNG (1080x1920)**: ~500-1000ms
- **Very Large (2160x3840)**: ~2-5 seconds

### **Browser Compatibility**

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### **Limitations**

- Max image size: 5MB
- Max resolution: 4K (2160x3840)
- Max slots detected: 10
- Canvas API required

---

## 🎓 Best Practices Summary

1. **Design for Detection**

   - Clear rectangular transparent areas
   - Alpha = 0 (fully transparent)
   - Minimum 80x100px per slot
   - 15px spacing between slots

2. **Test Before Upload**

   - Preview in image editor
   - Check alpha channel
   - Validate transparency

3. **Review Detection Results**

   - Check slot count
   - Verify positions
   - Adjust if needed

4. **Optimize for Performance**

   - Compress PNG (< 1MB)
   - Standard size (500x888 or 1080x1920)
   - Simple shapes

5. **Fallback to Manual**
   - If auto-detection fails
   - For complex designs
   - For precise control

---

## 🔗 Related Files

- `src/utils/slotDetector.js` - Detection algorithm
- `src/pages/admin/AdminUploadFrame.jsx` - Upload UI
- `src/services/customFrameService.js` - Frame storage
- `my-app/CUSTOM_FRAME_UPLOAD_GUIDE.md` - Upload guide

---

**Last Updated**: 2025-01-20  
**Version**: 2.0.0 (Auto-Detection)  
**Status**: ✅ Production Ready
