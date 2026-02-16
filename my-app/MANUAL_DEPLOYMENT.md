# 🚀 MANUAL DEPLOYMENT GUIDE - Overlay Upload Fix

## 📦 Archive Created

File: `/Users/salwa/Documents/fremio/my-app/frontend-overlay-fix.tar.gz`  
Size: 16 MB  
Contains: Fixed frontend with correct `/api/upload/overlay` endpoint

---

## ⚠️ Why Manual Deployment?

SSH connection timeout ke server `72.61.214.5`. Kemungkinan:
- Server behind firewall
- VPN required
- Network issue
- SSH key/port issue

---

## 🎯 DEPLOYMENT OPTIONS

### Option 1: Using SCP (If SSH Works Later)

```bash
# Test SSH connection first
ssh root@72.61.214.5 "echo 'SSH OK'"

# If OK, deploy with SCP
cd /Users/salwa/Documents/fremio/my-app
scp frontend-overlay-fix.tar.gz root@72.61.214.5:/tmp/

# Extract on server
ssh root@72.61.214.5 << 'EOF'
  cd /var/www
  
  # Backup existing frontend
  if [ -d "fremio" ]; then
    mv fremio fremio_backup_$(date +%Y%m%d_%H%M%S)
  fi
  
  # Extract new frontend
  tar -xzf /tmp/frontend-overlay-fix.tar.gz
  mv dist fremio
  
  # Set permissions
  chown -R www-data:www-data fremio
  chmod -R 755 fremio
  
  # Restart services
  pm2 restart fremio-backend
  sudo systemctl reload nginx
  
  # Cleanup
  rm /tmp/frontend-overlay-fix.tar.gz
  
  echo "✅ Deployment complete!"
EOF
```

---

### Option 2: Using FTP/SFTP Client

**Tools:** FileZilla, Cyberduck, Transmit, etc.

#### Steps:

1. **Connect to Server:**
   - Host: `72.61.214.5` or `api.fremio.id`
   - Protocol: SFTP (SSH File Transfer Protocol)
   - Port: 22 (or your custom SSH port)
   - Username: `root`
   - Password/Key: (your credentials)

2. **Upload Archive:**
   - Navigate to: `/tmp/`
   - Upload file: `frontend-overlay-fix.tar.gz`

3. **SSH to Server and Extract:**
   ```bash
   ssh root@72.61.214.5
   
   cd /var/www
   
   # Backup existing
   mv fremio fremio_backup_$(date +%Y%m%d_%H%M%S)
   
   # Extract new
   tar -xzf /tmp/frontend-overlay-fix.tar.gz
   mv dist fremio
   
   # Set permissions
   chown -R www-data:www-data fremio
   chmod -R 755 fremio
   
   # Restart services
   pm2 restart fremio-backend
   sudo systemctl reload nginx
   
   # Cleanup
   rm /tmp/frontend-overlay-fix.tar.gz
   
   echo "✅ Done!"
   ```

---

### Option 3: Using cPanel File Manager

If your hosting has cPanel:

1. **Login to cPanel:**
   - URL: `https://your-server:2083` or `https://fremio.id:2083`
   - Login with credentials

2. **Upload via File Manager:**
   - Open "File Manager"
   - Navigate to `/var/www/`
   - Upload `frontend-overlay-fix.tar.gz`

3. **Extract Archive:**
   - Right-click on `frontend-overlay-fix.tar.gz`
   - Select "Extract"
   - Extract to current directory

4. **Rename and Cleanup:**
   - Rename existing `fremio/` to `fremio_backup/`
   - Rename extracted `dist/` to `fremio/`
   - Delete `frontend-overlay-fix.tar.gz`

5. **Terminal Access in cPanel:**
   - Open "Terminal" in cPanel
   - Run:
   ```bash
   pm2 restart fremio-backend
   sudo systemctl reload nginx
   ```

---

### Option 4: Direct File Upload via FTP

Upload individual files instead of archive:

1. **Connect via FTP:**
   - Host: `72.61.214.5`
   - Port: 21 (FTP) or 22 (SFTP)
   - Username: `root`

2. **Backup Current Files:**
   - Rename `/var/www/fremio/` to `/var/www/fremio_backup/`

3. **Upload New Files:**
   - Upload all files from:
     `/Users/salwa/Documents/fremio/my-app/dist/`
   - To server:
     `/var/www/fremio/`

4. **Restart Services** (via SSH or cPanel Terminal):
   ```bash
   pm2 restart fremio-backend
   sudo systemctl reload nginx
   ```

---

### Option 5: Using rsync with Alternative Port

If SSH is on different port:

```bash
# Try common SSH ports
for port in 22 2222 2200 22000; do
  echo "Trying port $port..."
  rsync -avz -e "ssh -p $port" dist/ root@72.61.214.5:/var/www/fremio/ && break
done
```

