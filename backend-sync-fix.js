// =============================================================================
// BACKEND FIX: Auto-sync uploads setelah upload overlay
// =============================================================================

// TAMBAHKAN DI routes/upload.js atau routes/frames.js SETELAH upload overlay berhasil:

// Di dalam route POST /upload/overlay, SETELAH file.mv() berhasil:
const { exec } = require('child_process');

// OPTION 1: Trigger sync setelah upload overlay (immediate sync)
router.post('/upload/overlay', upload.single('image'), async (req, res) => {
  try {
    // ... existing upload code ...
    
    // Setelah file berhasil disimpan:
    const fileName = `${uuid.v4()}.${ext}`;
    const filePath = path.join(uploadsDir, 'overlays', fileName);
    await file.mv(filePath);
    
    // ✅ TRIGGER SYNC IMMEDIATELY AFTER UPLOAD
    exec('/root/sync-uploads.sh', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Sync failed:', error);
      } else {
        console.log('✅ Uploads synced after overlay upload');
      }
    });
    
    // Return response
    res.json({ 
      success: true, 
      fileName: `/uploads/overlays/${fileName}` 
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// OPTION 2: Create dedicated sync endpoint
router.post('/sync-uploads', (req, res) => {
  exec('/root/sync-uploads.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Sync error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Sync failed',
        error: error.message 
      });
    }
    
    console.log('✅ Manual sync triggered:', stdout);
    res.json({ 
      success: true, 
      message: 'Uploads synced successfully',
      output: stdout
    });
  });
});


// OPTION 3 (BEST): Configure nginx to serve uploads dari backend langsung
// Di nginx config, tambahkan:
/*
location /uploads {
    # Try frontend first, fallback to backend
    alias /var/www/fremio/uploads;
    try_files $uri @backend_uploads;
}

location @backend_uploads {
    alias /root/fremio/backend/uploads;
    internal;
}
*/
