# VPS Image Storage Setup Guide

## Overview
Setup VPS sebagai image storage untuk menggantikan ImageKit (tanpa perlu kartu kredit).

**Bandwidth tersedia:** 4TB/bulan  
**Cukup untuk:** ~1.3 juta page views/bulan

## Files yang perlu di-deploy ke VPS

### 1. Backend Files (sudah ada perubahan):

```bash
# SSH ke VPS
ssh root@72.61.210.203

# Masuk ke folder backend
cd /path/to/backend

# Pull changes dari git (jika menggunakan git)
git pull

# Atau copy files manual:
# - backend/routes/static.js (FILE BARU)
# - backend/server.js (UPDATED)

# Install dependencies (jika ada yang baru)
npm install

# Restart backend
pm2 restart backend
# atau
systemctl restart fremio-backend
```

### 2. Buat folder untuk static files:

```bash
# Buat folder untuk frames
mkdir -p /var/www/fremio/backend/public/frames

# Set permissions
chmod 755 /var/www/fremio/backend/public/frames
```

### 3. Configure Nginx untuk serve static files:

Edit `/etc/nginx/sites-available/fremio` atau nginx.conf:

```nginx
server {
    listen 80;
    server_name 72.61.210.203;

    # Serve static files directly (bypass Node.js)
    location /static/ {
        alias /var/www/fremio/backend/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }

    # API proxy to Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        
        # Increase body size for file uploads
        client_max_body_size 20M;
    }
}
```

```bash
# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx
```

## Test Endpoints

### List frames:
```bash
curl http://72.61.210.203/api/static/frames
```

### Upload frame (multipart):
```bash
curl -X POST http://72.61.210.203/api/static/frames \
  -F "image=@test-frame.png" \
  -F "name=test-frame"
```

### Upload frame (base64):
```bash
curl -X POST http://72.61.210.203/api/static/frames/upload-base64 \
  -H "Content-Type: application/json" \
  -d '{"name":"test","imageData":"data:image/png;base64,..."}'
```

### Access static file:
```bash
curl http://72.61.210.203/static/frames/1234567890_test-frame.png
```

## Frontend Integration

Frontend sudah di-update untuk support VPS storage:

1. **Pages Function Proxy** (`functions/vps/static/frames.js`):
   - Proxy multipart upload ke VPS
   - Bypass CORS dan convert HTTP→HTTPS

2. **VPS Storage Service** (`src/services/vpsStorageService.js`):
   - Upload to VPS disk
   - List files
   - Delete files

3. **Frame Service** akan fallback ke VPS jika ImageKit limit tercapai.

## Deploy Frontend

```bash
cd my-app
npm run build
npx wrangler pages deploy dist
```

## Verify Everything Works

1. Buka https://fremio.id/admin/frames
2. Click "Upload Frame Baru"
3. Upload gambar dan cek apakah ter-upload ke VPS
4. Frame seharusnya muncul di daftar frames

## Troubleshooting

### Image tidak ter-upload:
- Cek PM2/backend logs: `pm2 logs`
- Cek nginx logs: `tail -f /var/log/nginx/error.log`
- Pastikan folder writable: `ls -la /var/www/fremio/backend/public/frames`

### CORS error:
- Pastikan nginx sudah reload: `systemctl reload nginx`
- Cek response headers: `curl -I http://72.61.210.203/static/frames/test.png`

### 413 Request Entity Too Large:
- Increase `client_max_body_size` di nginx config
