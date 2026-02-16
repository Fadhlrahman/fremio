# 🚀 Quick Deployment Commands

## Initial Setup (One-time)

```bash
# Run automated setup
./setup-deployment.sh

# Follow the prompts to configure GitHub Secrets
```

## Daily Usage

### Push Changes (Auto-deploys)

```bash
# Frontend changes
git add my-app/
git commit -m "feat: Update frontend"
git push origin main
# ✅ Auto-deploys to Cloudflare Pages

# Backend changes
git add backend/
git commit -m "feat: Update backend"
git push origin main
# ✅ Auto-deploys to VPS

# Both
git add .
git commit -m "feat: Update both frontend and backend"
git push origin main
# ✅ Both deploy automatically
```

### Manual Deployment (via GitHub)

1. Go to: https://github.com/yourusername/fremio/actions
2. Select workflow (Deploy Frontend / Deploy Backend)
3. Click **Run workflow**
4. Select branch (usually `main`)
5. Click **Run workflow** button

### Check Deployment Status

```bash
# Open GitHub Actions in browser
open https://github.com/yourusername/fremio/actions

# Or check from CLI (if gh installed)
gh run list
gh run view
```

## Environment Variables

### Frontend (.env.production)

```bash
VITE_API_URL=https://fremio.id
VITE_BACKEND_MODE=vps
```

### Backend (.env on VPS)

Already configured on VPS at: `/var/www/fremio-backend/.env`

## Common Tasks

### Update Frontend Only

```bash
cd my-app
# Make changes...
npm run build  # Test locally
cd ..
git add my-app/
git commit -m "feat: Update UI"
git push origin main
```

### Update Backend Only

```bash
cd backend
# Make changes...
# Test locally if needed
cd ..
git add backend/
git commit -m "feat: Update API"
git push origin main
```

### Rollback Deployment

```bash
# Rollback to previous commit
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <commit-hash>
git push origin main --force
```

### Check Backend Status on VPS

```bash
# SSH to VPS
ssh root@your-vps-ip

# Check PM2 status
pm2 status
pm2 logs fremio-backend

# Restart manually if needed
pm2 restart fremio-backend

# Check latest deployed code
cd /var/www/fremio-backend
git log -1
```

### View Deployment Logs

**Frontend (Cloudflare):**
- Dashboard: https://dash.cloudflare.com
- Navigate to: Workers & Pages > fremio > View deployments

**Backend (VPS via GitHub Actions):**
- GitHub: https://github.com/yourusername/fremio/actions
- Click on latest workflow run
- View logs for each step

## Monitoring URLs

- **Frontend Live:** https://fremio.id
- **Backend API:** https://fremio.id/api/health
- **GitHub Actions:** https://github.com/yourusername/fremio/actions
- **Cloudflare Dashboard:** https://dash.cloudflare.com

## Troubleshooting

### Frontend not deploying?

```bash
# Check GitHub Actions logs
# Common issues:
# 1. Build errors - fix in my-app/
# 2. Cloudflare API token expired - regenerate
# 3. Missing secrets - check GitHub Settings > Secrets
```

### Backend not deploying?

```bash
# SSH to VPS and check
ssh root@your-vps-ip

# Check git status
cd /var/www/fremio-backend
git status
git log -1

# Check PM2
pm2 logs fremio-backend --lines 50

# Manual pull and restart
git pull origin main
npm ci --production
pm2 restart fremio-backend
```

### SSH Permission Denied?

```bash
# Regenerate SSH keys
ssh-keygen -t ed25519 -C "github-actions@fremio" -f ~/.ssh/github_actions_fremio

# Add public key to VPS
cat ~/.ssh/github_actions_fremio.pub
# Copy and add to VPS: ~/.ssh/authorized_keys

# Update GitHub Secret: VPS_SSH_PRIVATE_KEY
cat ~/.ssh/github_actions_fremio
# Copy entire content including BEGIN/END lines
```

## Build & Test Locally

### Frontend

```bash
cd my-app
npm install
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

### Backend

```bash
cd backend
npm install
npm run dev          # Development mode
npm start            # Production mode
```

## GitHub Secrets Reference

If you need to update secrets:

**Go to:** https://github.com/yourusername/fremio/settings/secrets/actions

**Required secrets:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_HOST`
- `VPS_USER`
- `VPS_BACKEND_PATH`

See `DEPLOYMENT_SETUP.md` for detailed instructions.

## Quick Health Checks

```bash
# Frontend
curl https://fremio.id
# Should return: 200 OK with HTML

# Backend
curl https://fremio.id/api/health
# Should return: {"status":"ok"}

# Backend frames API
curl https://fremio.id/api/frames
# Should return: JSON array of frames
```

## Emergency Procedures

### Frontend Down?

1. Check Cloudflare status
2. Check GitHub Actions for failed deployments
3. Rollback to previous commit
4. Redeploy manually if needed

### Backend Down?

```bash
# SSH to VPS
ssh root@your-vps-ip

# Check PM2
pm2 status
pm2 restart fremio-backend

# Check logs
pm2 logs fremio-backend --lines 100

# If still down, manual restart
cd /var/www/fremio-backend
pm2 stop fremio-backend
pm2 start src/index.js --name fremio-backend
pm2 save
```

## Performance Monitoring

### Frontend (Cloudflare)
- Analytics: Cloudflare Dashboard > Analytics
- Real-time: Cloudflare Dashboard > Workers & Pages > fremio

### Backend (VPS)
```bash
ssh root@your-vps-ip
pm2 monit              # Real-time monitoring
pm2 status             # Status overview
htop                   # System resources
```

---

**Happy deploying! 🚀**

For detailed setup: See `DEPLOYMENT_SETUP.md`
For workflows: See `.github/workflows/README.md`
