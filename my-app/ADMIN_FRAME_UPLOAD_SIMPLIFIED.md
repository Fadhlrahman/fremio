# Admin Frame Upload - Simplified System

## 📌 Perubahan Sistem

Sistem upload frame admin telah **disederhanakan** karena semua frame diupload langsung oleh admin, bukan oleh user/kreator. **Tidak ada lagi fitur approval/review/draft**.

### ✅ Yang Dihapus:

- ❌ Status approval (PENDING_REVIEW, APPROVED, REJECTED, DRAFT)
- ❌ Tombol approve/reject di admin panel
- ❌ Filter berdasarkan status
- ❌ Request changes functionality
- ❌ Feedback modal

### ✅ Yang Tersisa (Simple & Clean):

- ✅ Upload frame PNG dengan slot configuration
- ✅ Frame langsung tersedia untuk user setelah upload
- ✅ Stats hanya menampilkan **Total Frames**
- ✅ List semua frames yang sudah diupload
- ✅ View stats: views, uses, likes

---

## 🎯 Cara Menggunakan

### 1. Upload Frame Baru

1. Login sebagai admin
2. Klik menu **"Upload Frame"** di sidebar, atau
3. Klik tombol **"Upload Frame"** di dashboard (ada badge "NEW")
4. Upload file PNG (1080×1920px, max 5MB)
5. Isi informasi frame:
   - Nama frame \*
   - Deskripsi
   - Kategori (Custom, Fremio Series, Inspired By, Seasonal)
   - Jumlah foto (1-10)
   - Duplikat foto (checkbox)
6. Tambah slot foto:
   - Klik "Tambah Slot"
   - Atur posisi (left, top) dalam nilai 0.0-1.0
   - Atur ukuran (width, height) dalam nilai 0.0-1.0
   - Pilih aspect ratio (4:5, 1:1, 16:9, 3:4)
   - Tentukan index foto yang akan ditampilkan di slot ini
7. Lihat preview di panel kanan
8. Klik **"Simpan Frame"**
9. ✅ Frame langsung tersedia di halaman Frames untuk user!

### 2. Lihat Frame yang Sudah Diupload

1. Klik menu **"Frame Management"** di sidebar
2. Lihat total frames yang sudah diupload
3. Lihat detail setiap frame:
   - Thumbnail
   - Nama & deskripsi
   - Creator (email admin yang upload)
   - Stats: views, uses, likes

---

## 🗂️ Struktur Data Frame

Frame disimpan di **localStorage** dengan key `"custom_frames"`:

```json
{
  "id": "fremio-red-3",
  "name": "Fremio Red 3",
  "description": "Frame merah dengan 3 slot foto",
  "category": "fremio-series",
  "maxCaptures": 3,
  "duplicatePhotos": false,
  "imagePath": "data:image/png;base64,...",
  "thumbnailUrl": "data:image/png;base64,...",
  "createdAt": "2025-11-17T...",
  "updatedAt": "2025-11-17T...",
  "createdBy": "admin@example.com",
  "views": 0,
  "uses": 0,
  "likes": 0,
  "slots": [
    {
      "id": "slot_1",
      "left": 0.1,
      "top": 0.15,
      "width": 0.4,
      "height": 0.3,
      "aspectRatio": "4:5",
      "zIndex": 2,
      "photoIndex": 0
    }
  ],
  "layout": {
    "aspectRatio": "9:16",
    "orientation": "portrait",
    "backgroundColor": "#ffffff"
  }
}
```

---

## 🛠️ API Service (customFrameService.js)

### Methods:

- `getAllCustomFrames()` - Ambil semua custom frames
- `getCustomFrameById(frameId)` - Ambil frame berdasarkan ID
- `saveCustomFrame(frameData, imageFile)` - Simpan frame baru (langsung tersedia)
- `updateCustomFrame(frameId, updates, imageFile)` - Update frame
- `deleteCustomFrame(frameId)` - Hapus frame
- `incrementFrameStats(frameId, stat)` - Update stats (views/uses/likes)
- `getCustomFrameConfig(frameId)` - Get config untuk frameProvider

---

## 📍 Lokasi File

### Services:

- `src/services/customFrameService.js` - CRUD operations

### Admin Pages:

- `src/pages/admin/AdminDashboard.jsx` - Dashboard dengan quick actions
- `src/pages/admin/AdminUploadFrame.jsx` - Form upload frame
- `src/pages/admin/AdminFrames.jsx` - List semua frames

### User Page:

- `src/pages/Frames.jsx` - Menampilkan frames termasuk custom frames

### Utilities:

- `src/utils/frameProvider.js` - Integration dengan `setCustomFrame()`

---

## 🎨 UI Components

### AdminDashboard:

```jsx
// Frame Management Section
<MiniStatCard label="Total Frames" value={stats.frames.total} color="#3b82f6" />

{stats.frames.total === 0 && (
  <InfoMessage>
    Belum ada frame yang diupload. Klik "Upload Frame" untuk menambahkan frame custom pertama Anda!
  </InfoMessage>
)}

<Button variant="gradient">Upload Frame</Button>
<Button variant="outline">Manage Frames</Button>
```

### AdminUploadFrame:

- **Drag & Drop Upload Area** dengan icon besar
- **File Specifications Box** (PNG, 1080×1920px, max 5MB)
- **Preview with File Info**
- **Slot Configuration** dengan visual overlay
- **Live Preview** panel di kanan

### AdminFrames:

- **Simple Stats**: Total Frames only
- **Frame Cards** dengan thumbnail, info, dan stats
- **No action buttons** (no approve/reject)

---

## ✨ User Experience Flow

1. **Admin uploads frame** → Frame langsung tersedia
2. **User membuka halaman Frames** → Lihat custom frames di section khusus
3. **User pilih custom frame** → frameProvider.setCustomFrame(frameId)
4. **User pakai frame** → stats.uses bertambah

---

## 🚀 Keunggulan Sistem Baru

### ✅ Pros:

- **Sederhana** - Tidak ada workflow approval yang kompleks
- **Cepat** - Frame langsung bisa dipakai user setelah upload
- **Jelas** - Admin punya kontrol penuh atas frames
- **Clean Code** - Kode lebih ringkas tanpa status management

### 💡 Notes:

- Semua frame yang diupload admin otomatis tersedia untuk user
- Tidak ada draft atau pending review
- Admin bertanggung jawab untuk QA frame sebelum upload
- Stats (views, uses, likes) tetap tracked untuk analytics

---

## 🔄 Migration dari Sistem Lama

Jika ada data lama dengan status field:

```javascript
// Old data
{
  "status": "APPROVED", // ❌ tidak dipakai lagi
  ...
}

// New data (no status field)
{
  // ✅ langsung tersedia
  ...
}
```

Sistem baru tidak lagi cek `status === 'APPROVED'`, semua frame di localStorage langsung ditampilkan.

---

## 📦 Summary

- **1 Service**: customFrameService.js
- **3 Admin Pages**: Dashboard, Upload, Frames
- **1 User Page**: Frames.jsx
- **0 Approval Workflow**: Upload → Langsung Tersedia
- **Simple Stats**: Total Frames only

✨ **Clean, Simple, Fast!**
