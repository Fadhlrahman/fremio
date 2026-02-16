# OVERLAY UPLOAD/LOAD FIX - 16 Feb 2026

## 🔍 MASALAH YANG DITEMUKAN

### Gejala
- **Upload overlay berhasil** saat membuat/edit frame di `/admin/upload-frame`
- **Overlay hilang** saat klik Edit frame lagi (image 404)
- Console log menunjukkan: `Failed to load resource: 404 (06b1c6ba-9dc0-409f-a068-21bd214a64cc.png)`

### Root Cause
Ditemukan **3 masalah kritis**:

1. **Backend tidak punya endpoint `/api/upload/overlay`**
   - Frontend mengirim POST ke `${VPS_API_URL}/upload/overlay`
   - Backend hanya punya `/upload/frame`, `/upload/thumbnail`, `/upload/base64`
   - Request gagal → file tidak tersimpan

2. **Directory `uploads/overlays` tidak dibuat otomatis**
   - `backend/src/index.js` hanya create: `uploads/frames`, `uploads/thumbnails`, `uploads/temp`
   - Folder `uploads/overlays` tidak ada → upload gagal meski endpoint ada

3. **Sync path salah di frontend**
   - Frontend call `/api/sync-uploads` (tidak ada)
   - Seharusnya `/api/frames/sync-uploads`
   - Overlay tidak ter-sync ke frontend server → 404 saat load

---

## ✅ SOLUSI YANG DITERAPKAN

### 1. Backend: Tambah Endpoint `/api/upload/overlay`

**File**: `backend/src/routes/upload.js`

```javascript
router.post('/overlay', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  // Upload overlay image dengan transparency preserved (PNG/WebP)
  const filename = `${uuidv4()}.png`;
  const uploadDir = path.join(__dirname, '../../uploads/overlays');
  
  // Auto-detect alpha channel
  const metadata = await sharp(req.file.buffer).metadata();
  const hasAlpha = metadata.hasAlpha;
  
  if (hasAlpha) {
    // PNG untuk transparency
    await sharp(req.file.buffer)
      .png({ quality: 90 })
      .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
      .toFile(filepath);
  } else {
    // WebP untuk file tanpa alpha (lebih kecil)
    await sharp(req.file.buffer)
      .webp({ quality: 85 })
      .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
      .toFile(filepath);
  }
  
  res.json({
    imagePath: `/uploads/overlays/${filename}`,
    image_path: `/uploads/overlays/${filename}`,
    filename
  });
});
```

### 2. Backend: Auto-create Directory `uploads/overlays`

**File**: `backend/src/index.js`

```javascript
const uploadDirs = [
  "uploads/frames",
  "uploads/thumbnails",
  "uploads/overlays",  // ✅ ADDED
  "uploads/temp",
  "logs",
];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});
```

### 3. Backend: Tambah Endpoint Sync Manual

**File**: `backend/src/routes/frames.js`

```javascript
router.post('/sync-uploads', authenticateToken, requireAdmin, (req, res) => {
  const { exec } = require('child_process');
  
  console.log('🔄 Manual sync triggered by admin...');
  
  exec('/root/sync-uploads.sh', { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Sync failed',
        error: error.message
      });
    }
    
    res.json({
      success: true,
      message: 'Uploads synced successfully',
      output: stdout.trim()
    });
  });
});
```

### 4. Frontend: Fix Sync Path

**File**: `my-app/src/pages/admin/UploadFrame.jsx`

```javascript
// BEFORE (SALAH):
const syncResponse = await fetch(`${VPS_API_URL}/sync-uploads`, {

// AFTER (BENAR):
const syncResponse = await fetch(`${VPS_API_URL}/frames/sync-uploads`, {
```

### 5. Backend: Allow Admin Delete Overlays

**File**: `backend/src/routes/upload.js`

```javascript
// Validate folder
if (!['frames', 'thumbnails', 'overlays'].includes(folder)) {
  return res.status(400).json({ error: 'Folder tidak valid' });
}

// Check permissions - admin can delete frames/overlays
if ((folder === 'frames' || folder === 'overlays') && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Akses ditolak' });
}
```

