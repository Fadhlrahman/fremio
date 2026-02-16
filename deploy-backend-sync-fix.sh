#!/bin/bash
# Backend Fix: Add sync endpoint & trigger after overlay upload

cat << 'EOF' > /tmp/backend-sync-fix.txt
=====================================================
BACKEND FIX: Auto-sync Overlay setelah Upload
=====================================================

FILE: /root/fremio/backend/routes/frames.js (atau upload.js atau server.js)

1. Tambahkan di bagian atas (setelah requires):

const { exec } = require('child_process');

2. Tambahkan endpoint sync (setelah routes lain):

// ============== SYNC ENDPOINT ==============
router.post('/sync-uploads', (req, res) => {
  console.log('🔄 [SYNC] Triggered via API...');
  
  exec('/root/sync-uploads.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ [SYNC] Failed:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Sync failed',
        error: error.message,
        stderr: stderr
      });
    }
    
    console.log('✅ [SYNC] Completed successfully');
    res.json({ 
      success: true, 
      message: 'Uploads synced successfully',
      output: stdout
    });
  });
});

3. Modify POST /upload/overlay untuk trigger sync:

router.post('/upload/overlay', upload.single('image'), async (req, res) => {
  try {
    // ... existing upload code ...
    
    // Setelah file.mv() berhasil:
    await file.mv(filePath);
    console.log('✅ Overlay uploaded:', fileName);
    
    // ✅ TRIGGER SYNC IMMEDIATELY (non-blocking)
    exec('/root/sync-uploads.sh', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Post-upload sync failed:', error);
      } else {
        console.log('✅ Overlay synced immediately to frontend');
      }
    });
    
    // Return response (jangan tunggu sync)
    res.json({ 
      success: true, 
      imagePath: `/uploads/overlays/${fileName}`,
      message: 'Overlay uploaded and syncing...'
    });
    
  } catch (error) {
    console.error('❌ Upload overlay error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

=====================================================
DEPLOYMENT STEPS:
=====================================================

1. Whitelist IP di Hostinger Cloud Firewall:
   - Current Mac IP: 114.10.145.92
   - Add to existing: 114.10.148.56, 114.10.148.92

2. SSH ke server:
   ssh root@76.13.192.32

3. Backup file:
   cd /root/fremio/backend/routes
   cp frames.js frames.js.backup-$(date +%Y%m%d-%H%M%S)

4. Edit file (gunakan nano atau vi):
   nano frames.js
   # Atau
   vi frames.js

5. Tambahkan kode di atas (lihat step 1-3)

6. Save & restart backend:
   pm2 restart fremio-backend

7. Test sync endpoint:
   curl -X POST http://localhost:5050/api/sync-uploads

8. Test upload overlay:
   - Login admin
   - Upload overlay baru
   - Check backend logs: pm2 logs fremio-backend
   - Should see: "✅ Overlay synced immediately to frontend"

=====================================================
VERIFICATION:
=====================================================

# Check backend logs
pm2 logs fremio-backend --lines 50

# Check file exists di backend
ls -lh /root/fremio/backend/uploads/overlays/ | tail -5

# Check file synced ke frontend
ls -lh /var/www/fremio/uploads/overlays/ | tail -5

# Manual sync test
/root/sync-uploads.sh

# API sync test
curl -X POST http://localhost:5050/api/sync-uploads

=====================================================
EOF

cat /tmp/backend-sync-fix.txt
echo ""
echo "📝 Instructions saved to: /tmp/backend-sync-fix.txt"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Whitelist IP 114.10.145.92 di Hostinger Cloud Firewall"
echo "2. SSH ke server: ssh root@76.13.192.32"
echo "3. Follow instructions di /tmp/backend-sync-fix.txt"
echo "4. Atau kirim file ini ke user untuk di-apply manual"
