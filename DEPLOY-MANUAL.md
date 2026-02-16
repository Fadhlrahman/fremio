# 🚀 Manual Deployment Guide

## Karena SSH dari Mac timeout, pakai Hostinger Web Terminal

### 📋 Steps (Copy-paste satu per satu):

#### 1️⃣ Masuk ke Hostinger Dashboard
- Buka: https://hpanel.hostinger.com
- Klik VPS kamu
- Klik **"Web SSH"** atau **"Terminal"**

---

#### 2️⃣ Pull Code Terbaru (di terminal server)

```bash
cd /root/fremio
git pull origin main
```

**Output yang benar:**
```
From https://github.com/Fadhlrahman/fremio
 * branch            main       -> FETCH_HEAD
Updating 7b6435c..6d3bd56
Fast-forward
```

Cek hash build baru:
```bash
ls -la /root/fremio/my-app/dist/assets/index-*.js
```

**Harus tampil:** `index-mlmb9o9k-B_veT1i3.js` (hash baru!)

---

#### 3️⃣ Deploy Frontend (copy files ke Nginx directory)

```bash
cp -r /root/fremio/my-app/dist/* /var/www/fremio/frontend/
```

**Output:** (tidak ada error berarti sukses)

Verify deployment:
```bash
ls -la /var/www/fremio/frontend/assets/index-*.js
```

**Harus tampil:** `index-mlmb9o9k-B_veT1i3.js` (sama seperti di atas!)

---

#### 4️⃣ Verifikasi Backend (tidak perlu restart, sudah jalan)

```bash
pm2 status
```

**Output yang benar:**
```
┌────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┐
│ id │ name        │ namespace   │ version │ mode    │ pid      │ status │
├────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┤
│ 0  │ fremio-back │ default     │ N/A     │ cluster │ 1234     │ online │
│ 1  │ fremio-back │ default     │ N/A     │ cluster │ 5678     │ online │
└────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┘
```

✅ Kalau status `online` → Backend OK, tidak perlu restart!

---

## 🧪 Testing

### 1. Buka Browser (Incognito/Private Mode)
- URL: https://fremio.id
- **PENTING:** Tekan **Cmd+Shift+R** (Mac) atau **Ctrl+Shift+R** (Windows) untuk hard refresh!

### 2. Buka Browser Console
- Tekan F12 atau Cmd+Option+I
- Tab **Console**
- Cari log: `📡 VPS API URL: /api`

**✅ SUKSES kalau muncul:**
```
📡 VPS API URL: /api
```

**❌ GAGAL kalau masih muncul:**
```
📡 VPS API URL: https://api.fremio.id/api
```

Kalau masih gagal → Clear browser cache completely atau coba browser lain!

---

## 🔍 Troubleshooting

### Web Terminal Bermasalah?
Kalau text jadi invisible atau freeze:
1. Jangan switch tab
2. Copy-paste command langsung
3. Jangan scroll terlalu banyak
4. Kalau frozen → Refresh halaman, mulai lagi dari Step 2

### File Hash Tidak Berubah?
```bash
# Force pull
cd /root/fremio
git reset --hard HEAD
git pull origin main
```

### Frontend Masih Pakai Hash Lama?
```bash
# Delete semua file lama
rm -rf /var/www/fremio/frontend/*

# Copy ulang
cp -r /root/fremio/my-app/dist/* /var/www/fremio/frontend/

# Verify
ls -la /var/www/fremio/frontend/assets/
```

---

## 📝 Summary

**Backend:** Tidak perlu deploy, sudah running di PM2 ✅  
**Frontend:** Cukup copy `dist/*` ke `/var/www/fremio/frontend/` ✅  
**Cloudflare:** Hanya DNS+SSL, tidak perlu deploy ke Cloudflare Pages ✅

**Total waktu:** ~2 menit  
**Commands yang perlu dijalankan:** 3 commands saja!

---

## ⚠️ PENTING: Tentang .env.production

File yang diperbaiki:
- `/root/fremio/my-app/.env.production`
- Isinya sekarang: `VITE_API_URL=/api` (BUKAN `https://api.fremio.id/api`)

Ini yang menyebabkan masalah sebelumnya! Sekarang sudah fixed di GitHub.
