# Password Management Feature Guide

## Overview

Fremio sekarang memiliki sistem manajemen password lengkap dengan Firebase Authentication, termasuk:

- 🔐 Change Password (di Dashboard Settings)
- 📧 Forgot Password (reset via email)
- ✅ Password strength validation
- 🔒 Re-authentication untuk security

## Features Implemented

### 1. Forgot Password (Login Page)

**Location**: `/login` → Click "Forgot password?"

**Flow:**

1. User clicks "Forgot password?" link
2. Enter email address
3. Firebase sends password reset email
4. User clicks link in email
5. Redirected to Firebase reset page
6. Enter new password
7. Back to login with new password

**UI States:**

- ✅ Success: "Password reset link has been sent to your email!"
- ❌ Error: "No account found with this email address"
- ⏳ Loading: "Sending..." button state

**Code Reference:**

```javascript
// Login.jsx - handleForgotPassword()
await sendPasswordResetEmail(auth, resetEmail);
```

### 2. Change Password (Settings Page)

**Location**: `/settings` → Security tab

**Requirements:**

- User must be logged in
- Must provide current password (re-authentication)
- New password minimum 6 characters
- Confirm password must match

**Validation Rules:**

1. ❌ All fields required
2. ❌ New password < 6 characters
3. ❌ Passwords don't match
4. ❌ New password same as current
5. ❌ Current password incorrect

**Flow:**

1. Navigate to Settings → Security tab
2. Fill in form:
   - Current Password
   - New Password
   - Confirm New Password
3. Click "Change Password"
4. System re-authenticates with current password
5. Updates to new password
6. Success message shown
7. Form clears

**Code Reference:**

```javascript
// AuthContext.jsx - changePassword()
const credential = EmailAuthProvider.credential(email, currentPassword);
await reauthenticateWithCredential(currentUser, credential);
await updatePassword(currentUser, newPassword);
```

## Implementation Details

### AuthContext Updates

**New Functions:**

```javascript
// Change password for logged-in user
async function changePassword(currentPassword, newPassword)

// Send password reset email
async function resetPassword(email)
```

**Firebase Imports Added:**

```javascript
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
```

### Settings Page Updates

**New State:**

```javascript
const [passwordData, setPasswordData] = useState({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const [passwordError, setPasswordError] = useState("");
const [passwordSuccess, setPasswordSuccess] = useState("");
const [passwordLoading, setPasswordLoading] = useState(false);
```

**New Tab:**

- Account (existing)
- Preferences (existing)
- Privacy (existing)
- **Security (NEW)** ← Change password here

### Login Page Updates

**Existing Features:**

- Toggle between login and forgot password view
- Email validation
- Success/Error messages
- Auto-close forgot password after success

## UI/UX Design

### Security Tab Layout

```
┌─────────────────────────────────────┐
│ Change Password                      │
├─────────────────────────────────────┤
│                                      │
│ [Success/Error Message Box]          │
│                                      │
│ Current Password                     │
│ [••••••••••••]                      │
│                                      │
│ New Password                         │
│ [••••••••••••]                      │
│                                      │
│ Confirm New Password                 │
│ [••••••••••••]                      │
│                                      │
│ [Change Password]                    │
├─────────────────────────────────────┤
│ Two-Factor Authentication            │
│ (Coming Soon - Disabled)             │
└─────────────────────────────────────┘
```

### Forgot Password Flow

```
Login Page
    ↓
Click "Forgot password?"
    ↓
Enter Email
    ↓
Click "Send Reset Link"
    ↓
Check Email
    ↓
Click Link in Email
    ↓
Firebase Reset Page
    ↓
Enter New Password
    ↓
Back to Login
```

## Error Handling

### Change Password Errors

| Error Code                   | User Message                                             |
| ---------------------------- | -------------------------------------------------------- |
| `auth/wrong-password`        | "Current password is incorrect"                          |
| `auth/weak-password`         | "New password should be at least 6 characters"           |
| `auth/requires-recent-login` | "Please logout and login again before changing password" |

### Forgot Password Errors

| Error Code            | User Message                                             |
| --------------------- | -------------------------------------------------------- |
| `auth/user-not-found` | "No account found with this email address"               |
| `auth/invalid-email`  | "Invalid email address"                                  |
| Generic               | "Failed to send password reset email. Please try again." |

## Testing Checklist

### Change Password Feature

- [ ] Navigate to Settings → Security tab
- [ ] Submit empty form → Error shown
- [ ] Enter wrong current password → Error: "Current password is incorrect"
- [ ] Enter weak new password (< 6 chars) → Error shown
- [ ] Enter mismatched passwords → Error: "New passwords do not match"
- [ ] Enter same password as current → Error shown
- [ ] Enter valid data → Success message shown
- [ ] Form clears after success
- [ ] Can login with new password

