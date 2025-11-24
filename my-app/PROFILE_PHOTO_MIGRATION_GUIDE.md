# Profile Photo Migration Guide

## Problem

Setelah migrasi dari localStorage authentication ke Firebase Authentication, foto profil pengguna lama tidak muncul karena perubahan sistem key storage:

- **Old System**: `profilePhoto_${user.email}`
- **New System**: `profilePhoto_${user.uid}`

## Solution Implemented

### 1. Auto-Migration System

Sistem sekarang mendukung **backward compatibility** dan **auto-migration**:

#### A. AuthContext Auto-Migration (Lines 16-30)

Setiap kali user login atau refresh page, foto profil otomatis dimigrasikan:

```javascript
const migrateProfilePhoto = (userData) => {
  if (!userData.uid || !userData.email) return;

  const uidKey = `profilePhoto_${userData.uid}`;
  const emailKey = `profilePhoto_${userData.email}`;

  const photoByEmail = localStorage.getItem(emailKey);
  const photoByUid = localStorage.getItem(uidKey);

  if (photoByEmail && !photoByUid) {
    localStorage.setItem(uidKey, photoByEmail);
    console.log(`✅ Auto-migrated profile photo: ${userData.email} → UID`);
  }
};
```

#### B. Cascading Lookup Pattern

Semua komponen sekarang mencari foto dengan prioritas:

1. UID-based key (Firebase users)
2. Email-based key (old localStorage users)

**Files Updated:**

- `Header.jsx` - Fungsi `getProfilePhoto()` dengan auto-migration
- `Settings.jsx` - Save ke both keys, load dengan fallback
- `Profile.jsx` - Load dari UID → email fallback
- `Drafts.jsx` - Load dari UID → email fallback

### 2. Manual Migration Tools

#### Debug Script

File: `public/debug-profile-photos.js`

Untuk melihat semua foto profil di localStorage:

```javascript
// Paste in browser console
// Shows all profilePhoto_* keys and current user info
```

#### Migration Script

File: `public/migrate-all-photos.js`

Untuk migrasi manual jika diperlukan:

```javascript
// Paste in browser console
// Automatically migrates email-based photo to UID-based
```

## How It Works

### Storage Strategy

#### When Saving Photo (Settings.jsx)

```javascript
// Save to BOTH keys for maximum compatibility
if (user?.uid) {
  localStorage.setItem(`profilePhoto_${user.uid}`, photo);
}
if (user?.email) {
  localStorage.setItem(`profilePhoto_${user.email}`, photo);
}
```

#### When Loading Photo (All Components)

```javascript
// Try UID first (new system)
const photoByUid = localStorage.getItem(`profilePhoto_${user?.uid}`);
if (photoByUid) return photoByUid;

// Fallback to email (old system)
const photoByEmail = localStorage.getItem(`profilePhoto_${user?.email}`);
return photoByEmail;
```

#### When Removing Photo (Settings.jsx)

```javascript
// Remove from BOTH keys
if (user?.uid) {
  localStorage.removeItem(`profilePhoto_${user.uid}`);
}
if (user?.email) {
  localStorage.removeItem(`profilePhoto_${user.email}`);
}
```

## Testing

### Test Cases

#### 1. Old User (Email-based photo exists)

**Before Login:**

- localStorage has: `profilePhoto_fadhl@gmail.com`

**After Login:**

- Auto-migration creates: `profilePhoto_abc123uid456`
- Both keys now exist
- Photo displays correctly

#### 2. New User (No photo yet)

**After Upload in Settings:**

- Saves to: `profilePhoto_xyz789uid123`
- Also saves to: `profilePhoto_newuser@gmail.com` (backup)

#### 3. Firebase User Switching Accounts

**User A (UID: abc123)**

- Photo stored: `profilePhoto_abc123`

**User B (UID: xyz789)**

- Photo stored: `profilePhoto_xyz789`
- ✅ Each user's photo loads correctly (UID isolation)

### Manual Testing Steps

1. **Check Current Photo Keys:**

   ```javascript
   // Browser console
   Object.keys(localStorage).filter((k) => k.startsWith("profilePhoto_"));
   ```

2. **Check Current User:**

   ```javascript
   // Browser console
   JSON.parse(localStorage.getItem("fremio_user"));
   ```

3. **Verify Migration:**
   - Login with old account
   - Open console → should see: `✅ Auto-migrated profile photo`
   - Upload new photo → should save to both keys
   - Logout/Login → photo should persist

## Troubleshooting

### Issue: Photo not showing after login

**Check:**

1. Open Browser Console
2. Look for: `✅ Auto-migrated profile photo` message
3. If missing, run migration script manually:
   ```javascript
   // Copy from public/migrate-all-photos.js
   ```

### Issue: Different photo for same user

**Cause:** Multiple keys with different photos

**Solution:**

```javascript
// Browser console - check which keys exist
const user = JSON.parse(localStorage.getItem("fremio_user"));
console.log("UID key:", localStorage.getItem(`profilePhoto_${user.uid}`));
console.log("Email key:", localStorage.getItem(`profilePhoto_${user.email}`));

// Remove the wrong one
localStorage.removeItem(`profilePhoto_${user.email}`); // or uid
```

### Issue: Photo not saving

**Check Settings.jsx console:**

- Should see photo being saved to both keys
- Verify user has both `uid` and `email` properties

**Manual save test:**

```javascript
const user = JSON.parse(localStorage.getItem("fremio_user"));
const testPhoto = "data:image/jpeg;base64,/9j/4AAQ..."; // base64 string

localStorage.setItem(`profilePhoto_${user.uid}`, testPhoto);
localStorage.setItem(`profilePhoto_${user.email}`, testPhoto);
console.log("✅ Test photo saved");
```

## Migration Status

### ✅ Completed

- [x] AuthContext auto-migration on login/refresh
- [x] Header.jsx cascading lookup + migration
- [x] Settings.jsx dual-save (UID + email)
- [x] Profile.jsx fallback loading
- [x] Drafts.jsx fallback loading
- [x] Debug tools created
- [x] Migration script created

### 📋 Technical Details

**Storage Format:**

- Key: `profilePhoto_${identifier}`
- Value: Base64 encoded JPEG (`data:image/jpeg;base64,/9j/...`)
- Size: ~50-200KB per photo

**Identifiers:**

- **UID**: Firebase user ID (e.g., `abc123xyz789`)
- **Email**: User email address (e.g., `user@example.com`)

**Backward Compatibility:**

- Old users (email-based) ✅ Works
- New users (UID-based) ✅ Works
- Mixed keys ✅ Auto-migrates on next login
- No breaking changes ✅ All existing photos preserved

## Future Improvements

1. **Firebase Storage Migration**

   - Move from localStorage to Firebase Storage
   - Benefits: CDN, cross-device sync, better quota
   - Implementation: Keep localStorage as cache

2. **Automatic Cleanup**

   - After 30 days, remove email-based keys
   - Only keep UID-based keys for active users

3. **Profile Photo Compression**
   - Currently: 0.9 quality JPEG
   - Improvement: WebP format (~30% smaller)

## References

- AuthContext: `src/contexts/AuthContext.jsx`
- Header Component: `src/components/Header.jsx`
- Settings Page: `src/pages/Settings.jsx`
- Profile Page: `src/pages/Profile.jsx`
- Drafts Page: `src/pages/Drafts.jsx`
- Debug Script: `public/debug-profile-photos.js`
- Migration Script: `public/migrate-all-photos.js`
