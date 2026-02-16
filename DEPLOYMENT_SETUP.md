# 🚀 Auto Deployment Setup Guide

Setup CI/CD otomatis untuk deploy Frontend ke Cloudflare Pages dan Backend ke VPS.

## 📋 Prerequisites

1. **GitHub Repository** - Project sudah di push ke GitHub
2. **Cloudflare Account** - Untuk frontend deployment
3. **VPS Access** - SSH access ke VPS untuk backend deployment

---

## 🎨 **Frontend - Cloudflare Pages Auto Deploy**

### 1. Get Cloudflare Credentials

#### a) Get API Token
1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Klik **My Profile** (kanan atas)
3. Pilih **API Tokens**
4. Klik **Create Token**
5. Pilih template **"Edit Cloudflare Workers"** atau custom dengan permissions:
   - Account - Cloudflare Pages: Edit
6. Copy **API Token** yang dihasilkan

#### b) Get Account ID
1. Di Cloudflare Dashboard
2. Pilih domain Anda (fremio.id)
3. Scroll ke bawah sidebar kanan
4. Copy **Account ID**

#### c) Get/Create Project Name
1. Di Cloudflare Dashboard, pilih **Workers & Pages**
2. Jika belum ada project:
   - Klik **Create application** > **Pages** > **Connect to Git**
   - Atau gunakan nama project yang sudah ada
3. Copy **Project Name** (biasanya nama repo, contoh: `fremio`)

### 2. Add GitHub Secrets

1. Buka GitHub Repository
2. **Settings** > **Secrets and variables** > **Actions**
3. Klik **New repository secret**
4. Tambahkan secrets berikut:

```bash
# Cloudflare Secrets
CLOUDFLARE_API_TOKEN=<your-api-token>
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_PROJECT_NAME=fremio

# Environment Variables (optional)
VITE_API_URL=https://fremio.id
VITE_BACKEND_MODE=vps
```

### 3. Test Deployment

```bash
# Push ke main branch untuk trigger auto-deploy
git add .
git commit -m "Setup Cloudflare auto-deploy"
git push origin main

# Atau trigger manual dari GitHub Actions tab
```

---

## 🖥️ **Backend - VPS Auto Deploy**

### 1. Setup SSH Key for GitHub Actions

#### Generate SSH Key (di local)
```bash
# Generate SSH key khusus untuk GitHub Actions
ssh-keygen -t ed25519 -C "github-actions@fremio" -f ~/.ssh/github_actions_fremio

# Ini akan menghasilkan:
# - ~/.ssh/github_actions_fremio (private key) ← untuk GitHub Secret
# - ~/.ssh/github_actions_fremio.pub (public key) ← untuk VPS
```

#### Add Public Key to VPS
```bash
# Copy public key ke VPS
cat ~/.ssh/github_actions_fremio.pub

# SSH ke VPS
ssh root@your-vps-ip

# Paste public key ke authorized_keys
echo "ssh-ed25519 AAAA...your-public-key... github-actions@fremio" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Test SSH dari local
ssh -i ~/.ssh/github_actions_fremio root@your-vps-ip
```

### 2. Setup Git on VPS

```bash
# SSH ke VPS
ssh root@your-vps-ip

# Navigate to backend directory
cd /var/www/fremio-backend  # atau path Anda

# Initialize git if not already
git init
git remote add origin https://github.com/yourusername/fremio.git

# Set credentials (untuk auto pull)
git config --global credential.helper store
git pull origin main

# OR setup deploy key
# Generate SSH key di VPS
ssh-keygen -t ed25519 -C "vps-deploy@fremio" -f ~/.ssh/vps_deploy
cat ~/.ssh/vps_deploy.pub
# Add to GitHub repo: Settings > Deploy keys > Add deploy key
# Paste public key, check "Allow write access"

# Test git pull
git pull origin main
```

### 3. Add GitHub Secrets for Backend

Di GitHub Repository **Settings** > **Secrets and variables** > **Actions**, tambahkan:

```bash
# VPS SSH Secrets
VPS_SSH_PRIVATE_KEY=<paste-isi-file-github_actions_fremio>
VPS_HOST=your-vps-ip-or-domain
VPS_USER=root
VPS_BACKEND_PATH=/var/www/fremio-backend

# Untuk private key, copy semua isi file:
cat ~/.ssh/github_actions_fremio
# Paste SEMUA konten termasuk:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

### 4. Ensure PM2 is Installed on VPS

```bash
# SSH ke VPS
ssh root@your-vps-ip

# Install PM2 globally if not installed
npm install -g pm2

# Start backend with PM2
cd /var/www/fremio-backend
pm2 start src/index.js --name fremio-backend

# Save PM2 list
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the command it gives you
```

### 5. Test Backend Deployment

```bash
# Push ke main branch
git add backend/
git commit -m "Setup VPS auto-deploy"
git push origin main

