# Firebase Email Configuration Guide

## Mencegah Email Masuk Spam

Email reset password dari Firebase bisa masuk spam jika tidak dikonfigurasi dengan benar. Ikuti langkah-langkah berikut:

### 1. Configure Email Template di Firebase Console

#### A. Buka Firebase Console

```
https://console.firebase.google.com/
```

#### B. Pilih Project "FREMIO" (fremio-64884)

#### C. Navigasi ke Authentication

```
Authentication → Templates → Password reset
```

#### D. Customize Email Template

**Subject Line:**

```
Reset your Fremio password
```

**Sender Name:**

```
Fremio Support
```

**Email Body Template:**

```html
<p>Hello,</p>

<p>We received a request to reset your password for your Fremio account.</p>

<p>Click the button below to reset your password:</p>

<p style="text-align: center; margin: 30px 0;">
  <a
    href="%LINK%"
    style="background: linear-gradient(to right, #e0b7a9, #c89585); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;"
  >
    Reset Password
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p style="word-break: break-all; color: #666;">%LINK%</p>

<p>This link will expire in 1 hour.</p>

<p>
  If you didn't request a password reset, you can safely ignore this email. Your
  password won't be changed.
</p>

<p>
  Best regards,<br />
  <strong>Fremio Team</strong>
</p>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;" />

<p style="font-size: 12px; color: #999;">
  This is an automated email. Please do not reply to this message.
</p>
```

### 2. Configure Domain Authentication (Advanced)

Untuk hasil terbaik, setup domain authentication:

#### A. Add Custom Email Action Handler (Optional)

Buat custom domain untuk action handler:

```
https://yourdomain.com/__/auth/action
```

#### B. Setup SPF Record

Add ke DNS settings domain Anda:

```
TXT record:
v=spf1 include:_spf.firebasemail.com ~all
```

#### C. Setup DKIM (Domain Keys)

Firebase otomatis handle DKIM, tapi pastikan:

- Domain verified di Firebase
- Email authentication enabled

### 3. Tips Menghindari Spam Filter

#### ✅ DO's:

1. **Use Clear Subject Lines**

   - ✅ "Reset your Fremio password"
   - ❌ "URGENT!!! RESET PASSWORD NOW!!!"

2. **Professional Email Content**

   - Use proper grammar
   - Include company name
   - Add footer with contact info
   - Include unsubscribe option (for marketing emails)

3. **Consistent Sender Name**

   - Always use same sender name
   - Use company/brand name
   - Avoid generic names like "noreply"

4. **Include Plain Text Version**

   - Firebase automatically generates plain text
   - Ensure HTML is well-formatted

5. **Proper Links**
   - Use HTTPS links
   - Include full URL in text (not just "click here")
   - Action URL should match your domain

#### ❌ DON'Ts:

1. ❌ ALL CAPS in subject
2. ❌ Too many exclamation marks!!!
3. ❌ Spam trigger words: "FREE", "URGENT", "ACT NOW"
4. ❌ Too many links in one email
5. ❌ Large images without alt text
6. ❌ Shortened URLs (bit.ly, etc)

### 4. Testing Email Delivery

#### A. Test with Different Email Providers

Test reset password dengan:

- [ ] Gmail
- [ ] Yahoo Mail
- [ ] Outlook/Hotmail
- [ ] Corporate email

#### B. Check Spam Score

Gunakan tools:

- [Mail Tester](https://www.mail-tester.com/)
- [GlockApps](https://glockapps.com/)

**Steps:**

1. Send test email
2. Forward ke test email address
3. Check spam score
4. Fix issues if score < 8/10

#### C. Monitor Email Delivery

Firebase Console → Authentication → Email delivery logs

Check for:

- Bounce rate
- Spam complaints
- Delivery failures

### 5. Action Code Settings (Code Implementation)

Sudah diimplementasi di `Login.jsx`:

```javascript
const actionCodeSettings = {
  url: window.location.origin + "/login",
  handleCodeInApp: false,
};

await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
```

**Benefits:**

- ✅ Custom redirect URL
- ✅ Better tracking
- ✅ Consistent branding
- ✅ Less likely to be flagged as spam

### 6. User Instructions

Update UI dengan petunjuk untuk user:

**Di Login Page:**

```
💡 Check your spam/junk folder if you don't see the email
```

**Di Success Message:**

```
✅ Password reset link has been sent!
Please check your email (including spam/junk folder if needed).
```

**Timeout:** 5 detik (agar user sempat baca pesan)

### 7. Troubleshooting Common Issues

#### Issue: Email masuk spam di Gmail

**Solutions:**

1. Ask users to mark as "Not Spam"
2. Add sender to contacts
3. Setup custom domain
4. Improve email content
5. Check SPF/DKIM records

#### Issue: Email tidak terkirim sama sekali

**Check:**

1. Firebase quota (25K emails/day free tier)
2. Email template aktif
3. Authentication enabled
4. Valid email address
5. No typos in email

#### Issue: Email delay (lambat terkirim)

**Normal:** 1-5 menit
**If > 10 menit:**

1. Check Firebase status
2. Check email provider status
3. Verify network connection
4. Try different email address

### 8. Email Quota Management

**Firebase Free Tier:**

- 25,000 emails/day
- 100 emails/hour per user

**If approaching limit:**

1. Implement rate limiting
2. Add cooldown period
3. Show "Too many requests" error
4. Consider upgrading plan

**Code Implementation:**

```javascript
if (error.code === "auth/too-many-requests") {
  setError("Too many requests. Please try again later.");
}
```

### 9. Best Practices

#### For Development:

- Use test email accounts
- Don't spam your own inbox
- Monitor Firebase logs
- Test on multiple devices

#### For Production:

- Setup domain authentication
- Monitor email delivery rates
- Collect user feedback
- A/B test email templates
- Keep templates updated

### 10. Monitoring & Analytics

**Track:**

- Email sent count
- Bounce rate
- Spam complaint rate
- Click-through rate
- Password reset success rate

**Firebase Console:**

```
Authentication → Email delivery → View logs
```

**Metrics to Watch:**

- Sent: Should be high
- Delivered: Should match sent
- Bounced: Should be < 2%
- Spam complaints: Should be 0%

---

## Quick Checklist

Before going live:

- [ ] Email template customized
- [ ] Sender name set
- [ ] Subject line clear
- [ ] Links use HTTPS
- [ ] Plain text version exists
- [ ] Tested on multiple email providers
- [ ] Spam score > 8/10
- [ ] Rate limiting implemented
- [ ] User instructions clear
- [ ] Error handling complete
- [ ] Monitoring setup
- [ ] Backup plan ready

---

## Support Resources

**Firebase Documentation:**

- [Email Templates](https://firebase.google.com/docs/auth/custom-email-handler)
- [Email Customization](https://firebase.google.com/docs/auth/web/email-link-auth)

**Spam Testing:**

- [Mail Tester](https://www.mail-tester.com/)
- [SpamAssassin](https://spamassassin.apache.org/)

**Email Best Practices:**

- [Gmail Sender Guidelines](https://support.google.com/mail/answer/81126)
- [Microsoft Anti-Spam](https://docs.microsoft.com/en-us/microsoft-365/security/office-365-security/)

---

**Last Updated:** November 25, 2025
**Status:** Production Ready ✅
