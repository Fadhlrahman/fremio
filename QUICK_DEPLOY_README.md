# 🚀 QUICK START - DEPLOYMENT KE SERVER BARU

## 📌 Ringkasan Cepat

**Server Lama:** 72.61.214.5 (tidak dapat diakses)  
**Server Baru:** 76.13.192.32 (Hostinger)  
**Strategy:** Fresh deployment (bukan migrasi)

---

## ⚡ Cara Tercepat (Recommended)

Jalankan satu command ini:

```bash
./quick-deploy.sh
```

Script ini akan:
1. ✅ Setup environment files otomatis
2. ✅ Bersihkan server baru
3. ✅ Deploy seluruh aplikasi

**Durasi:** ~15-20 menit

---

## 📋 Manual Step-by-Step (Jika Perlu Kontrol Lebih)

### 1️⃣ Setup Environment Files

```bash
./prepare-env-files.sh
```

Edit jika perlu:
- `backend/.env` - JWT secret & frontend URL
- `my-app/.env` - App URL

### 2️⃣ Bersihkan Server Baru

```bash
./clean-new-server.sh
```

⚠️ Akan menghapus SEMUA data di server 76.13.192.32

### 3️⃣ Deploy ke Server

```bash
./deploy-to-new-server.sh
```

Deploy frontend, backend, database, dan semua konfigurasi.

---

## 🔍 Verifikasi Deployment

```bash
# Test di browser
open http://76.13.192.32

# Test API
curl http://76.13.192.32/api/health
```

---

## 📖 Dokumentasi Lengkap

Baca [DEPLOYMENT_NEW_SERVER.md](DEPLOYMENT_NEW_SERVER.md) untuk:
- Troubleshooting
- Setup domain & SSL
- Update payment gateway
- Monitoring & maintenance

---

## 🆘 Troubleshooting Cepat

### Backend tidak jalan:
```bash
ssh root@76.13.192.32 'pm2 logs fremio-api'
ssh root@76.13.192.32 'pm2 restart fremio-api'
```

### Nginx error:
```bash
ssh root@76.13.192.32 'nginx -t'
ssh root@76.13.192.32 'systemctl restart nginx'
```

### Database error:
```bash
ssh root@76.13.192.32
sudo -u postgres psql -d fremio
\dt
```

---

## 📁 File Penting

| File | Deskripsi |
|------|-----------|
| `quick-deploy.sh` | All-in-one deployment script |
| `prepare-env-files.sh` | Setup .env files |
| `clean-new-server.sh` | Bersihkan server baru |
| `deploy-to-new-server.sh` | Deploy aplikasi |
| `DEPLOYMENT_NEW_SERVER.md` | Dokumentasi lengkap |
| `.db_credentials` | Password database (dibuat saat deploy) |

---

## ✅ Checklist

- [ ] SSH ke server baru berhasil: `ssh root@76.13.192.32`
- [ ] Jalankan `./quick-deploy.sh`
- [ ] Buka http://76.13.192.32 di browser
- [ ] Test register & login
- [ ] Simpan file `.db_credentials`
- [ ] (Opsional) Setup domain & SSL
- [ ] (Opsional) Update Midtrans webhook

---

**🎉 Selamat Deploy!**
