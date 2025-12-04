const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Multer config - store in memory for processing
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { 
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak valid. Hanya JPEG, PNG, WebP, GIF yang diperbolehkan.'));
    }
  }
});

/**
 * POST /api/upload/frame
 * Upload frame image (admin only)
 * Converts to WebP for optimization
 */
router.post('/frame', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const filename = `${uuidv4()}.webp`;
    const uploadDir = path.join(__dirname, '../../uploads/frames');
    const filepath = path.join(uploadDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Process and optimize image with Sharp
    await sharp(req.file.buffer)
      .webp({ quality: 85 })
      .resize(1080, 1920, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .toFile(filepath);

    const imageUrl = `/uploads/frames/${filename}`;
    
    console.log(`📸 Frame image uploaded: ${filename}`);

    res.json({
      message: 'Gambar berhasil diupload',
      imagePath: imageUrl,
      filename
    });
  } catch (error) {
    console.error('Upload frame error:', error);
    res.status(500).json({ error: 'Gagal upload gambar' });
  }
});

/**
 * POST /api/upload/thumbnail
 * Upload draft thumbnail (for users)
 */
router.post('/thumbnail', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const filename = `${req.user.userId}-${uuidv4()}.webp`;
    const uploadDir = path.join(__dirname, '../../uploads/thumbnails');
    const filepath = path.join(uploadDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Process thumbnail - smaller size for efficiency
    await sharp(req.file.buffer)
      .webp({ quality: 70 })
      .resize(400, 600, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .toFile(filepath);

    const imageUrl = `/uploads/thumbnails/${filename}`;
    
    console.log(`📸 Thumbnail uploaded: ${filename}`);

    res.json({
      message: 'Thumbnail berhasil diupload',
      thumbnailPath: imageUrl,
      filename
    });
  } catch (error) {
    console.error('Upload thumbnail error:', error);
    res.status(500).json({ error: 'Gagal upload thumbnail' });
  }
});

/**
 * POST /api/upload/base64
 * Upload image from base64 string
 */
router.post('/base64', authenticateToken, async (req, res) => {
  try {
    const { image, type = 'thumbnail' } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Data gambar diperlukan' });
    }

    // Extract base64 data
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Format base64 tidak valid' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    
    const isAdmin = req.user.role === 'admin';
    const folder = type === 'frame' && isAdmin ? 'frames' : 'thumbnails';
    const filename = `${req.user.userId}-${uuidv4()}.webp`;
    const uploadDir = path.join(__dirname, `../../uploads/${folder}`);
    const filepath = path.join(uploadDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Process image
    const size = type === 'frame' ? { width: 1080, height: 1920 } : { width: 400, height: 600 };
    const quality = type === 'frame' ? 85 : 70;

    await sharp(buffer)
      .webp({ quality })
      .resize(size.width, size.height, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .toFile(filepath);

    const imageUrl = `/uploads/${folder}/${filename}`;

    res.json({
      message: 'Gambar berhasil diupload',
      imagePath: imageUrl,
      filename
    });
  } catch (error) {
    console.error('Upload base64 error:', error);
    res.status(500).json({ error: 'Gagal upload gambar' });
  }
});

/**
 * DELETE /api/upload/:folder/:filename
 * Delete uploaded file (admin only for frames, owner for thumbnails)
 */
router.delete('/:folder/:filename', authenticateToken, async (req, res) => {
  try {
    const { folder, filename } = req.params;
    
    // Validate folder
    if (!['frames', 'thumbnails'].includes(folder)) {
      return res.status(400).json({ error: 'Folder tidak valid' });
    }
    
    // Check permissions
    if (folder === 'frames' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    
    // For thumbnails, check if file belongs to user
    if (folder === 'thumbnails' && !filename.startsWith(req.user.userId)) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    
    const filepath = path.join(__dirname, `../../uploads/${folder}/${filename}`);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File tidak ditemukan' });
    }
    
    fs.unlinkSync(filepath);
    
    console.log(`🗑️ File deleted: ${folder}/${filename}`);
    
    res.json({ message: 'File berhasil dihapus' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Gagal menghapus file' });
  }
});

module.exports = router;
