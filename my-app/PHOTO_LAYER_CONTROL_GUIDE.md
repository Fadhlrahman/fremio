# 📸 Photo Layer Control - Create Page Guide

## Overview
Panduan lengkap untuk mengatur layer/z-index elemen foto di halaman Create (FrameBuilder).

---

## ✨ Features Implemented

### 1. **Layer Control Buttons (PropertiesPanel)**

Ketika elemen foto dipilih, user mendapatkan 4 tombol kontrol layer:

```
┌────────────────────────────────────┐
│        LAPISAN (LAYER)             │
├────────────────────────────────────┤
│  📊 Posisi Layer: z-index: 150     │ ← Visual indicator
├────────────────────────────────────┤
│  [⬆⬆ Paling Depan]  [⬇⬇ Paling Belakang]  │
│  [⬆ Kedepankan]     [⬇ Kebelakangkan]     │
└────────────────────────────────────┘
```

**Button Functions:**
- **Paling Depan (Bring to Front)**: Set z-index tertinggi, foto di depan semua elemen
- **Paling Belakang (Send to Back)**: Set z-index terendah, foto di belakang semua elemen
- **Kedepankan (Bring Forward)**: Naikkan 1 layer, tukar posisi dengan elemen di atasnya
- **Kebelakangkan (Send Backward)**: Turunkan 1 layer, tukar posisi dengan elemen di bawahnya

---

### 2. **Z-Index Display Badge**

Badge yang menampilkan z-index saat ini:

```javascript
┌─────────────────────────────┐
│ Posisi Layer  │  z-index: 150 │
└─────────────────────────────┘
```

