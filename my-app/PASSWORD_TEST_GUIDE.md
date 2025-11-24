# Quick Test Guide - Password Management

## 🧪 Test Forgot Password

### 1. Access Login Page

```
URL: http://localhost:5173/fremio/login
```

### 2. Test Forgot Password Flow

1. ✅ Click "Forgot password?" link
2. ✅ Verify UI changes to reset form
3. ✅ Enter valid email: `test@example.com`
4. ✅ Click "Send Reset Link"
5. ✅ Check success message appears
6. ✅ Check email inbox for reset link
7. ✅ Click "Back to Login" button
8. ✅ Verify returns to login form

### 3. Test Error Cases

- ❌ Empty email → Error: "Please enter your email address"
- ❌ Invalid email → Error: "Invalid email address"
- ❌ Non-existent email → Error: "No account found with this email address"

---

## 🔐 Test Change Password

### 1. Login First

```
URL: http://localhost:5173/fremio/login
Email: your-email@example.com
Password: your-password
```

### 2. Navigate to Settings

```
URL: http://localhost:5173/fremio/settings
Click: Security tab
```

### 3. Test Change Password Form

1. ✅ See form with 3 password fields
2. ✅ Fill all fields:
   - Current Password: (your current password)
   - New Password: `newpassword123`
   - Confirm New Password: `newpassword123`
3. ✅ Click "Change Password"
4. ✅ See success message
5. ✅ Form clears automatically
6. ✅ Logout and login with new password

### 4. Test Validation Errors

Test these scenarios (should show errors):

**Empty Fields:**

- ❌ Leave all fields empty → "All fields are required"

**Weak Password:**

- Current: `oldpass`
- New: `12345` (< 6 chars)
- Confirm: `12345`
- ❌ Error: "New password must be at least 6 characters"

**Password Mismatch:**

- Current: `oldpass`
- New: `newpass123`
- Confirm: `newpass456`
- ❌ Error: "New passwords do not match"

**Same Password:**

- Current: `oldpass`
- New: `oldpass`
- Confirm: `oldpass`
- ❌ Error: "New password must be different from current password"

**Wrong Current Password:**

- Current: `wrongpassword`
- New: `newpass123`
- Confirm: `newpass123`
- ❌ Error: "Current password is incorrect"

---

## 📊 Test Checklist

### Forgot Password

- [ ] Link visible on login page
- [ ] Toggle to reset form works
- [ ] Email validation works
- [ ] Send button has loading state
- [ ] Success message shows
- [ ] Email actually sent
- [ ] Back button works
- [ ] Error messages display correctly

### Change Password

- [ ] Security tab exists
- [ ] Form renders correctly
- [ ] All 3 password fields present
- [ ] Validation works for empty fields
- [ ] Validation works for weak password
- [ ] Validation works for mismatch
- [ ] Validation works for same password
- [ ] Wrong current password detected
- [ ] Success message shows
- [ ] Form clears after success
- [ ] Can login with new password
- [ ] Loading state during change

### UI/UX

- [ ] Error messages red background
- [ ] Success messages green background
- [ ] Button disabled during loading
- [ ] Input fields have focus styling
- [ ] Tab navigation works
- [ ] Mobile responsive
- [ ] No console errors

---

## 🔍 Browser Console Checks

### Expected Console Logs

**On successful password change:**

```
✅ Password changed successfully
```

**On successful reset email:**

```
✅ Password reset email sent
```

**On error:**

```
❌ Change password error: [error details]
❌ Reset password error: [error details]
```

### Firebase Console Checks

1. **Authentication → Users**

   - User email should be listed
   - Email verified status

2. **Authentication → Templates**
   - Password reset template
   - Check if emails are being sent

---

## 🚀 Quick Test Commands

### Open Browser Dev Tools

```
F12 or Ctrl+Shift+I
```

### Check localStorage

```javascript
// Check current user
JSON.parse(localStorage.getItem("fremio_user"));

// Check all localStorage
Object.keys(localStorage);
```

### Manual Password Reset

```javascript
// In console, if needed
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./config/firebase";

await sendPasswordResetEmail(auth, "test@example.com");
```

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to send reset email"

**Solution:**

1. Check internet connection
2. Verify Firebase project is active
3. Check email quota in Firebase Console

### Issue: "Current password is incorrect"

**Solution:**

1. Double-check password typing
2. Try copy-paste to avoid typos
3. Use "Show password" if available

### Issue: Reset email not received

**Check:**

1. Spam/Junk folder
2. Wait 1-2 minutes
3. Check email address spelling
4. Firebase Console → Authentication logs

### Issue: Reset link expired

**Solution:**

- Request new link
- Links expire after 1 hour

---

## ✅ Success Criteria

All features working if:

- ✅ Can send reset email
- ✅ Can receive reset email
- ✅ Can change password in Settings
- ✅ All validation errors show correctly
- ✅ Can login with new password
- ✅ No console errors
- ✅ UI is responsive
- ✅ Loading states work

---

**Test Date:** [Fill in when testing]
**Tester:** [Your name]
**Browser:** [Chrome/Firefox/Safari/Edge]
**Status:** [ ] Pass / [ ] Fail
**Notes:** [Any issues found]
