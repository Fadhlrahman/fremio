# 🚀 PANDUAN DEPLOYMENT KE SERVER BARU

## 📋 Informasi Server

- **Server Lama:** 72.61.214.5 (tidak dapat diakses)
- **Server Baru:** 76.13.192.32 (Hostinger)
- **Akses SSH:** `ssh root@76.13.192.32`
- **Strategy:** Fresh deployment (bukan migrasi)

---

## ⚠️ PENTING: Sebelum Memulai

### 1. Backup Data Lokal (Jika Ada)
```bash
# Backup database lokal (jika perlu)
pg_dump fremio > backup_local_$(date +%Y%m%d).sql

# Backup uploads folder
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz my-app/public/uploads/ 2>/dev/null || true
```

### 2. Siapkan Environment Files

**PENTING:** Copy template files dan sesuaikan dengan kebutuhan production:

```bash
# Backend
cp backend/.env.production.template backend/.env
nano backend/.env  # Edit: JWT_SECRET, FRONTEND_URL, dll

# Frontend  
cp my-app/.env.production.template my-app/.env
nano my-app/.env  # Sesuaikan jika perlu
```

**Yang HARUS diganti di backend/.env:**
- `JWT_SECRET` - Generate random string yang aman
- `FRONTEND_URL` - Update setelah domain ready
- `ALLOWED_ORIGINS` - Tambahkan domain production

### 3. Test SSH Connection

```bash
ssh root@76.13.192.32
# Jika berhasil, ketik 'exit' untuk keluar
```

---

## 🎯 Langkah-Langkah Deployment

### STEP 1: Bersihkan Server Baru

Script ini akan menghapus SEMUA data lama di server baru:

```bash
# Buat script executable
chmod +x clean-new-server.sh

# Jalankan script (akan minta konfirmasi 2x)
./clean-new-server.sh
```

**Script akan menghapus:**
- ✅ Semua aplikasi Node.js dan PM2 processes
- ✅ Database PostgreSQL dan semua data
- ✅ File aplikasi di /var/www/, /root/, dll
- ✅ Konfigurasi Nginx
- ✅ Log files
- ✅ User fremio
- ✅ Crontab entries

**Durasi:** ~2-3 menit

---

### STEP 2: Deploy Fresh ke Server Baru

```bash
# Buat script executable
chmod +x deploy-to-new-server.sh

# Jalankan deployment
./deploy-to-new-server.sh
```

**Script akan:**
1. ✅ Check pre-deployment (SSH, .env files, dll)
2. ✅ Build frontend (my-app/dist)
3. ✅ Prepare backend dependencies
4. ✅ Setup VPS infrastructure (Node.js, PostgreSQL, Nginx, PM2)
5. ✅ Create database dengan user baru
6. ✅ Import database schema & seed data
7. ✅ Upload backend files
8. ✅ Upload frontend build
9. ✅ Install backend dependencies di VPS
10. ✅ Configure PM2 untuk auto-restart
11. ✅ Setup Nginx sebagai reverse proxy
12. ✅ Set permissions
13. ✅ Configure firewall

**Durasi:** ~10-15 menit

**Output:**
- Database credentials akan disimpan di file `.db_credentials`
- Deployment summary dengan semua informasi penting

---

## 🔍 Verifikasi Deployment

### 1. Check Services di Server

```bash
# SSH ke server
ssh root@76.13.192.32

# Check PM2 status
pm2 status
pm2 logs fremio-api --lines 50

# Check Nginx
systemctl status nginx

# Check database
sudo -u postgres psql -d fremio -c "SELECT COUNT(*) FROM users;"

# Exit
exit
```

### 2. Test dari Browser

```bash
# Test frontend
open http://76.13.192.32

# Test API health
curl http://76.13.192.32/api/health

# Test API direct
curl http://76.13.192.32:5050/api/health
```

### 3. Test Fitur Utama

- ✅ Register user baru
- ✅ Login
- ✅ Upload foto
- ✅ Create frame/template
- ✅ Test payment flow (gunakan Midtrans sandbox card)

---

## 🔐 Update Domain & SSL (Setelah Server Stabil)

### 1. Update DNS Domain

Di dashboard domain provider (Hostinger/Cloudflare/dll):

