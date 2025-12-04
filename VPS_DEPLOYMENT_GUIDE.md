# 🚀 FREMIO VPS DEPLOYMENT GUIDE

Panduan lengkap untuk deploy Fremio ke VPS Hostinger.

## 📋 Prerequisites

- VPS dengan Ubuntu 22.04+ atau Debian 11+
- Domain yang sudah pointing ke IP VPS
- SSH access ke VPS

---

## 🔧 Step 1: Initial VPS Setup

### 1.1 Connect to VPS
```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Upload Setup Script
```bash
# From your local machine
scp deploy/setup-vps.sh root@YOUR_VPS_IP:/root/
```

### 1.3 Run Setup Script
```bash
chmod +x /root/setup-vps.sh
./setup-vps.sh
```

Script ini akan install:
- Node.js 20
- PostgreSQL
- Nginx
- PM2
- Certbot (SSL)
- UFW Firewall

⚠️ **SIMPAN DATABASE CREDENTIALS** yang muncul di akhir script!

---

## 📦 Step 2: Upload Code

### 2.1 Upload dari Local Machine
```bash
# Upload semua file
scp -r fremio/* root@YOUR_VPS_IP:/var/www/fremio/
```

### 2.2 Set Permissions
```bash
chown -R fremio:fremio /var/www/fremio
chmod -R 755 /var/www/fremio
```

---

## 🗄️ Step 3: Setup Database

### 3.1 Import Schema
```bash
sudo -u postgres psql -d fremio -f /var/www/fremio/database/schema.sql
```

### 3.2 (Optional) Import Seed Data
```bash
sudo -u postgres psql -d fremio -f /var/www/fremio/database/seed.sql
```

### 3.3 Verify Database
```bash
sudo -u postgres psql -d fremio -c "SELECT * FROM users;"
```

---

## ⚙️ Step 4: Configure Backend

### 4.1 Create .env File
```bash
nano /var/www/fremio/backend/.env
```

Isi dengan:
```env
NODE_ENV=production
PORT=3000

# Database (dari setup script)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fremio
DB_USER=fremio_user
DB_PASSWORD=PASSWORD_DARI_SETUP_SCRIPT

# JWT (generate random)
JWT_SECRET=your-random-64-char-secret-here
JWT_EXPIRES_IN=7d

# Upload
UPLOAD_MAX_SIZE=10485760
ALLOWED_EXTENSIONS=jpg,jpeg,png,webp,gif

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4.2 Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4.3 Install Dependencies
```bash
cd /var/www/fremio/backend
npm install --production
```

---

## 🎨 Step 5: Build Frontend

### 5.1 Configure Frontend .env
```bash
nano /var/www/fremio/my-app/.env
```

Isi dengan:
```env
VITE_API_URL=https://yourdomain.com/api
VITE_APP_NAME=Fremio
VITE_ENV=production
```

### 5.2 Install & Build
```bash
cd /var/www/fremio/my-app
npm install
npm run build
```

### 5.3 Copy Build to Frontend Folder
```bash
cp -r dist/* /var/www/fremio/frontend/
```

---

## 🔒 Step 6: Setup SSL

### 6.1 Get SSL Certificate
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6.2 Auto-renewal Test
```bash
certbot renew --dry-run
```

---

## 🌐 Step 7: Configure Nginx

### 7.1 Edit Nginx Config
```bash
nano /var/www/fremio/deploy/nginx.conf
# Replace YOUR_DOMAIN with your actual domain
```

### 7.2 Copy Config
```bash
cp /var/www/fremio/deploy/nginx.conf /etc/nginx/sites-available/fremio
ln -s /etc/nginx/sites-available/fremio /etc/nginx/sites-enabled/
```

### 7.3 Add Rate Limiting
```bash
nano /etc/nginx/nginx.conf
```

Tambahkan di dalam `http {}` block:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

### 7.4 Test & Restart
```bash
nginx -t
systemctl restart nginx
```

---

## 🚀 Step 8: Start Backend

### 8.1 Start with PM2
```bash
cd /var/www/fremio/backend
pm2 start ecosystem.config.js --env production
```

### 8.2 Save PM2 Config
```bash
pm2 save
```

### 8.3 Verify Running
```bash
pm2 status
pm2 logs fremio-backend
```

---

## ✅ Step 9: Verify Deployment

### 9.1 Check Backend Health
```bash
curl http://localhost:3000/api/health
```

### 9.2 Check Frontend
Open browser: `https://yourdomain.com`

### 9.3 Test API
```bash
curl https://yourdomain.com/api/frames
```

### 9.4 Test Login
```bash
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fremio.com","password":"admin123"}'
```

---

## 🔧 Maintenance Commands

### View Logs
```bash
pm2 logs fremio-backend
tail -f /var/log/nginx/fremio_access.log
tail -f /var/log/nginx/fremio_error.log
```

### Restart Backend
```bash
pm2 restart fremio-backend
```

### Restart Nginx
```bash
systemctl restart nginx
```

### Update Code
```bash
cd /var/www/fremio
git pull  # atau upload files baru

# Backend
cd backend && npm install
pm2 restart fremio-backend

# Frontend
cd ../my-app && npm install && npm run build
cp -r dist/* /var/www/fremio/frontend/
```

### Backup Database
```bash
pg_dump -U fremio_user fremio > backup_$(date +%Y%m%d).sql
```

---

## 🔐 Default Admin Credentials

- **Email:** admin@fremio.com
- **Password:** admin123

⚠️ **GANTI PASSWORD ADMIN SETELAH DEPLOY!**

---

## ❓ Troubleshooting

### Backend tidak bisa connect ke database
```bash
# Check PostgreSQL running
systemctl status postgresql

# Check connection
sudo -u postgres psql -d fremio
```

### Permission denied pada uploads
```bash
chmod -R 755 /var/www/fremio/backend/uploads
chown -R fremio:fremio /var/www/fremio/backend/uploads
```

### 502 Bad Gateway
```bash
# Check if backend running
pm2 status

# Check logs
pm2 logs fremio-backend
```

### SSL Certificate Error
```bash
certbot renew --force-renewal
systemctl restart nginx
```

---

## 📂 Directory Structure (on VPS)

```
/var/www/fremio/
├── frontend/           # Built React app
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── config/
│   │   ├── middleware/
│   │   └── routes/
│   ├── uploads/
│   │   ├── frames/
│   │   └── thumbnails/
│   └── .env
├── database/
│   ├── schema.sql
│   └── seed.sql
└── deploy/
    ├── nginx.conf
    └── setup-vps.sh
```

---

Created with ❤️ for Fremio
