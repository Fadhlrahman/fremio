# 📸 Custom Frame Upload Guide

## ✅ Cara Upload Frame dari Admin Panel

### 1. **Persiapan File Frame**

- Format: **PNG dengan transparansi**
- Ukuran: **500x888 pixels** (ratio 9:16)
- Pastikan area foto transparan (alpha channel)
- Background frame bisa warna solid atau gradasi

### 2. **Login sebagai Admin**

```
URL: http://localhost:5180/admin/login
```

### 3. **Buka Upload Frame Page**

```
URL: http://localhost:5180/admin/upload-frame
```

### 4. **Upload Frame**

1. Klik **"Choose File"** atau drag & drop PNG frame
2. Preview akan muncul
3. Atur **slot positions** untuk foto:
   - Left (X): posisi horizontal (0-100%)
   - Top (Y): posisi vertical (0-100%)
   - Width: lebar slot (0-100%)
   - Height: tinggi slot (0-100%)
4. Isi **Frame Details**:
   - Name: Nama frame
   - Description: Deskripsi (optional)
   - Category: custom
   - Max Captures: jumlah foto (3-4)
5. Klik **"Upload Frame"**

### 5. **Cek di User Side**

```
URL: http://localhost:5180/frames
```

- Custom frame akan muncul di bagian atas
- Styling sama dengan built-in frames
- Klik "Lihat Frame" untuk pakai

---

## 🧪 Quick Test (Development Only)

Untuk testing cepat tanpa upload real PNG:

### Option 1: Browser Console

```javascript
fetch("/add-test-frame.js")
  .then((r) => r.text())
  .then(eval);
```

### Option 2: Manual localStorage

```javascript
const testFrame = {
  id: "my-test-frame",
  name: "My Test Frame",
  description: "Testing custom frame",
  category: "custom",
  maxCaptures: 3,
  duplicatePhotos: false,
  imagePath: "URL_TO_YOUR_FRAME_IMAGE.png",
  thumbnailUrl: "URL_TO_YOUR_THUMBNAIL.png",
  slots: [
    {
      id: "slot_1",
      left: 0.1,
      top: 0.2,
      width: 0.35,
      height: 0.25,
      aspectRatio: "4:5",
      zIndex: 2,
      photoIndex: 0,
    },
    {
      id: "slot_2",
      left: 0.55,
      top: 0.2,
      width: 0.35,
      height: 0.25,
      aspectRatio: "4:5",
      zIndex: 2,
      photoIndex: 1,
    },
    {
      id: "slot_3",
      left: 0.325,
      top: 0.55,
      width: 0.35,
      height: 0.25,
      aspectRatio: "4:5",
      zIndex: 2,
      photoIndex: 2,
    },
  ],
  layout: {
    aspectRatio: "9:16",
    orientation: "portrait",
    backgroundColor: "#ffffff",
  },
  views: 0,
  uses: 0,
  likes: 0,
  createdBy: "test@fremio.com",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Save to localStorage
const frames = JSON.parse(localStorage.getItem("custom_frames") || "[]");
frames.push(testFrame);
localStorage.setItem("custom_frames", JSON.stringify(frames));

// Refresh page
location.reload();
```

---

## 🔧 Troubleshooting

### Frame tidak muncul di user side

✅ **Cek**:

```javascript
console.log(localStorage.getItem("custom_frames"));
```

- Jika `null` → Belum ada frame uploaded
- Jika `[]` → Array kosong, upload frame baru
- Jika ada data → Refresh browser

### Gambar frame broken/tidak muncul

❌ **Masalah**: Base64 image tidak valid
✅ **Solusi**:

1. Pastikan upload PNG yang benar (bukan JPG/GIF)
2. Check file size < 1MB
3. Re-upload frame dari admin panel

### Frame tidak bisa diklik

❌ **Masalah**: frameProvider tidak bisa load config
✅ **Solusi**:

1. Clear localStorage: `localStorage.clear()`
2. Re-upload frame
3. Check console errors (F12)

### Slot tidak sesuai

❌ **Masalah**: Posisi slot salah
✅ **Solusi**:

1. Edit frame di admin panel
2. Adjust slot positions (left, top, width, height)
3. Re-save frame

---

## 📊 Analytics Tracking

Custom frames automatically tracked:

- ✅ **Views**: Saat user klik "Lihat Frame"
- ✅ **Downloads**: Saat user download foto/video
- ✅ **Likes**: Saat user like frame (future)

Check analytics:

```
URL: http://localhost:5180/admin/analytics
```

---

## 🎨 Best Practices

### Frame Design

1. **Resolution**: 500x888px (9:16 ratio)
2. **Format**: PNG-24 with transparency
3. **File size**: < 500KB recommended
4. **Color mode**: RGB
5. **Transparent areas**: Where photos should appear

### Slot Configuration

1. **Aspect ratio**: 4:5 (standard photo)
2. **Spacing**: Minimum 5% margin between slots
3. **Z-index**: Slots = 2, Frame overlay = 3
4. **Position**: Use decimal (0.1 = 10%, 0.5 = 50%)

### Testing Checklist

- [ ] Frame PNG uploaded successfully
- [ ] Preview shows correct image
- [ ] All slots positioned correctly
- [ ] Frame appears on /frames page
- [ ] Click "Lihat Frame" works
- [ ] Navigate to /take-moment successful
- [ ] Photos fit in slots properly
- [ ] Download works and tracks analytics

---

## 🚀 Production Deployment

When deploying to production:

1. **Remove dev helpers** in Frames.jsx:

   - Orange helper box only shows in dev mode
   - No test utilities in production

2. **Pre-load frames**:

   - Admin upload popular frames
   - Test each frame before launch

3. **Set proper validation**:

   - Max file size: 1MB
   - Allowed formats: PNG only
   - Min/max dimensions check

4. **Monitor analytics**:
   - Track frame performance
   - Remove unpopular frames
   - Add new designs based on usage

---

## 📝 Integration Flow

```
[Admin Upload Frame]
    ↓
[customFrameService.saveCustomFrame()]
    ↓
[localStorage.custom_frames]
    ↓
[User /frames page]
    ↓
[getAllCustomFrames()]
    ↓
[Display in grid]
    ↓
[User clicks "Lihat Frame"]
    ↓
[trackFrameView()]
    ↓
[frameProvider.setCustomFrame()]
    ↓
[Navigate to /take-moment]
    ↓
[User takes photos]
    ↓
[User downloads]
    ↓
[trackFrameDownload()]
    ↓
[Admin checks analytics]
```

---

## ✨ Features Implemented

✅ Admin upload PNG frame  
✅ Auto-save to localStorage  
✅ Display seamlessly with built-in frames  
✅ Same styling (no special badges)  
✅ Analytics tracking (views, downloads)  
✅ Frame selection with setCustomFrame()  
✅ Edit/Delete frame (admin panel)  
✅ Real-time stats update  
✅ Activity logging  
✅ User-friendly UI

---

**Last Updated**: 2025-01-20  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
