# Firebase Setup Checklist

## 📋 Pre-Implementation Checklist

### 1. Firebase Project
- [ ] Created Firebase project
- [ ] Enabled Authentication (Email/Password)
- [ ] Created Firestore Database (Production mode)
- [ ] Setup Firebase Storage
- [ ] Copied configuration values

### 2. Environment Setup
- [ ] Installed `firebase` package: `npm install firebase`
- [ ] Created `.env` file from `.env.example`
- [ ] Filled in all Firebase configuration values
- [ ] Added `.env` to `.gitignore`

### 3. Security Rules
- [ ] Deployed `firestore.rules` to Firebase Console
- [ ] Tested rules with Firebase Emulator (optional)
- [ ] Configured Storage security rules

### 4. First Admin User
- [ ] Registered first user via app
- [ ] Set user role to "admin" via Firebase Console OR
- [ ] Used `setAdminRole.js` script (requires Admin SDK)

### 5. Application Setup
- [ ] Updated routing in `App.jsx`
- [ ] Imported all new pages and guards
- [ ] Tested navigation with different roles

## 🧪 Testing Checklist

### User Flow
- [ ] Register new user → profile created with role="user"
- [ ] Login → authentication works
- [ ] Logout → session cleared
- [ ] Protected routes redirect correctly

### Kreator Application
- [ ] User can access `/apply-kreator`
- [ ] Form validation works
- [ ] Application submitted successfully
- [ ] Application appears in admin panel
- [ ] Admin can approve → user role changes
- [ ] Admin can reject → user notified

### Frame Workflow
- [ ] Kreator can create frame (draft)
- [ ] Submit for review → status updates
- [ ] Admin can see pending frames
- [ ] Admin can approve → frame published
- [ ] Admin can reject → kreator notified
- [ ] Admin can request changes → kreator can edit

### Permissions
- [ ] User cannot access admin routes
- [ ] User cannot access kreator studio
- [ ] Kreator cannot access admin routes
- [ ] Admin can access everything

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables set
- [ ] Firestore rules deployed
- [ ] Storage rules configured
- [ ] Admin user created

### Post-Deployment
- [ ] Test registration flow
- [ ] Test login/logout
- [ ] Test role-based access
- [ ] Test complete workflows
- [ ] Monitor Firestore usage
- [ ] Check for errors in console

## 📊 Monitoring

### Firebase Console
- [ ] Check Authentication tab for users
- [ ] Monitor Firestore Database usage
- [ ] Check Storage for uploaded files
- [ ] Review Usage & billing

### Application
- [ ] No console errors
- [ ] All pages load correctly
- [ ] Forms submit successfully
- [ ] Notifications work

## 🔧 Troubleshooting

### Common Issues

**Issue**: "Firebase not initialized"
- **Fix**: Check `.env` file exists and has correct values

**Issue**: "Permission denied" errors
- **Fix**: Deploy firestore.rules to Firebase Console

**Issue**: "User cannot access admin routes"
- **Fix**: Verify user role in Firestore users collection

**Issue**: "No admin user exists"
- **Fix**: Manually set role="admin" in Firebase Console or use setAdminRole.js

### Debug Steps
1. Check browser console for errors
2. Check Firebase Console for Firestore errors
3. Verify environment variables loaded
4. Test with Firebase Local Emulator

## 📝 Notes

- **Free Tier Limits**: 
  - 50K reads/day
  - 20K writes/day
  - 20K deletes/day
  - 1GB storage

- **Upgrade Triggers**:
  - Exceeding free tier limits
  - Need Cloud Functions
  - Need advanced analytics

- **Security**:
  - Never expose Firebase config publicly (it's safe in frontend, but avoid git commits)
  - Always deploy security rules
  - Regularly audit user permissions
  - Monitor for suspicious activity

---

**Last Updated**: Implementation Complete
**Status**: ✅ Ready for Testing