### Forgot Password Feature

- [ ] Click "Forgot password?" on login page
- [ ] Submit empty email → Error shown
- [ ] Enter non-existent email → Error: "No account found"
- [ ] Enter invalid email format → Error shown
- [ ] Enter valid email → Success message shown
- [ ] Check email inbox for reset link
- [ ] Click reset link → Opens Firebase page
- [ ] Enter new password → Redirected to app
- [ ] Can login with new password
- [ ] Click "Back to Login" → Returns to login form

## Security Considerations

### Re-authentication Required

Change password requires re-authentication untuk security:

```javascript
// Re-authenticate before password change
const credential = EmailAuthProvider.credential(email, currentPassword);
await reauthenticateWithCredential(currentUser, credential);
```

**Why?**

- Prevents unauthorized password changes
- Protects against session hijacking
- Firebase security best practice

### Password Reset Email

Firebase automatically sends secure reset emails with:

- ✅ Time-limited reset links
- ✅ One-time use tokens
- ✅ Automatic expiration
- ✅ No password sent in email

## Customization Options

### Email Template

Currently using Firebase default email template. To customize:

1. Go to Firebase Console
2. Authentication → Templates → Password reset
3. Customize template:
   - Subject line
   - Email body
   - Sender name
   - Action URL

### Password Strength Requirements

Current: Minimum 6 characters (Firebase default)

To add custom validation:

```javascript
// Add to handleChangePassword()
const hasUpperCase = /[A-Z]/.test(newPassword);
const hasLowerCase = /[a-z]/.test(newPassword);
const hasNumbers = /\d/.test(newPassword);
const hasSpecialChar = /[!@#$%^&*]/.test(newPassword);

if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
  setPasswordError("Password must contain uppercase, lowercase, and numbers");
  return;
}
```

## Future Improvements

### Planned Features

1. **Password Strength Indicator**

   - Visual bar showing password strength
   - Real-time feedback while typing
   - Color coding: red/yellow/green

2. **Two-Factor Authentication (2FA)**

   - SMS verification
   - Authenticator app support
   - Backup codes

3. **Password History**

   - Prevent reusing last 5 passwords
   - Store hashed password history

4. **Account Security Notifications**

   - Email notification on password change
   - Login alerts for new devices
   - Suspicious activity detection

5. **Custom Email Templates**
   - Branded password reset emails
   - Multi-language support
   - Custom redirect URLs

## Troubleshooting

### Issue: "Please logout and login again before changing password"

**Cause:** Firebase requires recent authentication for security-sensitive operations.

**Solution:**

1. Logout from app
2. Login again
3. Try changing password immediately

### Issue: Reset email not received

**Check:**

1. Spam/Junk folder
2. Email address spelling
3. Firebase email configuration
4. Firestore email delivery logs

**Debug:**

```javascript
// Check Firebase Console → Authentication → Users
// Verify email is correct
// Check email delivery logs
```

### Issue: Reset link expired

**Solution:**

- Request new reset link
- Links expire after 1 hour (Firebase default)

## Code References

### Files Modified

1. **`src/contexts/AuthContext.jsx`**

   - Added `changePassword()` function
   - Added `resetPassword()` function
   - Added Firebase auth imports

2. **`src/pages/Settings.jsx`**

   - Added Security tab
   - Added password change form
   - Added validation and error handling

3. **`src/pages/Login.jsx`**
   - Already had forgot password feature
   - Toggle UI between login/reset
   - Email validation

### Key Functions

```javascript
// AuthContext.jsx
changePassword(currentPassword, newPassword)
  → Re-authenticate with current password
  → Update to new password
  → Return success/error

resetPassword(email)
  → Send Firebase password reset email
  → Return success/error

// Settings.jsx
handleChangePassword(e)
  → Validate form inputs
  → Call changePassword()
  → Show success/error
  → Clear form on success

// Login.jsx
handleForgotPassword(e)
  → Validate email
  → Send reset email
  → Show success message
  → Auto-close after 3s
```

## Summary

✅ **Implemented:**

- Change password in Settings → Security tab
- Forgot password on Login page
- Email-based password reset
- Form validation and error handling
- Re-authentication security
- Success/Error messaging
- Loading states

🔄 **In Progress:**

- None

⏳ **Planned:**

- Two-factor authentication
- Password strength indicator
- Custom email templates
- Account security notifications

---

**Last Updated:** November 25, 2025
**Version:** 1.0.0
