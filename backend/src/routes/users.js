const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, role, search } = req.query;
    
    let query = `
      SELECT id, email, display_name, role, photo_url, is_active, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];
    
    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (email ILIKE $${params.length} OR display_name ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;
    
    const result = await db.query(query, params);
    
    // Get total count
    const countResult = await db.query('SELECT COUNT(*) FROM users');
    
    res.json({
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        photoUrl: user.photo_url,
        isActive: user.is_active,
        createdAt: user.created_at
      })),
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Gagal mengambil data users' });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, display_name, role, photo_url, is_active, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      photoUrl: user.photo_url,
      isActive: user.is_active,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Gagal mengambil data user' });
  }
});

/**
 * PUT /api/users/:id/role
 * Change user role (admin only)
 */
router.put('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }
    
    // Prevent changing own role
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Tidak bisa mengubah role sendiri' });
    }
    
    const result = await db.query(
      `UPDATE users SET role = $2, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, role`,
      [req.params.id, role]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    console.log(`✅ User role changed: ${result.rows[0].email} -> ${role}`);
    
    res.json({
      message: 'Role berhasil diubah',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Gagal mengubah role' });
  }
});

/**
 * PUT /api/users/:id/status
 * Activate/deactivate user (admin only)
 */
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    // Prevent deactivating self
    if (req.params.id === req.user.userId && isActive === false) {
      return res.status(400).json({ error: 'Tidak bisa menonaktifkan akun sendiri' });
    }
    
    const result = await db.query(
      `UPDATE users SET is_active = $2, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, is_active`,
      [req.params.id, isActive]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    console.log(`✅ User status changed: ${result.rows[0].email} -> ${isActive ? 'active' : 'inactive'}`);
    
    res.json({
      message: isActive ? 'User diaktifkan' : 'User dinonaktifkan',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Change status error:', error);
    res.status(500).json({ error: 'Gagal mengubah status' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only, soft delete)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Prevent deleting self
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
    }
    
    const result = await db.query(
      `UPDATE users SET is_active = false, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    console.log(`🗑️ User deleted: ${result.rows[0].email}`);
    
    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Gagal menghapus user' });
  }
});

/**
 * GET /api/users/stats/summary
 * Get user statistics (admin only)
 */
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as total_admins,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d
      FROM users
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Gagal mengambil statistik' });
  }
});

module.exports = router;
