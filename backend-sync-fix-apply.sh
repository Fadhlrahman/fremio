#!/bin/bash
# =============================================================================
# BACKEND FIX: Tambah Sync Endpoint & Trigger Auto-sync Setelah Upload Overlay
# =============================================================================
#
# CARA PAKAI:
# 1. Upload file ini ke server: scp backend-sync-fix-apply.sh root@76.13.192.32:/tmp/
# 2. SSH ke server: ssh root@76.13.192.32
# 3. Jalankan: bash /tmp/backend-sync-fix-apply.sh
#
# =============================================================================

set -e

echo "🔧 FREMIO BACKEND SYNC FIX"
echo "=========================="
echo ""

# Backup dulu
BACKUP_DIR="/root/fremio/backend/routes/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "📦 Creating backup..."
cp /root/fremio/backend/routes/frames.js "$BACKUP_DIR/frames.js.backup-$TIMESTAMP"
echo "   ✅ Backup saved: $BACKUP_DIR/frames.js.backup-$TIMESTAMP"
echo ""

# Cek apakah sudah ada sync endpoint
if grep -q "router.post('/sync-uploads'" /root/fremio/backend/routes/frames.js; then
    echo "⚠️  Sync endpoint already exists, skipping..."
else
    echo "📝 Adding sync endpoint..."
    
    # Tambah sync endpoint sebelum module.exports
    cat >> /root/fremio/backend/routes/frames.js << 'ENDPOINT'

// ============== SYNC ENDPOINT ==============
// Trigger manual sync dari backend ke frontend
router.post('/sync-uploads', (req, res) => {
  const { exec } = require('child_process');
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
ENDPOINT

    echo "   ✅ Sync endpoint added"
fi

echo ""
echo "📝 Modifying upload overlay route..."

# Backup file lagi sebelum modify
cp /root/fremio/backend/routes/frames.js /tmp/frames-before-overlay-fix.js

# Python script untuk modify upload/overlay route
python3 << 'PYTHON_SCRIPT'
import re

# Read file
with open('/root/fremio/backend/routes/frames.js', 'r') as f:
    content = f.read()

# Check if already modified
if '// ✅ TRIGGER SYNC IMMEDIATELY' in content:
    print('   ⚠️  Overlay route already modified, skipping...')
else:
    # Find the upload/overlay route and add sync trigger
    # Pattern: after await file.mv(...) or after res.json({success:true...})
    
    # Try to find upload/overlay route
    pattern = r"(router\.post\(['\"]\/upload\/overlay['\"].*?)(res\.json\(\{[^}]*success:\s*true[^}]*\}\);)"
    
    def add_sync_trigger(match):
        before_response = match.group(1)
        response = match.group(2)
        
        sync_code = """
    // ✅ TRIGGER SYNC IMMEDIATELY (non-blocking)
    const { exec } = require('child_process');
    exec('/root/sync-uploads.sh', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Post-upload sync failed:', error);
      } else {
        console.log('✅ Overlay synced immediately to frontend');
      }
    });
    
    """
        return before_response + sync_code + response
    
    # Apply modification
    new_content, count = re.subn(pattern, add_sync_trigger, content, flags=re.DOTALL)
    
    if count > 0:
        with open('/root/fremio/backend/routes/frames.js', 'w') as f:
            f.write(new_content)
        print(f'   ✅ Overlay route modified ({count} replacement)')
    else:
        print('   ⚠️  Upload overlay route not found or pattern mismatch')
        print('      You may need to add sync trigger manually')

PYTHON_SCRIPT

echo ""
echo "🔄 Restarting backend..."
pm2 restart fremio-backend

echo ""
echo "✅ BACKEND FIX APPLIED!"
echo ""
echo "📋 VERIFICATION STEPS:"
echo "1. Test sync endpoint:"
echo "   curl -X POST http://localhost:5050/api/sync-uploads"
echo ""
echo "2. Check backend logs:"
echo "   pm2 logs fremio-backend --lines 30"
echo ""
echo "3. Test upload overlay dari admin panel:"
echo "   - Upload overlay baru"
echo "   - Check log harus muncul: '✅ Overlay synced immediately to frontend'"
echo ""
echo "4. Verify file tersync:"
echo "   ls -lht /var/www/fremio/uploads/overlays/ | head -5"
echo ""
echo "📁 BACKUP LOCATION: $BACKUP_DIR/frames.js.backup-$TIMESTAMP"
echo ""
echo "=========================="
echo "🎉 DONE!"
