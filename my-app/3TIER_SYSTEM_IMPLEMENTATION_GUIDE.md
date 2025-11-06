# 3-Tier Frame Management System - Implementation Guide

## 🎯 Overview

Sistem 3-tier telah berhasil diimplementasikan untuk mengelola frame dengan hierarki:
- **Admin**: Mengelola seluruh platform, menyetujui aplikasi kreator dan frame
- **Kreator**: Membuat dan submit frame untuk review admin
- **User**: Menggunakan frame yang sudah disetujui, memiliki draft pribadi

## 📋 Fitur yang Diimplementasikan

### ✅ 1. Database Schema & Collections
- `firebaseCollections.js` - Schema definitions untuk semua collections
- 6 Firestore collections: users, kreatorApplications, frames, frameCategories, notifications, analytics
- `firestore.rules` - Security rules dengan role-based access control

### ✅ 2. Authentication & Role System
- **Firebase Authentication** terintegrasi (menggantikan localStorage)
- `useUserRole.js` - Custom hooks untuk role checking
- `RoleGuard.jsx` - Route protection components (AdminOnly, KreatorOnly, UserOnly)
- `roleHelpers.js` - Utility functions untuk role management
- Updated `AuthContext.jsx` dengan auto profile initialization

### ✅ 3. Kreator Application System
- `kreatorApplicationService.js` - CRUD operations untuk aplikasi
- `ApplyKreator.jsx` - Form aplikasi untuk user
- `KreatorApplications.jsx` - Admin interface untuk review aplikasi
- Workflow: Submit → Pending → Approved/Rejected

### ✅ 4. Admin Dashboard
- `AdminDashboard.jsx` - Central hub untuk admin
- Statistics overview (users, frames, applications)
- Quick actions untuk navigasi ke semua fitur admin
- Real-time data dari Firestore

### ✅ 5. Kreator Studio
- `KreatorStudio.jsx` - Workspace untuk kreator
- Frame management dengan filtering berdasarkan status
- Analytics untuk setiap frame (views, uses, likes)
- Submit untuk review, edit draft

### ✅ 6. Frame Workflow
- `frameManagementService.js` - Complete CRUD operations
- Status workflow: Draft → Pending Review → Approved/Rejected/Request Changes
- `AdminFrames.jsx` - Admin interface untuk review frames
- Approval, rejection, dan request changes functionality

### ✅ 7. Notification & Analytics Services
- `notificationService.js` - Notification system untuk status changes
- `analyticsService.js` - Track frame views, usage, likes, downloads
- Pre-built notification templates untuk common events
- Platform-wide analytics untuk admin

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd fremio/my-app
npm install firebase
```

Required packages:
- `firebase` (Authentication, Firestore, Storage)

### 2. Firebase Project Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project atau gunakan existing project
   - Enable **Authentication**, **Firestore Database**, dan **Storage**

2. **Enable Authentication**
   - Go to Authentication → Sign-in method
   - Enable **Email/Password** provider

3. **Create Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Start in **Production mode** (we'll deploy security rules)

4. **Setup Storage**
   - Go to Storage
   - Click "Get started"
   - Start in **Production mode**

### 3. Configure Environment Variables

1. **Get Firebase Config**
   - Firebase Console → Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy configuration values

2. **Create `.env` file**
   - Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Fill in Firebase credentials** in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### 4. Deploy Firestore Security Rules

1. **Install Firebase CLI** (if not installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (skip if already initialized):
   ```bash
   firebase init firestore
   ```

4. **Deploy Security Rules**:
   - Copy contents dari `firestore.rules` ke Firebase Console
   - Or deploy via CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 5. Create First Admin User

Ada 2 cara untuk create admin pertama kali:

**Option A: Manual via Firebase Console**
1. Register user biasa via app
2. Go to Firebase Console → Firestore Database
3. Find user document di collection `users`
4. Edit document, ubah field `role` dari `"user"` ke `"admin"`

**Option B: Via Firebase Auth Custom Claims** (Recommended)
1. Install Firebase Admin SDK
2. Run script untuk set admin claim
3. See `scripts/setAdminRole.js` (create this if needed)

### 6. Update Routing

Update `App.jsx` atau router file untuk include new pages:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminOnly, KreatorOnly } from './components/guards/RoleGuard';

// Admin routes
<Route path="/admin/dashboard" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
<Route path="/admin/applications" element={<AdminOnly><KreatorApplications /></AdminOnly>} />
<Route path="/admin/frames" element={<AdminOnly><AdminFrames /></AdminOnly>} />

// Kreator routes
<Route path="/kreator-studio" element={<KreatorOnly><KreatorStudio /></KreatorOnly>} />
<Route path="/apply-kreator" element={<ApplyKreator />} />
```

### 7. Run the Application

```bash
npm run dev
```

## 🔐 User Roles & Permissions

