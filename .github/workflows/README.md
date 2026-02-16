# GitHub Actions Workflows

Folder ini berisi workflow otomatis untuk deployment.

## 📁 Files

- `deploy-frontend.yml` - Auto-deploy frontend ke Cloudflare Pages
- `deploy-backend.yml` - Auto-deploy backend ke VPS

## 🚀 Usage

Workflows akan otomatis berjalan ketika:

### Frontend (`deploy-frontend.yml`)
- **Trigger:** Push ke `main`/`master` dengan perubahan di `my-app/`
- **Action:** Build dan deploy ke Cloudflare Pages
- **Duration:** ~2-5 menit

### Backend (`deploy-backend.yml`)
- **Trigger:** Push ke `main`/`master` dengan perubahan di `backend/`
- **Action:** SSH ke VPS, pull code, restart PM2
- **Duration:** ~1-3 menit

## 🔧 Setup

Lihat [DEPLOYMENT_SETUP.md](../../DEPLOYMENT_SETUP.md) untuk instruksi lengkap setup GitHub Secrets dan konfigurasi.

## 📊 Monitoring

1. Buka GitHub repository
2. Klik tab **Actions**
3. Lihat status deployment terbaru
4. Klik workflow untuk detail logs

## 🔄 Manual Trigger

Bisa trigger manual dari GitHub Actions tab:
1. Pilih workflow
2. Klik **Run workflow**
3. Pilih branch
4. Klik **Run workflow** (hijau)

## ⚙️ Required Secrets

### Frontend
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`
- `VITE_API_URL` (optional)
- `VITE_BACKEND_MODE` (optional)

### Backend
- `VPS_SSH_PRIVATE_KEY`
- `VPS_HOST`
- `VPS_USER`
- `VPS_BACKEND_PATH`

Lihat [DEPLOYMENT_SETUP.md](../../DEPLOYMENT_SETUP.md) untuk cara mendapatkan values ini.
