# 📸 Admin Frame Upload Guide

## Fitur Upload Frame PNG untuk Admin

Fitur ini memungkinkan admin untuk mengupload frame custom dalam format PNG yang kemudian dapat digunakan oleh user dalam aplikasi photobooth.

## 🎯 Cara Menggunakan

### 1. Akses Halaman Upload Frame

1. Login sebagai admin (`admin@admin.com` / `admin`)
2. Buka menu **Admin Panel**
3. Klik **Upload Frame** di sidebar

### 2. Upload Frame PNG

1. **Informasi Frame**

   - Masukkan nama frame (contoh: `FremioSeries-red-3`)
   - Tambahkan deskripsi (opsional)
   - Pilih kategori:
     - Custom
     - Fremio Series
     - Inspired By
     - Seasonal
   - Tentukan jumlah foto (1-10)
   - Centang "Duplikat foto" jika ingin setiap foto muncul 2x

2. **Upload Gambar Frame**

   - Klik area upload atau drag & drop
   - File harus format **PNG**
   - Rekomendasi ukuran: **1080x1920px** (ratio 9:16)
   - Preview akan muncul setelah upload

3. **Konfigurasi Slot Foto**

   - Klik "Tambah Slot" untuk menambah area foto
   - Untuk setiap slot, atur:
     - **Kiri (left)**: Posisi horizontal (0.0 - 1.0)
     - **Atas (top)**: Posisi vertikal (0.0 - 1.0)
     - **Lebar (width)**: Lebar slot (0.0 - 1.0)
     - **Tinggi (height)**: Tinggi slot (0.0 - 1.0)
     - **Aspect Ratio**: Rasio foto (4:5, 1:1, 16:9, 3:4)
     - **Index Foto**: Foto mana yang akan ditampilkan di slot ini

4. **Preview Live**

   - Klik "Tampilkan" untuk melihat preview
   - Slot foto akan ditampilkan sebagai overlay biru
   - Pastikan posisi slot sesuai dengan desain frame

5. **Simpan Frame**
   - Klik "Simpan Frame"
   - Frame akan otomatis:
     - Tersimpan di localStorage
     - Status set ke **APPROVED**
     - Langsung tersedia untuk user

## 📋 Format Konfigurasi Slot

Slot menggunakan koordinat **relatif** (0.0 - 1.0):

```javascript
{
  left: 0.05,    // 5% dari kiri
  top: 0.1,      // 10% dari atas
  width: 0.4,    // 40% lebar frame
  height: 0.25,  // 25% tinggi frame
  aspectRatio: '4:5',
  photoIndex: 0  // Foto pertama
}
```

### Contoh: Frame 3 Foto Vertikal

```javascript
slots: [
  // Slot 1 - Atas
  {
    left: 0.1,
    top: 0.05,
    width: 0.8,
    height: 0.25,
    aspectRatio: "4:5",
    photoIndex: 0,
  },

  // Slot 2 - Tengah
  {
    left: 0.1,
    top: 0.35,
    width: 0.8,
    height: 0.25,
    aspectRatio: "4:5",
    photoIndex: 1,
  },

  // Slot 3 - Bawah
  {
    left: 0.1,
    top: 0.65,
    width: 0.8,
    height: 0.25,
    aspectRatio: "4:5",
    photoIndex: 2,
  },
];
```

## 🎨 Design Tips

### 1. Frame PNG Design

- Buat di **1080x1920px** (ratio 9:16 portrait)
- Gunakan **background transparan** untuk area foto
- Simpan sebagai **PNG** dengan alpha channel
- Pastikan elemen dekoratif tidak menutupi area foto

### 2. Slot Positioning

- **Margin safety**: Gunakan minimal 5% dari edge (0.05 dari left/top)
- **Gap antar slot**: Minimal 5% untuk visual yang baik
- **Alignment**: Gunakan nilai yang sama untuk left/right untuk alignment

### 3. Aspect Ratios

- **4:5** - Portrait selfie (paling umum)
- **1:1** - Square Instagram style
- **3:4** - Portrait klasik
- **16:9** - Landscape wide

## 📱 Tampilan di User

Frame yang diupload admin akan muncul di halaman **Frames** user dengan:

1. **Badge "CUSTOM"** - Warna gradient accent
2. **Border khusus** - Border #e0b7a9 untuk membedakan
3. **Section terpisah** - "Custom Frames" di atas "Semua Frame"
4. **Tombol khusus** - Gradient button untuk select

## 🔧 Technical Details

### Storage

- **Mode**: localStorage (compatible dengan LocalStorage mode)
- **Key**: `custom_frames`
- **Format**: JSON array dengan base64 images

### Frame Config Structure

```javascript
{
  id: 'frame-id',
  name: 'Frame Name',
  description: 'Description',
  category: 'custom',
  maxCaptures: 3,
  duplicatePhotos: false,
  imagePath: 'data:image/png;base64,...', // Base64 image
  thumbnailUrl: 'data:image/png;base64,...',
  slots: [...],
  layout: {
    aspectRatio: '9:16',
    orientation: 'portrait',
    backgroundColor: '#ffffff'
  },
  status: 'APPROVED',
  createdBy: 'admin@admin.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  views: 0,
  uses: 0,
  likes: 0
}
```

### Services Used

- `customFrameService.js` - CRUD operations untuk custom frames
- `frameProvider.js` - Integration dengan frame system
- `frameManagementService.js` - Frame workflow (Firebase mode)

## ✅ Checklist Sebelum Publish

- [ ] Frame PNG sudah di-upload dengan benar
- [ ] Ukuran frame sesuai rekomendasi (1080x1920px)
- [ ] Semua slot foto sudah dikonfigurasi
- [ ] Preview menampilkan slot di posisi yang benar
- [ ] Jumlah slot sesuai dengan maxCaptures
- [ ] Aspect ratio slot sesuai dengan design
- [ ] Nama frame unik dan deskriptif
- [ ] Kategori sudah dipilih

## 🐛 Troubleshooting

### Frame tidak muncul di user

- Pastikan frame sudah disimpan dengan sukses
- Check status frame harus **APPROVED**
- Refresh halaman Frames user

### Slot foto tidak sesuai

- Gunakan live preview untuk validasi
- Adjust koordinat dengan increment kecil (0.01)
- Pastikan nilai tidak melebihi 1.0

### Image terlalu besar

- Compress PNG sebelum upload
- Rekomendasi max size: 500KB
- Gunakan tools seperti TinyPNG

### Preview tidak muncul

- Pastikan file format PNG
- Check console untuk error
- Re-upload jika ada masalah

## 📊 Monitoring

Admin dapat melihat:

- Jumlah custom frames yang diupload
- Statistik usage (views, uses, likes)
- List semua custom frames di halaman **Manage Frames**

## 🚀 Future Enhancements

Fitur yang bisa ditambahkan:

- [ ] Crop tool untuk frame image
- [ ] Template slot presets
- [ ] Batch upload multiple frames
- [ ] Frame versioning
- [ ] User request frame
- [ ] Frame analytics dashboard