---

## 🚀 CARA DEPLOY

### Option 1: Automatic Deploy (Recommended)

```bash
./deploy-overlay-fix.sh
```

Script ini akan:
1. ✅ Upload backend files (upload.js, frames.js, index.js)
2. ✅ Restart backend dengan PM2
3. ✅ Upload & extract frontend dist
4. ✅ Create overlays directories
5. ✅ Set permissions

### Option 2: Manual Deploy

#### A. Deploy Backend

```bash
# 1. Upload files
scp backend/src/routes/upload.js root@76.13.192.32:/root/fremio/backend/src/routes/
scp backend/src/routes/frames.js root@76.13.192.32:/root/fremio/backend/src/routes/
scp backend/src/index.js root@76.13.192.32:/root/fremio/backend/src/

# 2. SSH ke server
ssh root@76.13.192.32

# 3. Restart backend
cd /root/fremio/backend
pm2 restart fremio-backend
pm2 logs fremio-backend --lines 20

# 4. Create overlay directory
mkdir -p /root/fremio/backend/uploads/overlays
chmod 755 /root/fremio/backend/uploads/overlays
```

#### B. Deploy Frontend

```bash
# 1. Build (sudah dilakukan)
cd my-app
npm run build

# 2. Create tarball
tar -czf dist.tar.gz -C dist .

# 3. Upload
scp dist.tar.gz root@76.13.192.32:/tmp/

# 4. Extract on server
ssh root@76.13.192.32
cd /var/www/fremio
rm -rf assets *.html *.js *.css *.json 2>/dev/null || true
tar -xzf /tmp/dist.tar.gz
rm /tmp/dist.tar.gz
chown -R www-data:www-data /var/www/fremio

# 5. Create frontend overlay directory
mkdir -p /var/www/fremio/uploads/overlays
chown -R www-data:www-data /var/www/fremio/uploads
chmod -R 755 /var/www/fremio/uploads
```

---

## 🧪 TESTING

### 1. Test Upload Overlay

```bash
# Buka browser
https://fremio.id/admin/upload-frame

# Steps:
1. Klik "Tambah Unggahan" (upload button)
2. Upload gambar overlay (PNG/WebP)
3. Posisikan overlay di canvas
4. Klik "Update Frame" atau "Simpan"
5. Tunggu sync selesai (lihat console log: "✅ Uploads synced immediately!")
```

**Expected Console Logs:**
```
📦 [SAVE] Added overlay element: { type: 'upload', hasImage: true, zIndex: 500 }
🔄 Triggering uploads sync...
✅ Uploads synced immediately!
```

### 2. Test Edit Frame (Load Overlay)

```bash
# Steps:
1. Kembali ke /admin/frames
2. Klik tombol "Edit" pada frame yang baru dibuat
3. ✅ Overlay harus muncul (tidak 404 lagi!)
```

**Expected Console Logs:**
```
📦 [EDIT] Restoring layout elements: 1
  Element 0: type=upload, id=upload_1, zIndex=531, imageSize=XXkB
  ✅ Restored: zIndex=531, size=1080x1920
```

### 3. Test Manual Sync (if auto-sync fails)

```bash
# SSH ke server
ssh root@76.13.192.32

# Run sync script
/root/sync-uploads.sh

# Check if overlays copied
ls -lh /var/www/fremio/uploads/overlays/
```

### 4. Verify Overlay File

```bash
# Check backend has file
ssh root@76.13.192.32 'ls -lh /root/fremio/backend/uploads/overlays/'

# Check frontend has file (after sync)
ssh root@76.13.192.32 'ls -lh /var/www/fremio/uploads/overlays/'

# Test access via browser
https://fremio.id/uploads/overlays/[UUID].png
```

---

## 📊 FLOW DIAGRAM

### Before Fix (BROKEN ❌)
```
Frontend → POST /api/upload/overlay → ❌ 404 Route Not Found
                                           ↓
                                      File tidak tersimpan
                                           ↓
                                      Database simpan path yang invalid
                                           ↓
                                      Saat edit/load → Image 404
```

