const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../src/middleware/auth');

// Generate short share ID
function generateShareId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// PUBLIC SHARE endpoint - No auth required (for sharing frames)
// This allows anyone to create a shared frame link
router.post('/public-share', async (req, res) => {
  try {
    const { title, frameData, previewUrl } = req.body;
    const userId = 'anonymous'; // Public shares don't require user

    // Parse and validate frameData
    let parsedFrameData = null;
    try {
      parsedFrameData = JSON.parse(frameData);
    } catch (e) {
      console.warn('⚠️ [Drafts] Could not parse frameData:', e.message);
    }

    console.log('📤 [Drafts] PUBLIC share request:', {
      title,
      hasFrameData: !!frameData,
      frameDataLength: frameData?.length,
      parsedElements: parsedFrameData?.elements?.length,
      elementTypes: parsedFrameData?.elements?.map(el => el.type),
      hasBackground: parsedFrameData?.elements?.some(el => el.type === 'background-photo'),
      hasOverlay: parsedFrameData?.elements?.some(el => el.type === 'upload'),
    });

    if (!frameData) {
      return res.status(400).json({ error: 'Frame data is required' });
    }

    // Create new shared draft (public)
    const shareId = generateShareId();
    const result = await pool.query(
      `INSERT INTO user_drafts (user_id, share_id, title, frame_data, preview_url, is_public)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [userId, shareId, title || 'Shared Frame', frameData, previewUrl]
    );

    console.log('✅ [Drafts] Created PUBLIC share:', result.rows[0].id, 'shareId:', shareId);
    res.json({ success: true, draft: result.rows[0] });
  } catch (error) {
    console.error('❌ [Drafts] Error creating public share:', error);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

// Save draft (requires auth)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, frameData, previewUrl, draftId } = req.body;
    const userId = req.user.id;

    // Parse and validate frameData
    let parsedFrameData = null;
    try {
      parsedFrameData = JSON.parse(frameData);
    } catch (e) {
      console.warn('⚠️ [Drafts] Could not parse frameData:', e.message);
    }

    console.log('📝 [Drafts] Save draft request:', {
      userId,
      title,
      hasDraftId: !!draftId,
      hasFrameData: !!frameData,
      frameDataLength: frameData?.length,
      parsedElements: parsedFrameData?.elements?.length,
      elementTypes: parsedFrameData?.elements?.map(el => el.type),
      hasBackground: parsedFrameData?.elements?.some(el => el.type === 'background-photo'),
      hasOverlay: parsedFrameData?.elements?.some(el => el.type === 'upload'),
      canvasWidth: parsedFrameData?.canvasWidth,
      canvasHeight: parsedFrameData?.canvasHeight
    });

    if (!frameData) {
      return res.status(400).json({ error: 'Frame data is required' });
    }

    // Check if updating existing draft
    if (draftId) {
      const existing = await pool.query(
        'SELECT * FROM user_drafts WHERE id = $1 AND user_id = $2',
        [draftId, userId]
      );

      if (existing.rows.length > 0) {
        // Update existing
        const result = await pool.query(
          `UPDATE user_drafts 
           SET title = $1, frame_data = $2, preview_url = $3, updated_at = NOW()
           WHERE id = $4 AND user_id = $5
           RETURNING *`,
          [title || 'Untitled', frameData, previewUrl, draftId, userId]
        );
        console.log('✅ [Drafts] Updated existing draft:', result.rows[0].id);
        return res.json({ success: true, draft: result.rows[0] });
      }
    }

    // Create new draft
    const shareId = generateShareId();
    const result = await pool.query(
      `INSERT INTO user_drafts (user_id, share_id, title, frame_data, preview_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, shareId, title || 'Untitled', frameData, previewUrl]
    );

    console.log('✅ [Drafts] Created new draft:', result.rows[0].id, 'shareId:', shareId);
    res.json({ success: true, draft: result.rows[0] });
  } catch (error) {
    console.error('❌ [Drafts] Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// Get user's drafts (requires auth)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📋 [Drafts] Fetching drafts for user:', userId);
    
    const result = await pool.query(
      `SELECT id, share_id, title, frame_data, preview_url, is_public, created_at, updated_at
       FROM user_drafts 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );
    
    console.log('✅ [Drafts] Found', result.rows.length, 'drafts');
    res.json({ success: true, drafts: result.rows });
  } catch (error) {
    console.error('❌ [Drafts] Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// Get draft by ID (for owner)
router.get('/by-id/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log('🔍 [Drafts] Fetching draft by ID:', id);
    
    const result = await pool.query(
      'SELECT * FROM user_drafts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ success: true, draft: result.rows[0] });
  } catch (error) {
    console.error('❌ [Drafts] Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// Get shared draft by share_id (public - no auth required)
router.get('/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    console.log('🔗 [Drafts] Fetching shared draft:', shareId);
    
    const result = await pool.query(
      `SELECT id, share_id, title, frame_data, preview_url, created_at
       FROM user_drafts 
       WHERE share_id = $1 AND is_public = true`,
      [shareId]
    );

    if (result.rows.length === 0) {
      console.log('❌ [Drafts] Shared draft not found:', shareId);
      return res.status(404).json({ error: 'Frame not found or not public' });
    }

    console.log('✅ [Drafts] Found shared draft:', result.rows[0].title);
    res.json({ success: true, draft: result.rows[0] });
  } catch (error) {
    console.error('❌ [Drafts] Error fetching shared draft:', error);
    res.status(500).json({ error: 'Failed to fetch frame' });
  }
});

// Delete draft
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('🗑️ [Drafts] Deleting draft:', id);

    const result = await pool.query(
      'DELETE FROM user_drafts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    console.log('✅ [Drafts] Deleted draft:', id);
    res.json({ success: true, message: 'Draft deleted' });
  } catch (error) {
    console.error('❌ [Drafts] Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// Toggle public/private
router.patch('/:id/visibility', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE user_drafts 
       SET is_public = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [isPublic, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ success: true, draft: result.rows[0] });
  } catch (error) {
    console.error('❌ [Drafts] Error updating visibility:', error);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

module.exports = router;
