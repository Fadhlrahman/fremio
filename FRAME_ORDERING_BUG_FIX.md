# Frame Ordering Bug Fix

## 🐛 Masalah yang Ditemukan

### Gejala
Ketika mengubah urutan kategori frame pada halaman `/admin/frames`, jumlah frame dalam kategori tersebut berkurang. Misalnya:
- **Sebelum**: Kategori "Year-End Recap Fremio Series" memiliki **9 frames** di urutan ke-5
- **Setelah** mengubah urutan kategori menjadi urutan ke-6: Hanya **8 frames** yang tampil

Frame yang hilang bergantian/berbeda setiap kali urutan diubah.

### Lokasi Masalah
File: `/Users/salwa/Documents/fremio/backend/src/routes/frames.js`

Pada endpoint `GET /api/frames`, terdapat **default limit 50 frames**:

```javascript
// ❌ SEBELUM (BERMASALAH):
const { category, limit = 50, offset = 0, search, includeHidden } = req.query;
```

### Penyebab Root Cause

1. **API Backend** hanya mengembalikan maksimal **50 frames** karena ada default `limit = 50`
2. Ketika admin mengubah urutan kategori:
   - Frontend hanya memiliki 50 frames yang sudah di-load
   - Fungsi `rebuildFramesOrder()` hanya mengatur ulang 50 frames tersebut
   - Frame ke-51 dan seterusnya **TIDAK** ikut di-rebuild karena tidak ada di memory
3. Setelah save dan reload, sistem hanya mengambil 50 frames lagi dari database
4. **Frames yang ke-51 dst tetap ada di database**, tapi tidak dimuat atau diproses

### Mengapa Frame Berbeda yang Hilang?

Ketika urutan kategori diubah:
- Frame-frame di-reorder berdasarkan `display_order`
- 50 frame pertama (berdasarkan urutan baru) yang dimuat
- Frame yang tadinya di posisi 1-50 bisa bergeser keluar dari "top 50" setelah reordering
- Hasilnya: Frame yang "hilang" berbeda setiap kali urutan diubah

## ✅ Solusi

Menghapus default limit 50 pada API backend agar semua frames dimuat ketika admin mengelola frame.

### Perubahan Code

**File**: `backend/src/routes/frames.js`

```javascript
// ✅ SETELAH (FIXED):
const { category, limit, offset = 0, search, includeHidden } = req.query;

// ... (kode lainnya)

// Only apply LIMIT if explicitly provided (no default limit for admin)
if (limit) {
  params.push(parseInt(limit));
  query += ` LIMIT $${params.length}`;
  
  params.push(parseInt(offset));
  query += ` OFFSET $${params.length}`;
}
```

### Penjelasan Solusi

1. **Menghapus default value** `limit = 50` dari destructuring parameters
2. **Conditional LIMIT**: Hanya apply `LIMIT` jika parameter `limit` explicitly dikirim dari frontend
3. Untuk halaman admin yang memanggil `getAllFrames({ includeHidden: true })` **tanpa** parameter `limit`, **SEMUA frames akan dimuat**
4. Untuk public endpoints yang mengirim `limit`, masih bisa menggunakan pagination

## 📊 Impact Analysis

### Sebelum Fix
- ❌ Maksimal 50 frames dimuat di halaman admin
- ❌ Frame hilang saat reorder kategori
- ❌ Data tidak konsisten antara database dan tampilan admin

### Setelah Fix
- ✅ **Semua frames dimuat** di halaman admin (tidak ada limit)
- ✅ Reorder kategori bekerja dengan benar tanpa frame hilang
- ✅ Data konsisten antara database dan tampilan
- ✅ Public endpoints masih bisa menggunakan pagination jika diperlukan

## 🧪 Testing

### Test Case 1: Load All Frames
```javascript
// Di halaman admin, panggil:
const frames = await unifiedFrameService.getAllFrames({ includeHidden: true });
console.log('Total frames loaded:', frames.length);
// Expected: SEMUA frames dari database, bukan hanya 50
```

### Test Case 2: Reorder Categories
1. Buka `/admin/frames`
2. Klik tombol "🔄 Atur Urutan"
3. Pilih kategori dengan >50 total frames di semua kategori
4. Ubah urutan kategori dengan tombol "↑ Kategori" atau "↓ Kategori"
5. Klik "💾 Simpan Urutan"
6. Verify: Jumlah frame di setiap kategori **tidak berubah**

### Test Case 3: Reorder Frames Within Category
1. Di mode reorder, ubah urutan frame dalam satu kategori
2. Klik "💾 Simpan Urutan"
3. Reload halaman
4. Verify: Urutan tersimpan dengan benar dan tidak ada frame hilang

## 🚀 Deployment Notes

### Production Checklist
- [x] Backup database sebelum deploy
- [x] Test di staging environment terlebih dahulu
- [ ] Monitor performance setelah deploy (query tanpa LIMIT bisa lebih lambat)
- [ ] Jika ada >1000 frames, consider menambahkan pagination khusus untuk admin

### Performance Considerations

**Jika jumlah frames sangat banyak (>500 frames)**:
- Consider menambahkan pagination di halaman admin
- Atau tambahkan lazy loading untuk kategori
- Monitor query performance di database

**Contoh query optimization** (jika diperlukan di masa depan):
```sql
-- Add index untuk display_order jika belum ada
CREATE INDEX IF NOT EXISTS idx_frames_display_order ON frames(display_order ASC, created_at DESC);
```

## 📝 Additional Notes

### Tidak Ada Hard Limit 50
- Tidak ada batasan "maksimal 50 frames per halaman" yang hard-coded
- Bug ini murni disebabkan oleh pagination default yang tidak sesuai untuk admin panel
- Database bisa menyimpan unlimited frames (tergantung kapasitas server)

### Frontend Sudah Benar
Frontend sudah memanggil API dengan benar tanpa mengirim parameter `limit`:
```javascript
const data = await unifiedFrameService.getAllFrames({ includeHidden: true });
```

Masalah hanya di sisi backend yang memaksakan default limit.

## 🔗 Related Files

- `backend/src/routes/frames.js` - File yang di-fix
- `my-app/src/pages/admin/AdminFrames.jsx` - Admin UI untuk mengelola frames
- `my-app/src/services/unifiedFrameService.js` - Service layer frontend

## 📅 Timeline

- **24 Desember 2024**: Bug discovered dan fixed
- **Status**: ✅ Fixed dan ready for deployment

---

**Created by**: GitHub Copilot  
**Date**: 24 Desember 2024  
**Version**: 1.0
