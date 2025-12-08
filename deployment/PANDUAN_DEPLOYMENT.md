# 📚 PANDUAN DEPLOYMENT FREMIO
## Arsitektur VPS-Centric untuk 10.000+ Concurrent Users

---

## 📋 DAFTAR ISI

1. [Persiapan](#1-persiapan)
2. [Pembelian VPS](#2-pembelian-vps)
3. [Setup Database Server](#3-setup-database-server-vps-5)
4. [Setup File Storage](#4-setup-file-storage-vps-6)
5. [Setup App Servers](#5-setup-app-servers-vps-234)
6. [Setup Load Balancer](#6-setup-load-balancer-vps-1)
7. [Deploy Aplikasi](#7-deploy-aplikasi)
8. [Konfigurasi DNS & SSL](#8-konfigurasi-dns--ssl)
9. [Testing & Monitoring](#9-testing--monitoring)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. PERSIAPAN

### 1.1 Arsitektur Sistem

```
                    ┌─────────────────────┐
                    │    Internet/Users   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   VPS 1: Nginx LB   │
                    │   (Load Balancer)   │
                    │   + SSL Termination │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼─────────┐ ┌────────▼────────┐ ┌────────▼────────┐
│  VPS 2: App #1    │ │  VPS 3: App #2  │ │  VPS 4: App #3  │
│  Node.js + PM2    │ │  Node.js + PM2  │ │  Node.js + PM2  │
└─────────┬─────────┘ └────────┬────────┘ └────────┬────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
┌─────────▼─────────┐                    ┌──────────▼──────────┐
│  VPS 5: Database  │                    │  VPS 6: File Store  │
│  PostgreSQL+Redis │                    │  Nginx Static Files │
└───────────────────┘                    └─────────────────────┘
```

### 1.2 Spesifikasi VPS

| VPS | Fungsi | RAM | CPU | Storage | Harga/Bulan |
|-----|--------|-----|-----|---------|-------------|
| 1 | Load Balancer | 4GB | 2 vCPU | 50GB SSD | Rp 110.000 |
| 2 | App Server #1 | 8GB | 4 vCPU | 100GB SSD | Rp 230.000 |
| 3 | App Server #2 | 8GB | 4 vCPU | 100GB SSD | Rp 230.000 |
| 4 | App Server #3 | 8GB | 4 vCPU | 100GB SSD | Rp 230.000 |
| 5 | Database | 8GB | 4 vCPU | 200GB NVMe | Rp 290.000 |
| 6 | File Storage | 4GB | 2 vCPU | 400GB SSD | Rp 450.000 |
| **Total** | | | | | **Rp 1.540.000** |

### 1.3 Checklist Sebelum Mulai

- [ ] Domain sudah dibeli dan aktif
- [ ] Akun Hostinger Indonesia sudah dibuat
- [ ] File deployment sudah di-download dari repository
- [ ] SSH key sudah di-generate (optional tapi recommended)

---

## 2. PEMBELIAN VPS

### 2.1 Beli VPS di Hostinger Indonesia

1. Kunjungi [Hostinger Indonesia](https://www.hostinger.co.id/vps-murah)
2. Pilih paket sesuai spesifikasi di atas
3. Pilih lokasi server: **Singapore** (terdekat untuk Indonesia)
4. Pilih OS: **Ubuntu 22.04 LTS**
5. Bayar dengan:
   - Transfer Bank (BCA, Mandiri, BNI, BRI)
   - GoPay
   - OVO
   - DANA

### 2.2 Catat IP Address

Setelah VPS aktif, catat semua IP:

```
VPS 1 (Load Balancer):  ________________
VPS 2 (App Server 1):   ________________
VPS 3 (App Server 2):   ________________
VPS 4 (App Server 3):   ________________
VPS 5 (Database):       ________________
VPS 6 (File Storage):   ________________
```

### 2.3 Akses SSH Pertama Kali

```bash
# Login ke setiap VPS
ssh root@<IP_VPS>

# Update sistem
apt update && apt upgrade -y

# Set timezone Indonesia
timedatectl set-timezone Asia/Jakarta
```

---

## 3. SETUP DATABASE SERVER (VPS 5)

### 3.1 Upload dan Jalankan Script

```bash
# Dari komputer lokal, upload script
scp deployment/scripts/03-setup-database.sh root@<VPS_5_IP>:/root/

# Login ke VPS 5
ssh root@<VPS_5_IP>

# Jalankan script
chmod +x /root/03-setup-database.sh
./03-setup-database.sh
```

### 3.2 Catat Password Database

Script akan generate password. **CATAT DAN SIMPAN!**

```
Database Password: ________________________________
```

Password juga tersimpan di `/root/db_password.txt`

### 3.3 Update Allowed IPs

Setelah semua VPS aktif, update IP yang diizinkan:

```bash
/root/update-allowed-ips.sh <APP1_IP> <APP2_IP> <APP3_IP>
```

---

## 4. SETUP FILE STORAGE (VPS 6)

### 4.1 Upload dan Jalankan Script

```bash
# Upload script
scp deployment/scripts/04-setup-filestorage.sh root@<VPS_6_IP>:/root/

# Login ke VPS 6
ssh root@<VPS_6_IP>

# Jalankan script
chmod +x /root/04-setup-filestorage.sh
./04-setup-filestorage.sh
```

### 4.2 Upload Frame Assets

```bash
# Dari komputer lokal, upload frame images
scp -r my-app/public/frames/* root@<VPS_6_IP>:/var/www/storage/uploads/frames/
```

### 4.3 Update Firewall

```bash
/root/update-firewall-ips.sh <LB_IP> <APP1_IP> <APP2_IP> <APP3_IP>
```

---

## 5. SETUP APP SERVERS (VPS 2,3,4)

### 5.1 Upload dan Jalankan Script di Setiap App Server

```bash
# Upload script ke setiap App Server
scp deployment/scripts/02-setup-appserver.sh root@<VPS_2_IP>:/root/
scp deployment/scripts/02-setup-appserver.sh root@<VPS_3_IP>:/root/
scp deployment/scripts/02-setup-appserver.sh root@<VPS_4_IP>:/root/

# Login dan jalankan di masing-masing VPS
ssh root@<VPS_X_IP>
chmod +x /root/02-setup-appserver.sh
./02-setup-appserver.sh
```

### 5.2 Upload Backend Code

```bash
# Dari komputer lokal
cd /path/to/fremio/backend

# Install dependencies lokal dulu
npm install

# Upload ke setiap App Server
rsync -avz --exclude 'node_modules' --exclude '.env' \
  ./ root@<VPS_2_IP>:/var/www/fremio-backend/

rsync -avz --exclude 'node_modules' --exclude '.env' \
  ./ root@<VPS_3_IP>:/var/www/fremio-backend/

rsync -avz --exclude 'node_modules' --exclude '.env' \
  ./ root@<VPS_4_IP>:/var/www/fremio-backend/
```

### 5.3 Update Konfigurasi di Setiap App Server

```bash
# Login ke setiap App Server
ssh root@<VPS_X_IP>

# Update konfigurasi
/root/update-config.sh <DATABASE_IP> <FILE_STORAGE_IP> <YOUR_DOMAIN> <DB_PASSWORD>

# PENTING: Catat JWT_SECRET yang di-generate!
# Gunakan JWT_SECRET yang SAMA untuk semua App Server
```

**⚠️ PENTING:** JWT_SECRET harus sama di semua App Server!

Di App Server kedua dan ketiga, edit manual:
```bash
nano /var/www/fremio-backend/.env
# Ganti JWT_SECRET dengan yang dari App Server pertama
```

### 5.4 Install Dependencies dan Start

```bash
# Di setiap App Server
cd /var/www/fremio-backend
npm install --production

# Start aplikasi
pm2 start ecosystem.config.js
pm2 save

# Cek status
pm2 status
pm2 logs
```

---

## 6. SETUP LOAD BALANCER (VPS 1)

### 6.1 Upload dan Jalankan Script

```bash
# Upload script
scp deployment/scripts/01-setup-loadbalancer.sh root@<VPS_1_IP>:/root/

# Login ke VPS 1
ssh root@<VPS_1_IP>

# Jalankan script
chmod +x /root/01-setup-loadbalancer.sh
./01-setup-loadbalancer.sh
```

### 6.2 Update IP Servers

```bash
/root/update-servers.sh <APP1_IP> <APP2_IP> <APP3_IP> <FILE_STORAGE_IP> <YOUR_DOMAIN>
```

### 6.3 Upload Frontend Build

```bash
# Dari komputer lokal, build frontend
cd /path/to/fremio/my-app
npm run build

# Upload ke Load Balancer
scp -r dist/* root@<VPS_1_IP>:/var/www/fremio/dist/
```

---

## 7. DEPLOY APLIKASI

### 7.1 Update Environment Variables

Edit file `.env` di setiap App Server dengan nilai yang benar:

```bash
nano /var/www/fremio-backend/.env
```

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://fremio_user:<PASSWORD>@<VPS_5_IP>:5432/fremio_db

# Redis
REDIS_URL=redis://<VPS_5_IP>:6379

# JWT (HARUS SAMA DI SEMUA APP SERVER!)
JWT_SECRET=<JWT_SECRET_DARI_APP_SERVER_1>

# File Storage
FILE_STORAGE_URL=http://<VPS_6_IP>/uploads
FILE_STORAGE_PATH=/var/www/fremio-backend/uploads

# CORS
CORS_ORIGIN=https://<YOUR_DOMAIN>

# Firebase (jika digunakan)
# FIREBASE_PROJECT_ID=...
```

### 7.2 Restart Semua App Servers

```bash
# Di setiap App Server
pm2 restart all
pm2 save
```

---

## 8. KONFIGURASI DNS & SSL

### 8.1 Setting DNS

Di domain registrar Anda, tambahkan A Record:

| Type | Name | Value |
|------|------|-------|
| A | @ | <VPS_1_IP> (Load Balancer) |
| A | www | <VPS_1_IP> (Load Balancer) |

### 8.2 Setup SSL dengan Let's Encrypt

```bash
# Di VPS 1 (Load Balancer)
# Pastikan DNS sudah propagate (cek dengan: dig yourdomain.com)

# Install SSL
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Ikuti instruksi:
# - Masukkan email untuk notifikasi
# - Agree Terms of Service
# - Pilih redirect HTTP ke HTTPS

# Test auto-renewal
certbot renew --dry-run
```

### 8.3 Restart Nginx

```bash
nginx -t
systemctl restart nginx
```

---

## 9. TESTING & MONITORING

### 9.1 Test Endpoint

```bash
# Test health check
curl https://yourdomain.com/health

# Test API
curl https://yourdomain.com/api/frames

# Test dari browser
# Buka https://yourdomain.com
```

### 9.2 Monitor Logs

```bash
# Di App Server
pm2 logs
tail -f /var/www/fremio-backend/logs/combined.log

# Di Load Balancer
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Di Database
tail -f /var/log/postgresql/postgresql-15-main.log
```

### 9.3 Monitor Resources

```bash
# CPU & Memory
htop

# PM2 Dashboard
pm2 monit

# Nginx status (di Load Balancer)
curl http://localhost/nginx_status
```

### 9.4 Setup UptimeRobot (Gratis)

1. Daftar di [UptimeRobot](https://uptimerobot.com)
2. Tambahkan monitor:
   - Type: HTTP(s)
   - URL: https://yourdomain.com/health
   - Monitoring Interval: 5 minutes
3. Setup alert via:
   - Email
   - Telegram Bot

---

## 10. TROUBLESHOOTING

### 10.1 Aplikasi Tidak Bisa Diakses

```bash
# Cek Nginx
systemctl status nginx
nginx -t

# Cek PM2
pm2 status
pm2 logs

# Cek firewall
ufw status
```

### 10.2 Database Connection Error

```bash
# Test koneksi dari App Server
psql -h <DATABASE_IP> -U fremio_user -d fremio_db

# Cek PostgreSQL status
systemctl status postgresql

# Cek pg_hba.conf
cat /etc/postgresql/15/main/pg_hba.conf
```

### 10.3 Upload Tidak Berfungsi

```bash
# Cek permission
ls -la /var/www/storage/uploads/

# Cek Nginx error log
tail -f /var/log/nginx/error.log

# Cek disk space
df -h
```

### 10.4 SSL Certificate Error

```bash
# Renew certificate
certbot renew

# Check certificate
certbot certificates

# Force renewal
certbot renew --force-renewal
```

### 10.5 High CPU/Memory Usage

```bash
# Cek process
htop
pm2 monit

# Restart aplikasi
pm2 restart all

# Clear Redis cache jika perlu
redis-cli FLUSHDB
```

---

## 📞 SUPPORT

Jika mengalami masalah, cek:
1. Log files di masing-masing server
2. Status semua services
3. Firewall rules
4. Network connectivity antar VPS

---

## 📝 MAINTENANCE RUTIN

### Harian
- Cek disk usage
- Review error logs
- Monitor uptime

### Mingguan
- Update packages: `apt update && apt upgrade`
- Review access logs
- Check backup status

### Bulanan
- SSL certificate renewal check
- Performance review
- Security audit

---

## 🎉 SELAMAT!

Aplikasi Fremio Anda sekarang sudah deploy dan siap menangani 10.000+ concurrent users!

**Kapasitas Perkiraan:**
- 10.000 - 15.000 concurrent users
- 100.000+ daily active users
- 1.000+ requests per second

**Monthly Cost:** Rp 1.540.000/bulan

---

*Dokumentasi ini dibuat untuk Fremio Deployment v1.0*
*Terakhir diupdate: Januari 2025*
