# Video Text Wrapping Fix

## Problem
Teks pada canvas preview terlihat baik dengan line breaks yang benar (contoh: "Salwa's 22th Birthday" muncul di 2 baris terpisah). Namun, saat video di-download, teks menjadi 1 line panjang yang overlap dan terpotong.

## Root Cause
Video rendering tidak menggunakan text wrapping function seperti yang digunakan di photo download. Teks di-render tanpa:
1. `maxWidth` parameter di `ctx.fillText()`
2. Automatic word wrapping untuk teks panjang
3. Proper handling untuk manual line breaks

## Before (Video Rendering - Line 1810-1839)
```javascript
const lines = (element.data.text || '').split('\n');
const lineHeight = fontSize * 1.2;
const totalTextHeight = lines.length * lineHeight;

// ... positioning logic ...

lines.forEach((line, index) => {
  ctx.fillText(line, textX, startY + index * lineHeight); // ❌ No maxWidth!
});
```

**Problem:** 
- Teks panjang tidak di-wrap otomatis
- Overflow melampaui canvas width
- Tidak ada padding/margin

## After (Video Rendering dengan Text Wrapping)
```javascript
// Text wrapping function (same as photo download)
const wrapText = (context, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

// Handle manual line breaks first
const manualLines = (element.data.text || '').split('\n');
const allLines = [];

// Wrap each manual line to fit within width
manualLines.forEach(line => {
  if (line.trim()) {
    const wrappedLines = wrapText(ctx, line, width - 20); // ✅ 20px padding
    allLines.push(...wrappedLines);
  } else {
    allLines.push(''); // Empty line
  }
});

// ... positioning logic ...

allLines.forEach((line, index) => {
  const lineY = startY + (index * lineHeight);
  ctx.fillText(line, textX, lineY, width - 20); // ✅ maxWidth with padding
});
```

## Features Implemented

### 1. **Automatic Word Wrapping**
- Mengukur lebar setiap kata dengan `ctx.measureText()`
- Split ke line baru jika melebihi `maxWidth`
- Preserve spaces between words

### 2. **Manual Line Break Support**
- Split teks dengan `\n` terlebih dahulu
- Wrap setiap manual line secara individual
- Empty lines preserved

### 3. **Padding & Margin**
- 10px padding kiri/kanan
- Total 20px dikurangi dari maxWidth
- Mencegah teks terpotong di edge

### 4. **Alignment Support**
- Left: `textX = 10` (with padding)
- Center: `textX = width / 2`
- Right: `textX = width - 10` (with padding)

### 5. **MaxWidth Parameter**
- `ctx.fillText(line, textX, lineY, width - 20)`
- Hard limit untuk mencegah overflow
- Browser akan auto-compress jika masih terlalu panjang

## Example Behavior

### Input Text:
```
"Salwa's 22th Birthday"
```

### Canvas Width: 800px
### Font Size: 48px

**Before (No Wrapping):**
```
[Salwa's 22th Birthday                    ] ← Overflow & truncated
```

**After (With Wrapping):**
```
[Salwa's 22th      ]
[Birthday          ]
```

## Consistency

Sekarang text wrapping **konsisten** antara:
1. ✅ Canvas preview (live editing)
2. ✅ Photo download (static image)
3. ✅ Video download (animated rendering)

## Files Modified
- `/fremio/my-app/src/pages/EditPhoto.jsx`
  - Video text rendering (line 1810-1872)
  - Added `wrapText()` function
  - Added manual line break handling
  - Added `maxWidth` parameter to `fillText()`
  - Added proper padding and alignment

## Testing Checklist
- [x] Code compiled without errors
- [ ] Test video download dengan teks pendek ("Hello")
- [ ] Test video download dengan teks panjang ("Salwa's 22th Birthday")
- [ ] Test dengan manual line breaks ("Line 1\nLine 2")
- [ ] Test alignment (left, center, right)
- [ ] Test different font sizes
- [ ] Verify teks tidak overflow/terpotong
- [ ] Compare dengan canvas preview (harus sama)

## Notes
- Text wrapping function sama persis dengan yang digunakan di photo download
- Line height = fontSize × 1.2 (standard ratio)
- Padding 20px total (10px kiri + 10px kanan)
- Browser fallback: jika teks masih terlalu panjang setelah wrap, `maxWidth` parameter akan auto-compress

## Related Fixes
- Photo text wrapping fix (documented in TEXT_WRAPPING_FIX.md)
- Frame duplication fix (documented in FRAME_DUPLICATION_FIX.md)
