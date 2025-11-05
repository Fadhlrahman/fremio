# 📸 Frame Flow Guide - Fremio

## Overview
Dokumentasi lengkap alur pemilihan frame dari halaman Frames hingga EditPhoto.

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    1. FRAMES PAGE                           │
│                    (/frames)                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User memilih frame:                                        │
│  - FremioSeries-blue-3                                      │
│  - InspiredBy-AbbeyRoad                                     │
│  - Custom frame (dari creator)                              │
│                                                             │
│  onClick: frameProvider.setFrame(frameId)                   │
│           ↓                                                 │
│  Frame tersimpan di:                                        │
│  - localStorage: 'selectedFrame' = frameId                  │
│  - localStorage: 'frameConfig' = {...config}                │
│           ↓                                                 │
│  navigate('/take-moment')                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   2. TAKE MOMENT PAGE                       │
│                   (/take-moment)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Load frame dari localStorage:                              │
│  - frameProvider.loadFrameFromStorage()                     │
│  - Dapatkan frameConfig                                     │
│  - Dapatkan maxCaptures & slots                             │
│                                                             │
│  User mengambil foto:                                       │
│  - Foto 1, Foto 2, ..., Foto N                             │
│  - Disimpan ke: localStorage 'capturedPhotos'               │
│                                                             │
│  Setelah semua foto diambil:                                │
│  - navigate('/edit-photo')                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   3. EDIT PHOTO PAGE                        │
│                   (/edit-photo)                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Load data dari localStorage:                               │
│  1. capturedPhotos = safeStorage.getJSON('capturedPhotos')  │
│  2. frameConfig = safeStorage.getJSON('frameConfig')        │
│                                                             │
│  Process frameConfig:                                       │
│  - Jika config.isCustom = true:                             │
│    • Load designer.elements                                 │
│    • Convert photo slots (type='photo' → type='upload')     │
│    • Load background-photo                                  │
│    • Load text, shapes, other elements                      │
│                                                             │
│  Render Preview:                                            │
│  - Show frame name (e.g., "FremioSeries-blue-3")           │
│  - Show "Custom" badge if isCustom = true                   │
│  - Render all elements with unified layering               │
│  - Photos fill into converted photo slots                   │
│                                                             │
│  Actions:                                                   │
│  - Back to Frames: navigate('/frames')                      │
│  - Save Template: html2canvas → localStorage                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Frames.jsx - Frame Selection

```javascript
// User clicks "Lihat Frame" button
<button
  onClick={async () => {
    const success = await frameProvider.setFrame(frame.id);
    if (success !== false) {
      navigate("/take-moment");
    }
  }}
>
  Lihat Frame
</button>
```

**What happens:**
- `frameProvider.setFrame(frameId)` dipanggil
- Frame config dimuat dari `frameConfigManager`
- Config disimpan ke localStorage:
  - Key: `'selectedFrame'` → Value: `frameId`
  - Key: `'frameConfig'` → Value: `{...config}`
- Navigate ke `/take-moment`

---

### 2. TakeMoment.jsx - Photo Capture

```javascript
useEffect(() => {
  // Load frame saat component mount
  frameProvider.loadFrameFromStorage();
}, []);

// Setelah semua foto diambil
const handleFinishCapture = () => {
  safeStorage.setJSON('capturedPhotos', photos);
  navigate('/edit-photo');
};
```

**What happens:**
- Load frame dari localStorage
- User ambil foto sesuai `maxCaptures`
- Photos disimpan ke `localStorage: 'capturedPhotos'`
- Navigate ke `/edit-photo`

---

### 3. EditPhoto.jsx - Preview & Edit

