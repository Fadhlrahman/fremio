const express = require('express');
const db = require('../config/database');
const { authenticateToken, optionalAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper to build full image URL
const buildImageUrl = (imagePath, req) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  
  // Build full URL using request host or env
  const protocol = req.protocol || 'http';
  const host = req.get('host') || process.env.API_HOST || 'localhost:3000';
  return `${protocol}://${host}${imagePath}`;
};

/**
 * GET /api/frames
 * Get all active frames (public)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, limit, offset = 0, search, includeHidden } = req.query;
    
    let query = `
      SELECT id, name, description, category, image_path, slots, layout,
             max_captures, view_count, download_count, created_at, display_order,
             is_hidden, is_premium
      FROM frames 
      WHERE is_active = true
    `;
    
    // Admin can see hidden frames via includeHidden=true parameter
    if (!includeHidden || includeHidden !== 'true') {
      query += ` AND (is_hidden IS NULL OR is_hidden = false)`;
    }
    const params = [];
    
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY display_order ASC, created_at DESC`;
    
    // Only apply LIMIT if explicitly provided (no default limit for admin)
    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
      
      params.push(parseInt(offset));
      query += ` OFFSET $${params.length}`;
    }
    
    const result = await db.query(query, params);
    
    // Transform for frontend compatibility - include full URLs
    const frames = result.rows.map(frame => {
      const imageUrl = buildImageUrl(frame.image_path, req);
      return {
        id: frame.id,
        name: frame.name,
        description: frame.description,
        category: frame.category,
        imagePath: imageUrl,
        imageUrl: imageUrl,
        thumbnailUrl: imageUrl,
        slots: frame.slots || [],
        layout: frame.layout || {},
        maxCaptures: frame.max_captures,
        viewCount: frame.view_count,
        downloadCount: frame.download_count,
        createdAt: frame.created_at,
        displayOrder: frame.display_order ?? 999,
        isHidden: frame.is_hidden || false,
        is_hidden: frame.is_hidden || false,
        isPremium: frame.is_premium || false,
        is_premium: frame.is_premium || false,
        isCustom: true
      };
    });
    
    res.json(frames);
  } catch (error) {
    console.error('Get frames error:', error);
    res.status(500).json({ error: 'Gagal mengambil frames' });
  }
});

/**
 * GET /api/frames/:id
 * Get frame by ID (public)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get frame and increment view count
    const result = await db.query(
      `UPDATE frames 
       SET view_count = view_count + 1
       WHERE id = $1 AND is_active = true
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame tidak ditemukan' });
    }
    
    const frame = result.rows[0];
    const imageUrl = buildImageUrl(frame.image_path, req);
    
    res.json({
      id: frame.id,
      name: frame.name,
      description: frame.description,
      category: frame.category,
      imagePath: imageUrl,
      imageUrl: imageUrl,
      thumbnailUrl: imageUrl,
      slots: frame.slots || [],
      layout: frame.layout || {},
      maxCaptures: frame.max_captures,
      viewCount: frame.view_count,
      downloadCount: frame.download_count,
      createdAt: frame.created_at,
      isCustom: true
    });
  } catch (error) {
    console.error('Get frame error:', error);
    res.status(500).json({ error: 'Gagal mengambil frame' });
  }
});

/**
 * GET /api/frames/:id/config
 * Get frame config for EditPhoto
 */
router.get('/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM frames WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame tidak ditemukan' });
    }
    
    const frame = result.rows[0];
    const slots = frame.slots || [];
    const imageUrl = buildImageUrl(frame.image_path, req);
    
    const W = 1080;
    const H = 1920;
    
    // Build config for EditPhoto
    const config = {
      id: frame.id,
      name: frame.name,
      description: frame.description,
      maxCaptures: frame.max_captures,
      duplicatePhotos: false,
      imagePath: imageUrl,
      frameImage: imageUrl,
      thumbnailUrl: imageUrl,
      slots: slots,
      designer: {
        elements: slots.map((s, i) => ({
          id: s.id || `photo_${i + 1}`,
          type: 'photo',
          x: (s.left || 0) * W,
          y: (s.top || 0) * H,
          width: (s.width || 0.3) * W,
          height: (s.height || 0.2) * H,
          zIndex: s.zIndex || 2,
          data: {
            photoIndex: s.photoIndex !== undefined ? s.photoIndex : i,
            image: null,
            aspectRatio: s.aspectRatio || '4:5'
          }
        }))
      },
      // Include saved layout with overlay elements
      layout: frame.layout || {
        aspectRatio: '9:16',
        orientation: 'portrait',
        backgroundColor: frame.canvas_background || '#ffffff',
        elements: []
      },
      category: frame.category,
      isCustom: true
    };
    
    res.json(config);
  } catch (error) {
    console.error('Get frame config error:', error);
    res.status(500).json({ error: 'Gagal mengambil config frame' });
  }
});