# Check GitHub Actions tab untuk status deployment
```

---

## 🔄 **Workflow Triggers**

### Automatic Triggers

**Frontend akan auto-deploy ketika:**
- Push ke branch `main` atau `master`
- Ada perubahan di folder `my-app/`

**Backend akan auto-deploy ketika:**
- Push ke branch `main` atau `master`
- Ada perubahan di folder `backend/`

### Manual Trigger

Bisa trigger manual dari GitHub:
1. Buka repository GitHub
2. **Actions** tab
3. Pilih workflow (Deploy Frontend/Backend)
4. Klik **Run workflow**

---

## 🔍 **Monitoring & Debugging**

### Check Deployment Status

**Di GitHub:**
1. **Actions** tab
2. Lihat status workflow (✅ success, ❌ failed)
3. Klik workflow untuk detail logs

**Frontend (Cloudflare):**
1. [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Workers & Pages** > Your project
3. Lihat deployments history

**Backend (VPS):**
```bash
# SSH ke VPS
ssh root@your-vps-ip

# Check PM2 status
pm2 status
pm2 logs fremio-backend

# Check if code updated
cd /var/www/fremio-backend
git log -1
```

### Common Issues & Solutions

**❌ Frontend: "Cloudflare API Token Invalid"**
- Regenerate API token di Cloudflare
- Pastikan permissions: Account - Cloudflare Pages: Edit
- Update `CLOUDFLARE_API_TOKEN` secret di GitHub

**❌ Backend: "Permission denied (publickey)"**
- Pastikan public key sudah di VPS `~/.ssh/authorized_keys`
- Test SSH: `ssh -i ~/.ssh/github_actions_fremio root@vps-ip`
- Check private key format di GitHub secret (include BEGIN/END lines)

**❌ Backend: "git pull failed"**
- Setup SSH deploy key di VPS atau use HTTPS with token
- Check git remote: `git remote -v`
- Ensure git credentials configured

**❌ Backend: "pm2 command not found"**
- Install PM2: `npm install -g pm2`
- Check PATH: `which pm2`

---

## 📊 **Deployment Flow Diagram**

```
┌─────────────┐
│ Git Push    │
│ to main     │
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
  my-app/*          backend/*         other files
       │                  │                  │
       │                  │                  └─► No action
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ GitHub       │   │ GitHub       │
│ Actions      │   │ Actions      │
│ (Frontend)   │   │ (Backend)    │
└──────┬───────┘   └──────┬───────┘
       │                  │
       ▼                  ▼
   npm build          SSH to VPS
       │                  │
       ▼                  ▼
┌──────────────┐      git pull
│ Cloudflare   │      npm ci
│ Pages        │      pm2 restart
│ Deploy       │          │
└──────┬───────┘          ▼
       │             ┌──────────────┐
       ▼             │ VPS Running  │
┌──────────────┐    │ Backend      │
│ fremio.id    │    └──────────────┘
│ (Live)       │
└──────────────┘
```

---

## 🎯 **Quick Start Commands**

```bash
# 1. Setup SSH keys
ssh-keygen -t ed25519 -C "github-actions@fremio" -f ~/.ssh/github_actions_fremio

# 2. Copy public key to VPS
cat ~/.ssh/github_actions_fremio.pub
# Paste to VPS: ~/.ssh/authorized_keys

# 3. Copy private key untuk GitHub Secret
cat ~/.ssh/github_actions_fremio
# Paste to GitHub: VPS_SSH_PRIVATE_KEY

# 4. Test deployment
git add .
git commit -m "Setup auto-deploy"
git push origin main

# 5. Monitor
# Check: https://github.com/yourusername/fremio/actions
```

---

## 🔐 **Security Checklist**

- ✅ SSH keys berbeda untuk GitHub Actions (jangan gunakan personal key)
- ✅ Private key hanya di GitHub Secrets (tidak commit ke repo)
- ✅ VPS SSH key read-only (jangan kasih sudo access jika tidak perlu)
- ✅ Cloudflare API token dengan minimal permissions (hanya Pages Edit)
- ✅ GitHub Secrets encrypted (automatic by GitHub)
- ✅ Review GitHub Actions logs secara berkala

---

## 🚀 **Next Steps**

1. ✅ Setup Cloudflare secrets
2. ✅ Setup VPS SSH access
3. ✅ Test frontend deployment
4. ✅ Test backend deployment
5. ✅ Monitor first few deployments
6. ✅ Setup notifications (optional)
7. ✅ Document custom deploy procedures (if any)

**Selamat! Auto-deployment sudah siap. 🎉**

Setiap push ke `main` akan otomatis deploy:
- Frontend → Cloudflare Pages
- Backend → VPS via SSH

---

## 📞 **Troubleshooting Help**

Jika ada masalah:
1. Check GitHub Actions logs
2. Check Cloudflare deployment logs
3. SSH ke VPS dan check `pm2 logs`
4. Review secrets configuration
5. Test SSH connection manually

**Happy deploying! 🚀**
