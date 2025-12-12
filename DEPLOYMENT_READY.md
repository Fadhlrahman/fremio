# DEPLOYMENT INTEGRATION COMPLETE ✅

## Status Deployment
- ✅ Payment routes **ENABLED** (uncommented di backend/src/index.js)
- ✅ Production deployment scripts **CREATED**
- ✅ PowerShell & Bash scripts **READY**
- ✅ Database backup automation **INCLUDED**
- ✅ Rollback mechanism **IMPLEMENTED**

---

## 🚀 CARA DEPLOY KE PRODUCTION

### Opsi 1: PowerShell (Recommended untuk Windows)
```powershell
# Full deployment (backend + frontend + migrations)
.\deploy-production.ps1 -Action all

# Atau deploy spesifik:
.\deploy-production.ps1 -Action backend   # Backend only
.\deploy-production.ps1 -Action frontend  # Frontend only
.\deploy-production.ps1 -Action status    # Check status
```

### Opsi 2: Bash (jika punya Git Bash/WSL)
```bash
chmod +x deploy-production.sh

# Full deployment
./deploy-production.sh all

# Atau deploy spesifik:
./deploy-production.sh backend
./deploy-production.sh frontend
./deploy-production.sh status
```

### Opsi 3: Interactive Menu
```powershell
# PowerShell
.\deploy-production.ps1

# Bash
./deploy-production.sh
```
Akan muncul menu pilihan 1-7.

---

## 📋 Apa yang Terjadi Saat Deploy?

### 1. **Pre-deployment Check**
- ✅ Check git status (ada uncommitted changes?)
- ✅ Check current branch (main/master?)
- ✅ Test SSH connection ke api.fremio.id
- ⚠️ Warning jika ada yang tidak sesuai

### 2. **Database Backup** (Otomatis)
```bash
fremio_backup_20241212_143025.sql
```
Disimpan di VPS: `/var/www/fremio/backend/backups/`

### 3. **Deploy Backend**
```bash
# Yang dilakukan script:
1. Create archive (exclude node_modules, logs, uploads)
2. Upload ke VPS via SCP
3. Backup backend saat ini
4. Extract backend baru
5. npm install --production
6. pm2 restart fremio-backend
```

### 4. **Deploy Frontend**
```bash
# Dua cara:
A. Via Wrangler (jika installed):
   - Build production
   - wrangler pages deploy

B. Via Git (auto):
   - Build production
   - git push origin main
   - Cloudflare Pages auto-deploy
```

### 5. **Run Migrations** (Opsional)
```bash
# Upload file dari database/migrations/*.sql
# Execute di PostgreSQL production
```

### 6. **Status Check**
```bash
✅ API health: https://api.fremio.id/api/health
✅ Frontend: https://fremio.id
✅ PM2 status
✅ Nginx status
```

---

## 🔐 REQUIREMENT: SSH Key Setup

**PENTING:** Script ini butuh SSH key authentication ke VPS!

### Setup SSH Key (One-time):
```powershell
# 1. Generate SSH key (jika belum punya)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/fremio_production

# 2. Copy public key ke VPS
type ~/.ssh/fremio_production.pub | ssh root@api.fremio.id "cat >> ~/.ssh/authorized_keys"

# 3. Test connection
ssh root@api.fremio.id "echo 'Success!'"
```

### Atau gunakan password (less secure):
Jika tidak mau setup SSH key, edit script dan tambahkan sshpass (Linux/Mac only).

---

## 📁 File Changes yang Sudah Di-integrate

### 1. `backend/src/index.js`
```diff
- // const paymentRoutes = require("../routes/payment");
- // const adminPackagesRoutes = require("../routes/adminPackages");
+ const paymentRoutes = require("../routes/payment");
+ const adminPackagesRoutes = require("../routes/adminPackages");

- // app.use("/api/payment", paymentRoutes);
- // app.use("/api/admin/packages", adminPackagesRoutes);
+ app.use("/api/payment", paymentRoutes);
+ app.use("/api/admin/packages", adminPackagesRoutes);
```

### 2. New Files Created
- ✅ `deploy-production.sh` - Bash deployment script
- ✅ `deploy-production.ps1` - PowerShell deployment script
- ✅ This documentation file

---

## 🎯 Quick Start Commands

### Check if everything is ready:
```powershell
.\deploy-production.ps1 -Action check
```

### Deploy everything to production:
```powershell
# This will:
# 1. Check git status
# 2. Backup database
# 3. Deploy backend
# 4. Run migrations
# 5. Deploy frontend
# 6. Check status

.\deploy-production.ps1 -Action all
```

### Just check production status:
```powershell
.\deploy-production.ps1 -Action status
```

---

## 🔄 Rollback (jika ada masalah)

### Rollback Backend:
```bash
ssh root@api.fremio.id "cd /var/www/fremio/backend && \
  tar -xzf ../fremio-backend-backup-YYYYMMDD_HHMMSS.tar.gz && \
  npm install --production && \
  pm2 restart fremio-backend"
```

### Rollback Database:
```bash
ssh root@api.fremio.id "cd /var/www/fremio/backend/backups && \
  psql -U fremio_user -h localhost -d fremio < fremio_backup_YYYYMMDD_HHMMSS.sql"
```

---

## 🛡️ Safety Features

1. **Auto Backup**: Database & backend di-backup sebelum deploy
2. **Git Check**: Warning jika ada uncommitted changes
3. **SSH Test**: Verify connection sebelum deploy
4. **Health Check**: Verify API & frontend setelah deploy
5. **PM2 Logs**: Auto check logs jika deployment gagal

---

## 📞 Troubleshooting

### Error: "Cannot connect to api.fremio.id"
```powershell
# Check SSH key
ssh -v root@api.fremio.id

# Or setup password auth (add to script)
```

### Error: "npm install failed"
```bash
# SSH ke VPS
ssh root@api.fremio.id

# Manual install
cd /var/www/fremio/backend
npm install --production
pm2 restart fremio-backend
```

### Error: "Frontend not updating"
```bash
# Check Cloudflare Pages dashboard
# Manual deploy:
cd my-app
npm run build
wrangler pages deploy dist --project-name=fremio
```

---

## ✨ Next Steps

1. **Setup SSH Key** (jika belum)
   ```powershell
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/fremio_production
   ```

2. **Update .env.production** (jika ada perubahan)
   ```
   my-app/.env.production
   ```

3. **Test Deployment ke Staging** (optional, aman)
   ```bash
   ./deploy-staging.sh all
   ```

4. **Deploy ke Production**
   ```powershell
   .\deploy-production.ps1 -Action all
   ```

5. **Monitor Logs**
   ```bash
   ssh root@api.fremio.id "pm2 logs fremio-backend"
   ```

---

## 🎉 Summary

**What's Ready:**
- ✅ Payment system enabled
- ✅ Deployment scripts created (PowerShell + Bash)
- ✅ Automated backup before deploy
- ✅ Health checks after deploy
- ✅ Rollback mechanism
- ✅ Interactive & command-line modes

**What You Need:**
- SSH key setup ke api.fremio.id
- .env.production with correct values
- Midtrans production keys (for payment)

**Deployment Command:**
```powershell
.\deploy-production.ps1 -Action all
```

---

Generated: 2024-12-12  
Status: ✅ READY FOR PRODUCTION DEPLOYMENT