---

## 🔐 SSH Troubleshooting

### Check SSH Key

```bash
# Test SSH connection
ssh -v root@72.61.214.5

# If using key
ssh -i ~/.ssh/fremio_production root@72.61.214.5

# Check SSH config
cat ~/.ssh/config | grep -A 5 fremio
```

### Common SSH Issues

1. **Wrong Port:**
   ```bash
   ssh -p 2222 root@72.61.214.5
   ```

2. **Key Permission:**
   ```bash
   chmod 600 ~/.ssh/fremio_production
   ```

3. **Known Hosts Issue:**
   ```bash
   ssh-keygen -R 72.61.214.5
   ssh-keygen -R api.fremio.id
   ```

4. **VPN Required:**
   - Check if server requires VPN connection
   - Connect to VPN first, then try SSH

---

## ✅ Verification After Deployment

### 1. Check Files on Server

```bash
ssh root@72.61.214.5

# Check frontend files
ls -la /var/www/fremio/assets/ | head -20

# Should see new index files with recent date
# Example: index-mlnthele-Cb4PGcwY.js
```

### 2. Test Website

1. **Clear Browser Cache:**
   - Chrome: Ctrl+Shift+R (Hard Reload)
   - Safari: Cmd+Option+R

2. **Open Admin Panel:**
   - https://fremio.id/admin/upload-frame

3. **Test Upload Element:**
   - Edit frame: https://fremio.id/admin/upload-frame?edit=frame_1764846351206_lzwvyh5yh
   - Add upload element
   - Upload image
   - Save frame

4. **Check Browser Console (F12):**
   - Should NOT see: `Failed to load resource: 404`
   - Should see: `Overlay uploaded successfully`

### 3. Verify API Endpoint

```bash
# Test upload endpoint (with admin token)
curl -X POST https://fremio.id/api/upload/overlay \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "image=@/path/to/test.png"

# Expected response:
# {
#   "success": true,
#   "imagePath": "/uploads/overlays/UUID.webp"
# }
```

---

## 📊 Deployment Checklist

Before deployment:
- [x] Fix applied to source code
- [x] Frontend built successfully
- [x] Archive created (16 MB)
- [ ] Archive uploaded to server
- [ ] Extracted on server
- [ ] Services restarted
- [ ] Browser cache cleared
- [ ] Upload tested
- [ ] No 404 errors in console
- [ ] Upload element persists after save

---

## 🆘 If Deployment Fails

### Rollback to Previous Version

```bash
ssh root@72.61.214.5

cd /var/www

# Remove failed deployment
rm -rf fremio

# Restore backup
mv fremio_backup_YYYYMMDD_HHMMSS fremio

# Restart services
pm2 restart fremio-backend
sudo systemctl reload nginx
```

### Check Logs

```bash
# Backend logs
pm2 logs fremio-backend --lines 50

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log | grep upload
```

---

## 📞 Need Help?

1. **Capture Screenshots:**
   - SSH connection error
   - FTP connection screen
   - cPanel access screen

2. **Try Alternative Methods:**
   - Contact hosting provider
   - Use web-based terminal (if available)
   - Ask server admin to whitelist your IP

3. **Emergency Deployment:**
   - Share archive link (Google Drive/Dropbox)
   - Server admin can download and extract manually

---

## 📝 Quick Command Reference

```bash
# Test SSH
ssh root@72.61.214.5 "echo OK"

# Deploy with SCP
scp frontend-overlay-fix.tar.gz root@72.61.214.5:/tmp/

# Deploy with rsync (if SSH works)
rsync -avz dist/ root@72.61.214.5:/var/www/fremio/

# Extract on server
ssh root@72.61.214.5 "cd /var/www && tar -xzf /tmp/frontend-overlay-fix.tar.gz"

# Restart services
ssh root@72.61.214.5 "pm2 restart fremio-backend && sudo systemctl reload nginx"
```

---

## 🎯 RECOMMENDED: Try SSH First

Before manual upload, try troubleshooting SSH:

```bash
# Test with verbose output
ssh -v root@72.61.214.5 2>&1 | grep -i "connect\|timeout\|refused"

# Try with key
ssh -i ~/.ssh/fremio_production root@72.61.214.5

# Try alternative hostname
ssh root@api.fremio.id
ssh root@fremio.id
```

If SSH works, use **Option 1** (fastest and cleanest).

If SSH doesn't work, use **Option 2** (FTP/SFTP - most reliable).

---

**Archive Location:**
```
/Users/salwa/Documents/fremio/my-app/frontend-overlay-fix.tar.gz
```

**Size:** 16 MB  
**Ready for upload!** ✅