/**
 * POST /api/frames
 * Create new frame (admin only)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, name, description, category, imagePath, image_path, slots, maxCaptures, max_captures, layout, canvasBackground, canvasWidth, canvasHeight } = req.body;
    
    // Debug log
    console.log('📥 [POST /frames] Received body:', {
      name,
      hasLayout: !!layout,
      layoutType: typeof layout,
      layoutElements: layout?.elements?.length || 0,
      layout: JSON.stringify(layout)?.substring(0, 200)
    });
    
    if (!name) {
      return res.status(400).json({ error: 'Nama frame harus diisi' });
    }
    
    // Allow frame without image if it has slots (generated frame)
    // imagePath can be external URL (ImageKit) or local path
    const finalImagePath = imagePath || image_path || null;
    
    // If no image and no slots, reject
    if (!finalImagePath && (!slots || slots.length === 0)) {
      return res.status(400).json({ error: 'Frame harus memiliki gambar atau minimal 1 slot foto' });
    }
    
    const frameId = id || `frame-${Date.now()}`;
    
    // Check if ID already exists
    const existing = await db.query('SELECT id FROM frames WHERE id = $1', [frameId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Frame ID sudah ada' });
    }
    
    // Store layout info in description or separate field if needed
    const frameLayout = layout ? JSON.stringify(layout) : null;
    const finalMaxCaptures = maxCaptures || max_captures || slots?.length || 1;
    
    const result = await db.query(
      `INSERT INTO frames (id, name, description, category, image_path, slots, max_captures, layout, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        frameId, 
        name, 
        description || '', 
        category || 'custom', 
        finalImagePath, 
        JSON.stringify(slots || []), 
        finalMaxCaptures, 
        frameLayout,
        req.user.userId
      ]
    );
    
    const frame = result.rows[0];
    
    console.log(`✅ Frame created: ${frame.name} (${frame.id}) with ${slots?.length || 0} slots, layout elements: ${layout?.elements?.length || 0}`);
    
    res.status(201).json({
      success: true,
      message: 'Frame berhasil dibuat',
      frame: {
        id: frame.id,
        name: frame.name,
        description: frame.description,
        category: frame.category,
        imagePath: frame.image_path,
        slots: frame.slots,
        maxCaptures: frame.max_captures
      }
    });
  } catch (error) {
    console.error('Create frame error:', error);
    res.status(500).json({ error: 'Gagal membuat frame' });
  }
});

/**
 * PUT /api/frames/:id
 * Update frame (admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, category, imagePath, slots, maxCaptures, layout, 
      displayOrder, display_order, is_hidden, is_premium 
    } = req.body;
    
    const frameLayout = layout ? JSON.stringify(layout) : null;
    const finalDisplayOrder = displayOrder ?? display_order;
    
    const result = await db.query(
      `UPDATE frames 
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           category = COALESCE($4, category),
           image_path = COALESCE($5, image_path),
           slots = COALESCE($6, slots),
           max_captures = COALESCE($7, max_captures),
           layout = COALESCE($8, layout),
           display_order = COALESCE($9, display_order),
           is_hidden = COALESCE($10, is_hidden),
           is_premium = COALESCE($11, is_premium),
           updated_at = NOW()
       WHERE id = $1 AND is_active = true
       RETURNING *`,
      [
        id, 
        name, 
        description, 
        category, 
        imagePath, 
        slots ? JSON.stringify(slots) : null, 
        maxCaptures,
        frameLayout,
        finalDisplayOrder !== undefined ? parseInt(finalDisplayOrder) : null,
        is_hidden !== undefined ? is_hidden : null,
        is_premium !== undefined ? is_premium : null
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame tidak ditemukan' });
    }
    
    console.log(`✅ Frame updated: ${id}, layout elements: ${layout?.elements?.length || 0}, displayOrder: ${finalDisplayOrder}, is_hidden: ${is_hidden}, is_premium: ${is_premium}`);
    
    res.json({
      success: true,
      message: 'Frame berhasil diupdate',
      frame: result.rows[0]
    });
  } catch (error) {
    console.error('Update frame error:', error);
    res.status(500).json({ error: 'Gagal update frame' });
  }
});

/**
 * DELETE /api/frames/:id
 * Delete frame (soft delete, admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'UPDATE frames SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame tidak ditemukan' });
    }
    
    console.log(`🗑️ Frame deleted: ${result.rows[0].name} (${id})`);
    
    res.json({ message: 'Frame berhasil dihapus' });
  } catch (error) {
    console.error('Delete frame error:', error);
    res.status(500).json({ error: 'Gagal menghapus frame' });
  }
});

/**
 * POST /api/frames/:id/download
 * Increment download count
 */
router.post('/:id/download', async (req, res) => {
  try {
    await db.query(
      'UPDATE frames SET download_count = download_count + 1 WHERE id = $1',
      [req.params.id]
    );
    res.json({ message: 'Download count updated' });
  } catch (error) {
    console.error('Update download count error:', error);
    res.status(500).json({ error: 'Gagal update download count' });
  }
});

/**
 * GET /api/frames/stats/summary
 * Get frames statistics (admin only)
 */
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_frames,
        SUM(view_count) as total_views,
        SUM(download_count) as total_downloads,
        COUNT(DISTINCT category) as total_categories
      FROM frames WHERE is_active = true
    `);
    
    const categoryStats = await db.query(`
      SELECT category, COUNT(*) as count
      FROM frames WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `);
    
    res.json({
      summary: stats.rows[0],
      byCategory: categoryStats.rows
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Gagal mengambil statistik' });
  }
});

module.exports = router;