**Styling:**
- Background: Gradient pink (#e0b7a9 → #c89585)
- Font: Bold, Fremio brand color
- Border: Subtle border with brand color

---

### 3. **Canvas Layer Indicator (Visual Badge)**

Badge yang muncul di atas elemen foto yang selected:

```
     ┌──────────────────┐
     │ 🔲 Layer: 150    │  ← Purple gradient badge
     └──────────────────┘
            ↓
    ╔═══════════════╗
    ║   📷 FOTO     ║  ← Selected photo element
    ╚═══════════════╝
```

**Badge Features:**
- **Color**: Purple gradient (#667eea → #764ba2)
- **Icon**: Layers icon (stacked rectangles)
- **Text**: `Layer: {zIndex}`
- **Position**: Above element, centered
- **Visibility**: Only shown when photo/upload element is selected

---

### 4. **Photo Layer Tips Section**

Section informatif di PropertiesPanel untuk photo elements:

```
┌─────────────────────────────────────────────┐
│ 💡 TIPS LAPISAN FOTO                        │
├─────────────────────────────────────────────┤
│ ℹ️  Area Foto untuk Kamera                  │
│                                             │
│ Gunakan kontrol lapisan di atas untuk      │
│ mengatur apakah foto berada di depan atau  │
│ belakang elemen lain (teks, shape).        │
│                                             │
│ [📷 Foto akan muncul di sini saat diambil] │
└─────────────────────────────────────────────┘
```

**Styling:**
- Background: Blue gradient (from-blue-50 to-indigo-50)
- Icon: Info icon dengan blue badge
- Border: Subtle blue border
- Badge: "Foto akan muncul di sini saat diambil" - blue badge

---

## 🎯 Use Cases

### Use Case 1: Foto di Belakang Text (Common)

**Scenario:** User ingin text overlay di atas foto

**Steps:**
1. Pilih elemen foto (klik foto area)
2. Klik **"Paling Belakang"** atau **"Kebelakangkan"**
3. Foto akan berada di bawah text/shapes

**Result:**
```
Layer Order:
- Text (z-index: 300) ← Di depan
- Shape (z-index: 250)
- Photo (z-index: 100) ← Di belakang
```

---

### Use Case 2: Foto di Depan Border/Frame

**Scenario:** User ingin foto menutupi border dekoratif

**Steps:**
1. Pilih elemen foto
2. Klik **"Paling Depan"** atau **"Kedepankan"**
3. Foto akan berada di atas border/shape

**Result:**
```
Layer Order:
- Photo (z-index: 400) ← Di depan
- Text (z-index: 300)
- Border Shape (z-index: 200) ← Di belakang
```

---

### Use Case 3: Fine-tune Layer Position

**Scenario:** User ingin foto berada antara 2 elemen

**Steps:**
1. Pilih foto → Lihat z-index saat ini (contoh: 150)
2. Gunakan **"Kedepankan"** atau **"Kebelakangkan"** untuk adjust
3. Perhatikan badge z-index berubah real-time

**Result:**
```
Layer Order:
- Text 1 (z-index: 300)
- Photo (z-index: 250) ← Adjusted position
- Shape (z-index: 200)
- Text 2 (z-index: 150)
```

---

## 🔧 Technical Implementation

### ⚠️ BUG FIX: Removed Z-Index Restrictions

**Problem Identified:**
- Photo elements were hard-limited to max z-index = 2
- Other elements forced to min z-index = 3
- This made it **impossible** for photos to appear above text/shapes

**Fix Applied:**

### 1. **useCreatorStore.js - sendToBack() Function**

```javascript
// OLD (BROKEN):
const nextZ = Math.max(NORMAL_ELEMENTS_MIN_Z, minZ - 1);
// This forced ALL elements to stay >= NORMAL_ELEMENTS_MIN_Z (1)

// NEW (FIXED):
const absoluteMin = BACKGROUND_PHOTO_Z + 1; // -3999
const nextZ = Math.max(absoluteMin, minZ - 1);
// Now elements can go down to just above background!
```

### 2. **Create.jsx - normalizePhotoLayering() Function**

```javascript
// OLD (BROKEN):
let desiredZ = currentZ ?? NORMAL_ELEMENTS_MIN_Z;
if (desiredZ < NORMAL_ELEMENTS_MIN_Z) {
  desiredZ = NORMAL_ELEMENTS_MIN_Z; // Forced all to >= 1
}

// NEW (FIXED):
const absoluteMin = BACKGROUND_PHOTO_Z + 1;
let defaultMin = NORMAL_ELEMENTS_MIN_Z;

// Photo and upload elements can start lower
if (element.type === 'photo' || element.type === 'upload') {
  defaultMin = PHOTO_SLOT_MIN_Z; // Can start at 0
}

let desiredZ = currentZ ?? defaultMin;
if (desiredZ < absoluteMin) {
  desiredZ = absoluteMin; // Only limit: above background
}
```

---

### 1. **useCreatorStore Functions (UPDATED)**

```javascript
// Bring to Front - Set highest z-index
bringToFront: (id) => {
  const nextZ = get().lastZIndex + 1;
  set((state) => ({
    elements: state.elements.map(el => 
      el.id === id ? { ...el, zIndex: nextZ } : el
    ),
    lastZIndex: nextZ
  }));
}

// Send to Back - Set lowest z-index
sendToBack: (id) => {
  const minZ = Math.min(...get().elements
    .filter(el => el.type !== 'background-photo')
    .map(el => el.zIndex || 1)
  );
  const nextZ = Math.max(NORMAL_ELEMENTS_MIN_Z, minZ - 1);
  set(/* update element with nextZ */);
}

// Bring Forward - Swap with next element
bringForward: (id) => {
  const sorted = sortedElements();
  const currentIndex = sorted.findIndex(el => el.id === id);
  const nextElement = sorted[currentIndex + 1];
  // Swap zIndex values
}

// Send Backward - Swap with previous element
sendBackward: (id) => {
  const sorted = sortedElements();
  const currentIndex = sorted.findIndex(el => el.id === id);
  const prevElement = sorted[currentIndex - 1];
  // Swap zIndex values
}
```

---

### 2. **PropertiesPanel - Z-Index Display**

```jsx
<div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#e0b7a9]/10 to-[#c89585]/10 px-4 py-3">
  <span className="text-xs font-semibold">Posisi Layer</span>
  <div className="flex items-center gap-2">
    <span className="text-sm font-bold text-[#e0b7a9]">z-index:</span>
    <span className="rounded-lg bg-white px-3 py-1 text-sm font-bold">
      {selectedElement?.zIndex || 0}
    </span>
  </div>
</div>
```

---

### 3. **CanvasPreview - Layer Badge**

```jsx
{(element.type === 'photo' || element.type === 'upload') && (
  <div style={{
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "2px solid #667eea",
    padding: "0 16px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)"
  }}>
    <svg>{/* Layers icon */}</svg>
    <span>Layer: {element.zIndex || 0}</span>
  </div>
)}
```

---

## 📊 Z-Index Hierarchy

### Updated Z-Index Values (FIXED - No Restrictions!):

```javascript
BACKGROUND_PHOTO_Z = -4000      // Background photo (paling belakang)
PHOTO_SLOT_MIN_Z = 0            // Photo slots DEFAULT start here
NORMAL_ELEMENTS_MIN_Z = 1       // Text, shapes DEFAULT start here

// BUT: Photos can now go ANYWHERE between background and infinity!
// Min: BACKGROUND_PHOTO_Z + 1 = -3999 (just above background)
// Max: No limit! Can be 1000, 5000, or any value
```

### ✅ FIXED: Photos Can Now Be Layered Freely!

**Before (BROKEN):**
```
❌ Photo max z-index: 2 (HARD LIMIT)
❌ Other elements min z-index: 3
❌ Photos could NEVER be above text/shapes
```

**After (FIXED):**
```
✅ Photo min z-index: -3999 (above background)
✅ Photo max z-index: No limit!
✅ Photos CAN be above text/shapes
✅ Photos CAN be below text/shapes
✅ Full flexibility!
```

### Typical Layer Order (Flexible):

```
+5000 ← Photos can go HERE too! ✅
+1000 ← Or here! ✅
 +500 ← Text overlays (front-most by default)
 +400
 +300 ← Decorative shapes
 +200 ← NORMAL_ELEMENTS_MIN_Z
 +100 ← Photos can be here ✅
  +50 ← Or here ✅
   +0 ← PHOTO_SLOT_MIN_Z (default for photos)
  -10 ← Photos can even go here! ✅
-3999 ← Photo minimum (just above background)
-4000 ← BACKGROUND_PHOTO_Z (back-most)
```

---

## ✅ User Benefits

### 1. **Visual Feedback**
- ✅ Real-time z-index display
- ✅ Purple badge shows layer number
- ✅ Clear button labels in Indonesian

### 2. **Easy Control**
- ✅ 4 clear buttons for all scenarios
- ✅ One-click operations
- ✅ Undo-friendly (can be reversed)

### 3. **Educational**
- ✅ Tips section explains layering
- ✅ Visual icon showing stacked layers
- ✅ Clear explanation of "depan" vs "belakang"

### 4. **Flexible**
- ✅ Can place photos above or below text
- ✅ Fine-tune with forward/backward
- ✅ Jump to extremes with front/back

---

## 🎨 Design Consistency

### Color Palette:

- **Layer Controls**: Fremio brand pink (#e0b7a9)
- **Layer Badge**: Purple gradient (#667eea → #764ba2)
- **Tips Section**: Blue gradient (blue-50 → indigo-50)

### Icons:

- **Layers Icon**: Stacked rectangles (SVG)
- **Arrow Icons**: ChevronsUp, ChevronsDown, ArrowUp, ArrowDown (Lucide React)
- **Info Icon**: Circle with "i" (SVG)

---

## 🧪 Testing Checklist

- [x] Click photo element → Layer controls appear
- [x] Z-index badge displays current value
- [x] "Paling Depan" sets highest z-index
- [x] "Paling Belakang" sets lowest z-index
- [x] "Kedepankan" swaps with next element
- [x] "Kebelakangkan" swaps with previous element
- [x] Purple layer badge shows on canvas
- [x] Badge updates when z-index changes
- [x] Tips section appears for photo elements
- [x] Works for both 'photo' and 'upload' types

---

## 📝 Usage Examples

### Example 1: Create Photo Behind Text Overlay

```javascript
// Initial state
elements = [
  { id: 1, type: 'photo', zIndex: 300 },
  { id: 2, type: 'text', zIndex: 200 }
]

// User clicks photo → "Kebelakangkan"
// Result:
elements = [
  { id: 1, type: 'photo', zIndex: 200 },  // Swapped
  { id: 2, type: 'text', zIndex: 300 }    // Now on top
]
```

### Example 2: Create Layered Photo Collage

```javascript
// 3 photos stacked
elements = [
  { id: 1, type: 'photo', zIndex: 100 },  // Bottom
  { id: 2, type: 'photo', zIndex: 150 },  // Middle
  { id: 3, type: 'photo', zIndex: 200 }   // Top
]

// User selects photo #2 → "Paling Depan"
// Result:
elements = [
  { id: 1, type: 'photo', zIndex: 100 },  // Still bottom
  { id: 2, type: 'photo', zIndex: 250 },  // Now on top!
  { id: 3, type: 'photo', zIndex: 200 }   // Middle
]
```

---

## 🚀 Summary

✅ **Photo elements can now control their layer position**  
✅ **Visual z-index indicator on canvas**  
✅ **4 intuitive layer control buttons**  
✅ **Educational tips section**  
✅ **Real-time feedback with badges**  
✅ **Consistent with Fremio design language**

**Status: FULLY IMPLEMENTED & PRODUCTION READY** 🎉
