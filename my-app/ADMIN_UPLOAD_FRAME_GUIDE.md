# Panduan Dashboard Admin Fremio

## Login Admin

Untuk mengakses dashboard admin, gunakan kredensial berikut:

- **Email**: `admin@admin.com`
- **Password**: `admin`

## Akses Dashboard

1. Buka halaman login di `/login`
2. Masukkan email: `admin@admin.com` dan password: `admin`
3. Setelah login, Anda akan diarahkan ke dashboard admin yang terpisah dari tampilan user

## Fitur Dashboard Admin

### Layout Khusus Admin

Dashboard admin memiliki layout tersendiri dengan:

- **Sidebar Navigasi** (warna ungu) dengan menu:

  - Dashboard - Overview statistik
  - Manage Frames - Kelola frame
  - Upload Frame - Upload frame baru
  - Applications - Kelola aplikasi kreator
  - Users - Kelola user
  - Settings - Pengaturan

- **Top Bar** - Menampilkan judul halaman dan info admin
- **Footer** - Info version

### Halaman Upload Frame

Fitur untuk upload frame PNG dengan konfigurasi slot foto:

#### Cara Menggunakan:

1. Login sebagai admin
2. Klik menu "Upload Frame" di sidebar
3. Isi informasi frame:

   - Nama Frame (wajib)
   - Deskripsi (opsional)
   - Kategori (Custom/Fremio Series/Inspired By/Seasonal)
   - Jumlah Foto (1-10)
   - Duplikat Foto (checkbox)

4. Upload gambar PNG frame:

   - Klik area upload
   - Pilih file PNG (rekomendasi 1080x1920px)
   - Preview akan muncul

5. Konfigurasi Slot Foto:

   - Klik "Tambah Slot" untuk menambah slot
   - Atur posisi dan ukuran slot dengan nilai 0.0 - 1.0:
     - **Kiri**: Posisi horizontal (0.0 = kiri, 1.0 = kanan)
     - **Atas**: Posisi vertical (0.0 = atas, 1.0 = bawah)
     - **Lebar**: Lebar slot (0.0 - 1.0)
     - **Tinggi**: Tinggi slot (0.0 - 1.0)
   - Pilih aspect ratio foto
   - Pilih index foto (Foto 1, 2, 3, dst)

6. Live Preview:

   - Klik "Tampilkan" untuk melihat preview
   - Slot akan ditampilkan sebagai kotak biru di atas frame
   - Label menunjukkan nomor slot dan foto yang digunakan

7. Simpan:
   - Klik "Simpan Frame" setelah selesai konfigurasi
   - Frame akan disimpan ke LocalStorage atau Firebase (jika dikonfigurasi)

## Contoh Konfigurasi Slot

### Frame 3 Foto dengan Duplikat (6 Slot Total)

```
Foto 1 (2 copy):
- Slot 1: Kiri=0.05, Atas=0.03, Lebar=0.41, Tinggi=0.28, Index=0
- Slot 2: Kiri=0.545, Atas=0.03, Lebar=0.41, Tinggi=0.28, Index=0

Foto 2 (2 copy):
- Slot 3: Kiri=0.05, Atas=0.33, Lebar=0.41, Tinggi=0.28, Index=1
- Slot 4: Kiri=0.545, Atas=0.33, Lebar=0.41, Tinggi=0.28, Index=1

Foto 3 (2 copy):
- Slot 5: Kiri=0.05, Atas=0.63, Lebar=0.41, Tinggi=0.28, Index=2
- Slot 6: Kiri=0.545, Atas=0.63, Lebar=0.41, Tinggi=0.28, Index=2
```

## Tips Konfigurasi Slot

### Nilai Posisi (0.0 - 1.0)

- `0.0` = 0% (paling kiri/atas)
- `0.5` = 50% (tengah)
- `1.0` = 100% (paling kanan/bawah)

### Contoh Posisi Umum:

- **Kiri atas**: Kiri=0.05, Atas=0.05
- **Kanan atas**: Kiri=0.55, Atas=0.05
- **Kiri tengah**: Kiri=0.05, Atas=0.40
- **Kanan tengah**: Kiri=0.55, Atas=0.40
- **Kiri bawah**: Kiri=0.05, Atas=0.70
- **Kanan bawah**: Kiri=0.55, Atas=0.70

### Ukuran untuk 2 Kolom:

- Lebar per kolom: `0.41` (dengan margin)
- Kolom kiri: Kiri=`0.05`
- Kolom kanan: Kiri=`0.545`

### Ukuran untuk 3 Baris:

- Tinggi per baris: `0.28` (dengan margin)
- Baris 1: Atas=`0.03`
- Baris 2: Atas=`0.33`
- Baris 3: Atas=`0.63`

## Navigasi Admin

- `/admin/dashboard` - Dashboard utama
- `/admin/frames` - Kelola frame
- `/admin/upload-frame` - Upload frame baru
- `/admin/applications` - Kelola aplikasi
- `/admin/users` - Kelola user (coming soon)
- `/admin/settings` - Pengaturan (coming soon)

## Mode LocalStorage

Jika Firebase belum dikonfigurasi:

- Frame disimpan di `localStorage` dengan key `custom_frames`
- Data akan hilang jika browser cache dibersihkan
- Cocok untuk testing dan development

## Logout

Klik tombol "Logout" di bagian bawah sidebar untuk keluar dari admin panel.

---

**Version**: 1.0.0  
**Last Updated**: November 16, 2024
