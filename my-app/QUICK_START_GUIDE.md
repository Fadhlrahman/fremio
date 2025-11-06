# 🚀 Quick Start Guide - 3-Tier System

## ⚡ 5-Minute Setup

### 1. Install Firebase
```bash
cd fremio/my-app
npm install firebase
```

### 2. Setup Firebase Project
1. Go to https://console.firebase.google.com/
2. Create new project (or use existing)
3. Enable **Authentication** → Email/Password
4. Create **Firestore Database** (Production mode)
5. Setup **Storage**

### 3. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Firebase config
# Get config from: Firebase Console → Project Settings → Your apps
```

**`.env` file:**
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Security Rules
Copy contents of `firestore.rules` to:
**Firebase Console → Firestore Database → Rules**

Click **Publish**

### 5. Update App.jsx Routing

Add these imports:
```jsx
import AdminDashboard from './pages/admin/AdminDashboard';
import KreatorApplications from './pages/admin/KreatorApplications';
import AdminFrames from './pages/admin/AdminFrames';
import KreatorStudio from './pages/KreatorStudio';
import ApplyKreator from './pages/ApplyKreator';
import { AdminOnly, KreatorOnly } from './components/guards/RoleGuard';
```

Add these routes:
```jsx
{/* Admin Routes */}
<Route path="/admin/dashboard" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
<Route path="/admin/applications" element={<AdminOnly><KreatorApplications /></AdminOnly>} />
<Route path="/admin/frames" element={<AdminOnly><AdminFrames /></AdminOnly>} />

{/* Kreator Routes */}
<Route path="/kreator-studio" element={<KreatorOnly><KreatorStudio /></KreatorOnly>} />
<Route path="/apply-kreator" element={<ApplyKreator />} />
```

### 6. Create First Admin User

**Option A: Firebase Console (Easiest)**
1. Run app: `npm run dev`
2. Register a new user via the app
3. Go to Firebase Console → Firestore Database
4. Find your user in `users` collection
5. Edit the document → change `role: "user"` to `role: "admin"`

**Option B: Admin Script (Advanced)**
```bash
# Install Firebase Admin SDK
npm install firebase-admin

# Get service account key from Firebase Console
# Project Settings → Service accounts → Generate new private key
# Save as serviceAccountKey.json (add to .gitignore!)

# Run script
node scripts/setAdminRole.js your_email@example.com
```

### 7. Run the App
```bash
npm run dev
```

---

## ✅ Testing Your Setup

### Test User Flow
1. Open http://localhost:5173
2. Register new user → Should create profile with role="user"
3. Login → Should redirect to home
4. Try accessing `/admin/dashboard` → Should redirect (not admin yet)

### Test Admin Flow
1. Set your user role to "admin" (see step 6)
2. Logout and login again
3. Navigate to `/admin/dashboard` → Should see admin interface
4. Check applications, frames, analytics

### Test Kreator Application
1. Register another user (or use existing non-admin user)
2. Navigate to `/apply-kreator`
3. Fill form and submit
4. Login as admin → Go to `/admin/applications`
5. Approve the application
6. User role should change to "kreator"
7. User can now access `/kreator-studio`

### Test Frame Workflow
1. Login as kreator
2. Go to `/kreator-studio`
3. Click "Create New Frame" (will need frame builder integration)
4. Create and save as draft
5. Submit for review
6. Login as admin → Go to `/admin/frames`
7. See pending frame
8. Approve/Reject/Request Changes

---

## 🔍 Troubleshooting

### "Firebase not initialized"
- Check `.env` file exists
- Verify all VITE_ variables are set
- Restart dev server after changing .env

### "Permission denied" in Firestore
- Deploy firestore.rules to Firebase Console
- Check rules are published
- Verify user is authenticated

### "Cannot access admin routes"
- Verify user role in Firestore (should be "admin")
- Clear browser cache and login again
- Check AuthContext is providing userProfile

### "No admin user"
- Follow Step 6 to create admin user
- Verify role changed in Firestore
- Logout and login again after role change

---

## 📚 Documentation

Detailed guides available:
- **`3TIER_SYSTEM_IMPLEMENTATION_GUIDE.md`** - Complete implementation details
- **`FIREBASE_SETUP_CHECKLIST.md`** - Testing and deployment checklist
- **`IMPLEMENTATION_COMPLETE_SUMMARY.md`** - Full feature overview

---

## 🎯 What You Get

✅ **3-Tier Role System** (Admin, Kreator, User)
✅ **Kreator Application Workflow** (Apply → Review → Approved)
✅ **Frame Management System** (Create → Submit → Approve)
✅ **Admin Dashboard** (Manage users, applications, frames)
✅ **Kreator Studio** (Create and manage frames)
✅ **Notifications** (Status updates for users)
✅ **Analytics** (Track frame performance)
✅ **Security Rules** (Role-based access control)

---

## 🚨 Before Production

- [ ] Setup Firebase Blaze plan (if needed)
- [ ] Configure custom domain
- [ ] Setup Firebase Hosting
- [ ] Enable Firebase Analytics
- [ ] Setup error monitoring
- [ ] Configure backup strategy
- [ ] Review security rules
- [ ] Setup Cloud Functions (for emails)
- [ ] Configure Storage rules
- [ ] Setup rate limiting

---

## 💡 Tips

1. **Test locally first** - Use Firebase Local Emulator for development
2. **Monitor usage** - Check Firebase Console usage tab regularly
3. **Backup data** - Export Firestore data regularly
4. **Version control** - Commit firestore.rules with your code
5. **Environment files** - Never commit .env to git

---

**Setup Time**: ~15 minutes
**Status**: Production Ready
**Last Updated**: Implementation Complete

Happy coding! 🎉