### Admin
- Access: `/admin/*` routes
- Permissions:
  - View & manage all users
  - Approve/reject kreator applications
  - Review & approve/reject frames
  - Access platform analytics
  - Change user roles

### Kreator
- Access: `/kreator-studio`, frame builder
- Permissions:
  - Create frames
  - Submit frames for review
  - View own frame analytics
  - Edit draft/requested-changes frames

### User
- Access: Public pages, personal drafts
- Permissions:
  - View approved public frames
  - Create personal drafts (private)
  - Apply to become kreator
  - Use frames to create moments

## 📊 Workflow Diagrams

### Kreator Application Workflow
```
User → Apply Kreator (form) → Pending
                                  ↓
                          Admin Reviews
                                  ↓
                         Approved / Rejected
                              ↓
                    Role changed to "kreator"
```

### Frame Submission Workflow
```
Kreator → Create Frame (draft) → Submit for Review
                                        ↓
                                  Pending Review
                                        ↓
                                 Admin Reviews
                                        ↓
                    Approved / Rejected / Request Changes
                        ↓                        ↓
                  Published           Kreator Edits → Re-submit
```

## 🧪 Testing Checklist

### User Registration & Login
- [ ] Register new user with email/password
- [ ] Login with registered credentials
- [ ] User profile auto-created in Firestore with role="user"
- [ ] Logout functionality

### Kreator Application
- [ ] User can access `/apply-kreator`
- [ ] Form validation works (portfolio URL, min characters)
- [ ] Application submitted successfully
- [ ] Admin can see application in `/admin/applications`
- [ ] Admin can approve → user role changes to "kreator"
- [ ] Admin can reject with reason
- [ ] User receives notification (if implemented)

### Frame Creation & Workflow
- [ ] Kreator can access `/kreator-studio`
- [ ] Create new frame → saved as draft
- [ ] Submit frame for review → status changes to "pending_review"
- [ ] Admin can see pending frame in `/admin/frames`
- [ ] Admin can approve → frame becomes public
- [ ] Admin can request changes → kreator can re-edit
- [ ] Admin can reject with reason

### Permissions
- [ ] Regular user cannot access `/admin/*` routes
- [ ] Regular user cannot access `/kreator-studio`
- [ ] Kreator cannot access `/admin/*` routes
- [ ] Only admin can change user roles
- [ ] Only admin can approve applications/frames

## 📦 File Structure

```
src/
├── config/
│   ├── firebase.js                    # Firebase initialization
│   └── firebaseCollections.js         # Schema definitions
├── contexts/
│   └── AuthContext.jsx                # Updated with Firebase Auth
├── hooks/
│   └── useUserRole.js                 # Role checking hooks
├── components/
│   └── guards/
│       └── RoleGuard.jsx              # Route protection
├── utils/
│   └── roleHelpers.js                 # Role utility functions
├── services/
│   ├── kreatorApplicationService.js   # Application CRUD
│   ├── frameManagementService.js      # Frame CRUD & workflow
│   ├── notificationService.js         # Notifications
│   └── analyticsService.js            # Analytics tracking
├── pages/
│   ├── ApplyKreator.jsx              # Kreator application form
│   ├── KreatorStudio.jsx             # Kreator workspace
│   └── admin/
│       ├── AdminDashboard.jsx        # Admin hub
│       ├── KreatorApplications.jsx   # Application reviews
│       └── AdminFrames.jsx           # Frame reviews
└── firestore.rules                    # Security rules (root level)
```

## 🚨 Important Notes

1. **Security Rules**: MUST deploy `firestore.rules` ke Firebase Console sebelum production
2. **Environment Variables**: Never commit `.env` file to git (add to `.gitignore`)
3. **First Admin**: Create admin user secara manual di Firebase Console setelah first deployment
4. **Firebase Limits**: Free tier memiliki limits, upgrade ke Blaze plan jika perlu
5. **Storage Rules**: Don't forget to configure Storage security rules juga

## 🔄 Migration from localStorage

Existing codebase menggunakan localStorage untuk authentication. System baru menggunakan Firebase Auth. 

**Backwards Compatibility**: AuthContext menyediakan alias `user` untuk `currentUser` agar existing components tetap works.

**Migration Steps**:
1. Update components yang menggunakan `useAuth()` untuk handle Firebase user object
2. Update drafts system untuk sync dengan Firestore (currently localStorage)
3. Gradually migrate existing users (if any) dari localStorage ke Firebase

## 📞 Support

Jika ada issues atau questions:
1. Check Firebase Console untuk errors
2. Check browser console untuk client-side errors
3. Verify Firestore rules deployed correctly
4. Ensure environment variables configured properly

---

**Status**: ✅ Implementation Complete - Ready for Testing
**Next Steps**: Deploy security rules, create admin user, test workflows