### After Fix (WORKING ✅)
```
Frontend → POST /api/upload/overlay → ✅ Backend save ke /uploads/overlays/UUID.png
                                           ↓
                                      POST /api/frames/sync-uploads (auto-triggered)
                                           ↓
                                      rsync dari backend ke frontend server
                                           ↓
                                      Database simpan path: /uploads/overlays/UUID.png
                                           ↓
                                      Saat edit/load → ✅ Image loaded successfully!
```

---

## 🔒 SECURITY & PERMISSIONS

### File Permissions
```bash
# Backend (uploads stored here first)
/root/fremio/backend/uploads/overlays/  → 755 (drwxr-xr-x)
/root/fremio/backend/uploads/overlays/*.png → 644 (-rw-r--r--)

# Frontend (synced via rsync)
/var/www/fremio/uploads/overlays/ → 755 (owned by www-data)
/var/www/fremio/uploads/overlays/*.png → 644 (owned by www-data)
```

### Endpoint Security
- ✅ `/api/upload/overlay` → `authenticateToken` + `requireAdmin`
- ✅ `/api/frames/sync-uploads` → `authenticateToken` + `requireAdmin`
- ✅ `DELETE /api/upload/overlays/:filename` → Admin only

---

## 📝 CATATAN PENTING

1. **Auto-sync setelah upload**
   - Frontend otomatis trigger sync via `/api/frames/sync-uploads`
   - Jika gagal, akan fallback ke cron job (5 menit)

2. **Image Format**
   - PNG digunakan untuk overlay dengan transparency
   - WebP digunakan untuk overlay tanpa alpha channel (lebih kecil)
   - Max size: 1080x1920 (auto-resized)

3. **Cron Job Backup**
   - Jika manual sync gagal, cron job akan sync setiap 5 menit
   - Script: `/root/sync-uploads.sh`

4. **Database Layout Storage**
   - Overlay disimpan di kolom `layout` (JSON) table `frames`
   - Format: `{ elements: [{ type: 'upload', data: { image: '/uploads/overlays/UUID.png' } }] }`

---

## 🐛 TROUBLESHOOTING

### Issue: Overlay masih 404 setelah deploy

**Solution**:
```bash
# 1. Check backend file exists
ssh root@76.13.192.32 'ls -lh /root/fremio/backend/uploads/overlays/'

# 2. Manual sync
ssh root@76.13.192.32 '/root/sync-uploads.sh'

# 3. Check frontend file exists
ssh root@76.13.192.32 'ls -lh /var/www/fremio/uploads/overlays/'

# 4. Check permissions
ssh root@76.13.192.32 'ls -ld /var/www/fremio/uploads/overlays/'
# Should show: drwxr-xr-x www-data www-data

# 5. Test direct access
curl -I https://fremio.id/uploads/overlays/[UUID].png
# Should return: HTTP/2 200
```

### Issue: Backend error "Cannot find module 'child_process'"

**Solution**: `child_process` adalah built-in Node.js module, tidak perlu install. Check typo di code.

### Issue: Sync script permission denied

**Solution**:
```bash
ssh root@76.13.192.32
chmod +x /root/sync-uploads.sh
```

---

## ✅ CHECKLIST DEPLOYMENT

- [x] Backend: Added `/api/upload/overlay` endpoint
- [x] Backend: Added `uploads/overlays` to auto-create dirs
- [x] Backend: Added `/api/frames/sync-uploads` endpoint
- [x] Backend: Updated delete route to support overlays
- [x] Frontend: Fixed sync path to `/api/frames/sync-uploads`
- [x] Frontend: Built dist folder (npm run build)
- [ ] **Deploy backend files to server**
- [ ] **Deploy frontend dist to server**
- [ ] **Create overlay directories on server**
- [ ] **Test upload overlay**
- [ ] **Test edit frame (overlay persists)**

---

## 📞 SUPPORT

Jika masih ada masalah setelah deploy, check:
1. PM2 logs: `ssh root@76.13.192.32 'pm2 logs fremio-backend --lines 100'`
2. Nginx logs: `ssh root@76.13.192.32 'tail -f /var/log/nginx/error.log'`
3. Browser console: F12 → Network tab → Check request/response