```javascript
useEffect(() => {
  // Load photos
  const capturedPhotos = safeStorage.getJSON('capturedPhotos');
  setPhotos(capturedPhotos);

  // Load frame config (FRAME YANG DIPILIH DI FRAMES.JSX)
  const config = safeStorage.getJSON('frameConfig');
  setFrameConfig(config);
  
  console.log('✅ Loaded frame:', config.id);
  // Output: "✅ Loaded frame: FremioSeries-blue-3"
  
  // Process custom frame
  if (config.isCustom && config.designer?.elements) {
    // Convert photo slots
    const photoElements = config.designer.elements.filter(
      el => el.type === 'photo'
    );
    const photoAsUploads = photoElements.map(el => ({
      ...el,
      type: 'upload',
      data: { ...el.data, image: null, photoIndex: ... }
    }));
    
    // Load other elements
    const otherElements = config.designer.elements.filter(
      el => el.type !== 'photo' && el.type !== 'background-photo'
    );
    
    // Combine all
    setDesignerElements([...photoAsUploads, ...otherElements]);
  }
}, []);

// Fill photos into slots
useEffect(() => {
  const updatedElements = designerElements.map(el => {
    if (el.type === 'upload' && el.data?.photoIndex !== undefined) {
      return {
        ...el,
        data: { ...el.data, image: photos[el.data.photoIndex] }
      };
    }
    return el;
  });
  setDesignerElements(updatedElements);
}, [photos]);
```

**What happens:**
- Frame config yang dipilih di Frames.jsx berhasil dimuat
- Frame ID dan name ditampilkan di UI
- Jika custom frame, designer elements diproses
- Photos dari TakeMoment diisi ke photo slots
- Render preview dengan unified layering

---

## 📊 Data Structure

### frameConfig in localStorage

```json
{
  "id": "FremioSeries-blue-3",
  "name": "Fremio Series Blue",
  "isCustom": true,
  "maxCaptures": 3,
  "slots": [...],
  "designer": {
    "canvasBackground": "#ffffff",
    "elements": [
      {
        "id": "bg-1",
        "type": "background-photo",
        "zIndex": -4000,
        "data": { "image": "..." }
      },
      {
        "id": "photo-1",
        "type": "photo",
        "zIndex": 100,
        "x": 50,
        "y": 100,
        "width": 200,
        "height": 300,
        "data": { "photoIndex": 0 }
      },
      {
        "id": "text-1",
        "type": "text",
        "zIndex": 500,
        "data": { "text": "PARK MEMORIES" }
      }
    ]
  }
}
```

### capturedPhotos in localStorage

```json
[
  "data:image/jpeg;base64,...",  // Photo 1
  "data:image/jpeg;base64,...",  // Photo 2
  "data:image/jpeg;base64,...",  // Photo 3
]
```

---

## ✅ Verification Steps

Untuk memverifikasi koneksi bekerja:

### 1. Di Frames Page
```javascript
// Open browser console
localStorage.getItem('selectedFrame')
// Output: "FremioSeries-blue-3"

JSON.parse(localStorage.getItem('frameConfig')).id
// Output: "FremioSeries-blue-3"
```

### 2. Di TakeMoment Page
```javascript
// Check console logs
// ✅ Loaded frame config: FremioSeries-blue-3
// 📊 Max captures: 3
```

### 3. Di EditPhoto Page
```javascript
// Check console logs
// 📦 Loading data from localStorage...
// ✅ Loaded photos: 3
// ✅ Loaded frame config: FremioSeries-blue-3
// 📋 Frame details: { id: "FremioSeries-blue-3", name: "Fremio Series Blue", ... }

// Check UI
// Preview title shows: "Fremio Series Blue [Custom]"
```

---

## 🎯 Key Points

1. **Single Source of Truth**: `frameConfig` in localStorage
2. **Passed Through**: Frames → TakeMoment → EditPhoto
3. **Frame Persistence**: Frame tetap sama sepanjang flow
4. **No Re-selection**: User tidak perlu pilih frame lagi
5. **Automatic Loading**: EditPhoto otomatis load frame yang dipilih

---

## 🔍 Debugging

Jika frame tidak muncul di EditPhoto:

```javascript
// 1. Check localStorage
console.log('Selected frame:', localStorage.getItem('selectedFrame'));
console.log('Frame config:', JSON.parse(localStorage.getItem('frameConfig')));

// 2. Check EditPhoto state
console.log('frameConfig state:', frameConfig);
console.log('designerElements:', designerElements);

// 3. Check photos
console.log('Photos:', photos);
```

---

## 🚀 Summary

✅ Frame selection di Frames.jsx **SUDAH TERSAMBUNG** ke EditPhoto.jsx  
✅ Frame yang dipilih **OTOMATIS MUNCUL** di EditPhoto  
✅ Tidak perlu konfigurasi tambahan  
✅ System menggunakan localStorage sebagai bridge  
✅ Unified layering system tetap terjaga  

**Status: FULLY CONNECTED & WORKING** 🎉