```
Type: A
Name: @ (atau fremio.id)
Value: 76.13.192.32
TTL: 3600
```

Tunggu DNS propagation (~5-30 menit).

### 2. Install SSL Certificate

```bash
ssh root@76.13.192.32

# Install Certbot (jika belum ada)
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d fremio.id -d www.fremio.id

# Auto-renewal akan di-setup otomatis
certbot renew --dry-run
```

### 3. Update Environment Variables

Setelah domain & SSL aktif, update .env files:

**Backend (.env):**
```bash
ssh root@76.13.192.32
nano /var/www/fremio/backend/.env

# Update:
FRONTEND_URL=https://fremio.id
ALLOWED_ORIGINS=https://fremio.id,https://www.fremio.id,http://localhost:5180

# Restart backend
pm2 restart fremio-api
```

**Frontend:** Rebuild dengan domain baru:
```bash
# Di local machine
nano my-app/.env
# Update VITE_APP_URL=https://fremio.id

npm run build
rsync -avz my-app/dist/ root@76.13.192.32:/var/www/fremio/frontend/
```

---

## 🔧 Troubleshooting

### Backend Tidak Jalan

```bash
ssh root@76.13.192.32
pm2 logs fremio-api
pm2 restart fremio-api
```

### Database Error

```bash
ssh root@76.13.192.32
sudo -u postgres psql -d fremio

# Check tables
\dt

# Check users
SELECT * FROM users;
```

### Nginx Error

```bash
ssh root@76.13.192.32
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Upload Tidak Jalan

```bash
ssh root@76.13.192.32
ls -la /var/www/fremio/uploads
chmod 775 /var/www/fremio/uploads
chown -R www-data:www-data /var/www/fremio/uploads
```

---

## 📊 Monitoring & Maintenance

### Daily Checks

```bash
# Check server status
ssh root@76.13.192.32 'pm2 status && systemctl status nginx'

# Check logs
ssh root@76.13.192.32 'pm2 logs fremio-api --lines 100'

# Check disk space
ssh root@76.13.192.32 'df -h'
```

### Weekly Maintenance

```bash
ssh root@76.13.192.32

# Update system packages
apt-get update && apt-get upgrade -y

# Restart services
pm2 restart all
systemctl restart nginx

# Clean old logs
pm2 flush
find /var/www/fremio/logs -name "*.log" -mtime +30 -delete
```

---

## 🎯 Payment Gateway Setup

### Update Midtrans Webhook URL

1. Login ke [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Pilih environment (Sandbox/Production)
3. Settings → Configuration → Notification URL
4. Update ke: `https://fremio.id/api/payment/webhook`
5. Save

### Test Payment

Gunakan test cards dari Midtrans:
- **Success:** 4811 1111 1111 1114
- **Pending:** 4911 1111 1111 1113  
- **Failure:** 4411 1111 1111 1118

---

## 📞 Support

Jika ada masalah:
1. Check logs: `ssh root@76.13.192.32 'pm2 logs fremio-api'`
2. Check server status: `ssh root@76.13.192.32 'pm2 status'`
3. Restart services: `ssh root@76.13.192.32 'pm2 restart all'`

---

## 📝 Checklist Deployment

- [ ] Backup data lokal (jika ada)
- [ ] Siapkan .env files (backend & frontend)
- [ ] Test SSH connection ke server baru
- [ ] Jalankan `./clean-new-server.sh`
- [ ] Jalankan `./deploy-to-new-server.sh`
- [ ] Simpan `.db_credentials` file
- [ ] Test frontend di browser
- [ ] Test API endpoints
- [ ] Test register & login
- [ ] Test upload fitur
- [ ] Update DNS ke IP baru
- [ ] Install SSL certificate
- [ ] Update .env dengan domain production
- [ ] Update Midtrans webhook URL
- [ ] Test payment flow
- [ ] Monitor logs selama 24 jam
- [ ] Setup backup automation (optional)

---

**🎉 Selamat! Deployment selesai!**

Server baru Anda sudah ready dengan:
- Frontend served by Nginx
- Backend API dengan PM2 (cluster mode)
- PostgreSQL database
- SSL (setelah setup)
- Auto-restart on crash
- Firewall protection
