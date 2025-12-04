require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const frameRoutes = require('./routes/frames');
const draftRoutes = require('./routes/drafts');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
const uploadDirs = ['uploads/frames', 'uploads/thumbnails', 'uploads/temp', 'logs'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Rate limiting - General (higher limit for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased for development
  message: { error: 'Terlalu banyak request, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin upload routes
    return req.path.includes('/upload') || req.path.includes('/frames');
  }
});
app.use('/api/', limiter);

// Rate limiting - Analytics (higher limit for tracking)
const analyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (1 per second average)
  message: { error: 'Rate limit exceeded for analytics' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/analytics/track', analyticsLimiter);

// CORS - allow frontend
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5180',
  'http://localhost:3000',
  'https://localhost:5173',
  'https://localhost:5174',
  'https://localhost:5180',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5180',
  'http://192.168.100.160:5173',
  'http://192.168.100.160:5174',
  'http://192.168.100.160:5180'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Allow all local development origins
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Log rejected origins for debugging
    console.log('⚠️ CORS rejected origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '30d',
  etag: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/frames', frameRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Fremio API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Fremio API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      frames: '/api/frames',
      drafts: '/api/drafts',
      upload: '/api/upload',
      users: '/api/users',
      analytics: '/api/analytics',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route tidak ditemukan',
    path: req.path 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File terlalu besar. Maksimal 10MB.' });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Terjadi kesalahan server' 
      : err.message
  });
});

// Start server with HTTPS support
const https = require('https');
const http = require('http');

// Check for SSL certificates
const certPath = path.join(__dirname, '..', 'localhost+3.pem');
const keyPath = path.join(__dirname, '..', 'localhost+3-key.pem');
const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

if (useHttps) {
  const httpsOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
  
  https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🔒 ═══════════════════════════════════════');
    console.log(`🔒  Fremio API running on HTTPS port ${PORT}`);
    console.log(`🔒  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒  Health: https://localhost:${PORT}/api/health`);
    console.log('🔒 ═══════════════════════════════════════');
    console.log('');
  });
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🚀 ═══════════════════════════════════════');
    console.log(`🚀  Fremio API running on port ${PORT}`);
    console.log(`🚀  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚀  Health: http://localhost:${PORT}/api/health`);
    console.log('🚀 ═══════════════════════════════════════');
    console.log('');
  });
}

module.exports = app;
