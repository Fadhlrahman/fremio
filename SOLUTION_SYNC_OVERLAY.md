# SOLUSI: Overlay 404 Karena Belum Tersync

## ROOT CAUSE
Overlay file baru **belum tersync** dari backend ke frontend saat di-upload:
1. ✅ Upload → tersimpan di `/root/fremio/backend/uploads/overlays/UUID.png`
2. ✅ URL disimpan ke database → `/uploads/overlays/UUID.png`
3. ❌ **File BELUM di-sync** ke `/var/www/fremio/uploads/overlays/` (cron job 5 menit!)
4. ❌ Edit mode load → nginx cari file → **404!**

## SOLUSI 1: Backend Sync Endpoint (RECOMMENDED ✅)

### Step 1: Tambah endpoint sync di backend

**File: `/root/fremio/backend/routes/frames.js` atau `upload.js`**

Tambahkan endpoint baru:

```javascript
const { exec } = require('child_process');

// Endpoint untuk trigger sync manual
router.post('/sync-uploads', (req, res) => {
  console.log('🔄 Sync triggered via API...');
  
  exec('/root/sync-uploads.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Sync failed:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Sync failed',
        error: error.message 
      });
    }
    
    console.log('✅ Sync completed:', stdout);
    res.json({ 
      success: true, 
      message: 'Uploads synced successfully',
      output: stdout
    });
  });
});
```

### Step 2: Trigger sync setelah upload overlay

Dalam **route POST `/upload/overlay`**, setelah file berhasil disimpan:

```javascript
router.post('/upload/overlay', upload.single('image'), async (req, res) => {
  try {
    // ... existing upload code ...
    
    // Setelah file berhasil disimpan:
    const filePath = path.join(uploadsDir, 'overlays', fileName);
    await file.mv(filePath);
    
    // ✅ TRIGGER SYNC IMMEDIATELY
    exec('/root/sync-uploads.sh', (error) => {
      if (error) {
        console.error('❌ Post-upload sync failed:', error);
      } else {
        console.log('✅ Overlay synced immediately after upload');
      }
    });
    
    // Return response
    res.json({ 
      success: true, 
      imagePath: `/uploads/overlays/${fileName}` 
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### Step 3: Deploy backend

```bash
# Via SSH (butuh IP whitelisting dulu!)
ssh root@76.13.192.32
cd /root/fremio/backend
# Edit routes/frames.js atau upload.js
# Tambahkan kode di atas
pm2 restart fremio-backend
```

---

## SOLUSI 2: Frontend Trigger Sync (Alternative)

### Tambah di `src/pages/admin/UploadFrame.jsx`

Setelah line 803 (`if (!imagePath) throw new Error...`):

```javascript
const imagePath = payload.imagePath || payload.image_path;
if (!imagePath) throw new Error('Upload succeeded but no imagePath returned');

// ✅ TRIGGER IMMEDIATE SYNC - Don't wait for cron job!
try {
  console.log('🔄 Triggering uploads sync...');
  const syncResponse = await fetch(`${VPS_API_URL}/sync-uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (syncResponse.ok) {
    console.log('✅ Uploads synced immediately!');
  }
} catch (syncError) {
  console.warn('⚠️ Sync trigger failed (will sync via cron):', syncError);
}

// Convert relative path to absolute URL...
return imagePath.startsWith('http') ? imagePath : `${getUploadsBaseUrl()}${imagePath}`;
```

---

## TESTING

### 1. Test sync endpoint
```bash
curl -X POST https://fremio.id/api/sync-uploads \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{"success":true,"message":"Uploads synced successfully"}
```

### 2. Test upload overlay + auto-sync
1. Login admin
2. Upload overlay element baru
3. Check console log: `🔄 Triggering uploads sync...` → `✅ Uploads synced immediately!`
4. Click "Update Frame"
5. Refresh page atau kembali ke list
6. Edit frame lagi → overlay harus **langsung muncul** tanpa 404!

---

## QUICK FIX SEMENTARA

Jika overlay masih 404, panggil sync manual:

```bash
# Via SSH
ssh root@76.13.192.32 '/root/sync-uploads.sh'

# Atau via API (jika endpoint sudah ada)
curl -X POST https://fremio.id/api/sync-uploads
```

---

## FILE YANG PERLU DIEDIT

### Backend (pilih salah satu):
- `/root/fremio/backend/routes/frames.js` 
- `/root/fremio/backend/routes/upload.js`
- `/root/fremio/backend/server.js` (jika routes belum dipisah)

### Frontend:
- `/Users/salwa/Documents/fremio/my-app/src/pages/admin/UploadFrame.jsx` (line ~803)

---

## IP ADDRESS UPDATE

**Current Mac IP:** `114.10.145.92`
**Server IP:** `76.13.192.32`

**Whitelist di Hostinger Cloud Firewall:**
- Old: `114.10.148.56` → `114.10.148.92`
- **New: `114.10.145.92`** ← PERLU DITAMBAHKAN!

---

## KESIMPULAN

**Masalah utama:** File overlay ter-upload ke backend tapi **tidak langsung tersync** ke frontend (nginx document root). Cron job sync setiap 5 menit terlalu lama!

**Fix:** Trigger sync **otomatis** setelah upload overlay, baik dari:
1. Backend (post-upload hook) - **RECOMMENDED**
2. Frontend (API call setelah upload sukses) - Alternative

**Priority:** Backend fix > Frontend fix > Manual sync workaround
