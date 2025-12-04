const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/drafts
 * Get all drafts for current user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT id, name, elements, settings, thumbnail_path, status, created_at, updated_at
      FROM drafts 
      WHERE user_id = $1
    `;
    const params = [req.user.userId];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    query += ` ORDER BY updated_at DESC`;
    
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;
    
    const result = await db.query(query, params);
    
    const drafts = result.rows.map(draft => ({
      id: draft.id,
      name: draft.name,
      elements: draft.elements || [],
      settings: draft.settings || {},
      thumbnailPath: draft.thumbnail_path,
      thumbnailUrl: draft.thumbnail_path,
      status: draft.status,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at
    }));
    
    res.json(drafts);
  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({ error: 'Gagal mengambil drafts' });
  }
});

/**
 * GET /api/drafts/:id
 * Get single draft by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM drafts WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft tidak ditemukan' });
    }
    
    const draft = result.rows[0];
    res.json({
      id: draft.id,
      name: draft.name,
      elements: draft.elements || [],
      settings: draft.settings || {},
      thumbnailPath: draft.thumbnail_path,
      thumbnailUrl: draft.thumbnail_path,
      status: draft.status,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at
    });
  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ error: 'Gagal mengambil draft' });
  }
});

/**
 * POST /api/drafts
 * Create new draft
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, elements, settings, thumbnailPath } = req.body;
    
    const result = await db.query(
      `INSERT INTO drafts (user_id, name, elements, settings, thumbnail_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.userId, 
        name || 'Untitled', 
        JSON.stringify(elements || []), 
        JSON.stringify(settings || {}),
        thumbnailPath
      ]
    );
    
    const draft = result.rows[0];
    
    console.log(`✅ Draft created: ${draft.name} by user ${req.user.userId}`);
    
    res.status(201).json({
      message: 'Draft berhasil disimpan',
      draft: {
        id: draft.id,
        name: draft.name,
        elements: draft.elements,
        settings: draft.settings,
        thumbnailPath: draft.thumbnail_path,
        status: draft.status,
        createdAt: draft.created_at
      }
    });
  } catch (error) {
    console.error('Create draft error:', error);
    res.status(500).json({ error: 'Gagal menyimpan draft' });
  }
});

/**
 * PUT /api/drafts/:id
 * Update existing draft
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, elements, settings, thumbnailPath, status } = req.body;
    
    const result = await db.query(
      `UPDATE drafts 
       SET name = COALESCE($3, name),
           elements = COALESCE($4, elements),
           settings = COALESCE($5, settings),
           thumbnail_path = COALESCE($6, thumbnail_path),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        req.params.id, 
        req.user.userId, 
        name, 
        elements ? JSON.stringify(elements) : null,
        settings ? JSON.stringify(settings) : null,
        thumbnailPath, 
        status
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft tidak ditemukan' });
    }
    
    console.log(`✅ Draft updated: ${req.params.id}`);
    
    res.json({
      message: 'Draft berhasil diupdate',
      draft: result.rows[0]
    });
  } catch (error) {
    console.error('Update draft error:', error);
    res.status(500).json({ error: 'Gagal update draft' });
  }
});

/**
 * DELETE /api/drafts/:id
 * Delete draft
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM drafts WHERE id = $1 AND user_id = $2 RETURNING id, name',
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft tidak ditemukan' });
    }
    
    console.log(`🗑️ Draft deleted: ${result.rows[0].name}`);
    
    res.json({ message: 'Draft berhasil dihapus' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: 'Gagal menghapus draft' });
  }
});

/**
 * POST /api/drafts/:id/duplicate
 * Duplicate a draft
 */
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    // Get original draft
    const original = await db.query(
      'SELECT * FROM drafts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    
    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Draft tidak ditemukan' });
    }
    
    const draft = original.rows[0];
    
    // Create duplicate
    const result = await db.query(
      `INSERT INTO drafts (user_id, name, elements, settings, thumbnail_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.userId,
        `${draft.name} (Copy)`,
        draft.elements,
        draft.settings,
        draft.thumbnail_path
      ]
    );
    
    res.status(201).json({
      message: 'Draft berhasil diduplikasi',
      draft: result.rows[0]
    });
  } catch (error) {
    console.error('Duplicate draft error:', error);
    res.status(500).json({ error: 'Gagal menduplikasi draft' });
  }
});

module.exports = router;
