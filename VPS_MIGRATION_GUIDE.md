# VPS Migration Guide - Fremio

## Overview

This document describes the VPS-ready architecture for Fremio. The codebase now supports two backend modes:

1. **Firebase Mode** (Default) - Uses Firebase Auth + Firestore + localStorage
2. **VPS Mode** - Uses Express.js + PostgreSQL + JWT authentication

## Current Status

✅ **Completed - Ready to Deploy:**
- Backend API (Express.js) with all routes
- Database schema (PostgreSQL)
- Deployment scripts (nginx, setup-vps.sh)
- Unified frontend services (switch between Firebase/VPS)
- All admin pages updated to use unified services

## Architecture

### Backend (VPS)
```
backend/
├── server.js              # Main Express server
├── config/
│   └── database.js        # PostgreSQL connection
├── middleware/
│   └── authMiddleware.js  # JWT authentication
├── routes/
│   ├── authRoutes.js      # Login, register, logout
│   ├── userRoutes.js      # User CRUD
│   ├── frameRoutes.js     # Frame CRUD
│   ├── draftRoutes.js     # Draft management
│   ├── affiliateRoutes.js # Affiliate system
│   ├── contactRoutes.js   # Contact messages
│   ├── analyticsRoutes.js # Analytics
│   └── uploadRoutes.js    # File uploads
└── services/
    └── ...
```

### Frontend (Unified Services)
```
my-app/src/
├── config/
│   └── backend.js         # Mode switcher (isVPSMode)
├── services/
│   ├── unifiedFrameService.js   # Frames
│   ├── unifiedAuthService.js    # Authentication
│   ├── unifiedDraftService.js   # Drafts
│   └── unifiedUserService.js    # User management
└── ...
```

## How to Switch Modes

### Frontend
Edit `.env`:
```env
# Firebase Mode (default)
VITE_USE_VPS=false

# VPS Mode
VITE_USE_VPS=true
VITE_API_URL=https://api.yourdomain.com/api
```

### Backend Deployment (when ready)
1. Setup VPS with PostgreSQL
2. Run database migration: `psql -f database/schema.sql`
3. Configure environment variables
4. Run: `npm start` or use PM2

## Testing Without Deploy

You can test the unified services locally:

1. **Keep Firebase Mode** (current default):
   - All features work with Firebase + localStorage
   - No VPS needed

2. **Test VPS Mode locally**:
   ```bash
   # Terminal 1: Start local PostgreSQL
   brew services start postgresql

   # Terminal 2: Start backend
   cd backend
   npm install
   npm run dev  # Starts on port 3000

   # Terminal 3: Start frontend with VPS mode
   cd my-app
   VITE_USE_VPS=true VITE_API_URL=http://localhost:3000/api npm run dev
   ```

## Files Updated in This Session

### New Files Created
- `my-app/src/config/backend.js` - Backend mode configuration
- `my-app/src/services/unifiedFrameService.js` - Unified frame service
- `my-app/src/services/unifiedAuthService.js` - Unified auth service
- `my-app/src/services/unifiedDraftService.js` - Unified draft service
- `my-app/src/services/unifiedUserService.js` - Unified user service

### Updated Files
- `my-app/src/pages/Frames.jsx` - Uses unifiedFrameService
- `my-app/src/pages/admin/AdminFrames.jsx` - Uses unifiedFrameService
- `my-app/src/pages/admin/AdminUploadFrame.jsx` - Uses unifiedFrameService
- `my-app/src/pages/admin/AdminDashboard.jsx` - Uses unifiedFrameService
- `my-app/src/pages/admin/AdminFrameCreator.jsx` - Uses unifiedFrameService
- `my-app/src/pages/admin/AdminSettings.jsx` - Uses unifiedFrameService
- `my-app/src/pages/KreatorStudio.jsx` - Uses unifiedFrameService
- `my-app/src/utils/frameProvider.js` - Uses unifiedFrameService
- `my-app/src/utils/testData.js` - Uses unifiedFrameService
- `my-app/.env.example` - Updated with VPS variables

## Backend API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Frames
- `GET /api/frames` - Get all frames
- `GET /api/frames/:id` - Get frame by ID
- `GET /api/frames/:id/config` - Get frame config for EditPhoto
- `POST /api/frames` - Create frame (admin)
- `PUT /api/frames/:id` - Update frame (admin)
- `DELETE /api/frames/:id` - Delete frame (admin)
- `POST /api/frames/:id/download` - Increment download count

### Users (Admin)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Uploads
- `POST /api/upload/frame` - Upload frame image

## Database Schema

See `database/schema.sql` for full schema. Main tables:
- `users` - User accounts
- `frames` - Frame templates
- `drafts` - User drafts
- `affiliates` - Affiliate data
- `contact_messages` - Contact form submissions

## Next Steps (When Ready to Deploy)

1. **Prepare VPS**
   - Ubuntu 20.04+ or similar
   - Install PostgreSQL, Node.js, nginx

2. **Deploy Backend**
   ```bash
   cd deploy
   chmod +x setup-vps.sh
   ./setup-vps.sh
   ```

3. **Configure Domain**
   - Point API subdomain to VPS
   - Setup SSL with Let's Encrypt

4. **Switch Frontend to VPS Mode**
   - Update `.env` with VPS settings
   - Rebuild and deploy frontend

## Rollback

To revert to Firebase mode:
1. Set `VITE_USE_VPS=false` in `.env`
2. Restart dev server / redeploy

No code changes needed - unified services handle both modes.
