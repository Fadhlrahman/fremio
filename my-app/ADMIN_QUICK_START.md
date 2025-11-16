# Admin Panel - Quick Start Guide 🚀

## Login ke Admin Panel

1. **Buka halaman login**: `http://localhost:5174/fremio/login`

2. **Masukkan credentials**:

   - Email: `admin@admin.com`
   - Password: `admin`

3. **Klik Login** - Anda akan otomatis diarahkan ke `/admin/dashboard`

## Menu Navigation

### 📊 Dashboard

**Path**: `/admin/dashboard`

Melihat overview platform:

- Total users, frames, pending reviews
- Quick stats untuk applications & frames
- Quick actions ke semua fitur

**Actions**:

- Klik stat card untuk navigate ke halaman detail
- Gunakan quick action buttons untuk akses cepat

---

### 👥 Manage Users

**Path**: `/admin/users`

Mengelola semua users:

**Search & Filter**:

1. Gunakan search box untuk cari by name/email/phone
2. Filter by role: All, Admin, Kreator, User
3. Filter by status: All, Active, Banned

**User Actions**:

- **Promote to Kreator**: Klik button "Promote" untuk upgrade user
- **Ban User**: Klik "Ban" untuk disable user access
- **Unban User**: Klik "Unban" untuk restore access
- **Delete User**: Klik trash icon (PERMANENT - hati-hati!)

---

### 🖼️ Manage Frames

**Path**: `/admin/frames`

Review dan approve frames dari kreators:

**Filter Frames**:

- All: Semua frames
- Pending Review: Yang butuh approval
- Approved: Yang sudah dipublish
- Rejected: Yang ditolak
- Draft: Yang masih draft

**Review Process**:

1. Klik filter "Pending Review"
2. Lihat frame preview dan details
3. Pilih action:
   - **Approve**: Publish frame ke marketplace
   - **Request Changes**: Minta kreator revisi (beri feedback)
   - **Reject**: Tolak frame (beri reason)

---

### ⬆️ Upload Frame

**Path**: `/admin/upload-frame`

Admin bisa upload frame sendiri:

**Step-by-Step**:

1. **Upload PNG Image**:
   - Klik area upload
   - Pilih file PNG (recommended 1080x1920px)
2. **Fill Frame Info**:

   - Nama frame (required)
   - Description
   - Category
   - Jumlah foto (1-10)
   - Centang "Duplicate photos" jika perlu

3. **Configure Slots**:

   - Klik "Tambah Slot"
   - Atur posisi dengan values 0.0-1.0:
     - Kiri: horizontal position
     - Atas: vertical position
     - Lebar: slot width
     - Tinggi: slot height
   - Pilih aspect ratio
   - Assign photo index

4. **Preview**:

   - Klik "Tampilkan" untuk live preview
   - Cek posisi slots overlay di frame

5. **Save**:
   - Klik "Simpan Frame"
   - Frame langsung available di marketplace

---

### 📝 Kreator Applications

**Path**: `/admin/applications`

Review aplikasi user yang mau jadi kreator:

**Review Application**:

1. Filter "Pending" untuk lihat new applications
2. Review informasi applicant:
   - Portfolio link (klik untuk buka)
   - Motivation
   - Experience
3. Decide:
   - **Approve**: User jadi kreator, bisa create frames
   - **Reject**: Berikan reason kenapa ditolak

**Best Practice**:

- Check portfolio link apakah valid
- Pastikan motivation serius
- Experience relevant dengan design/photography

---

### ⚙️ Settings

**Path**: `/admin/settings`

Configure platform settings:

#### General Tab

- Site name, description, URL
- Contact email
- Toggle registration on/off
- Maintenance mode

#### Frames Tab

- Max frames per user type
- Auto-approve trusted kreators
- Duplicate photos setting

#### Uploads Tab

- File size limits
- Allowed formats

#### Email Tab

- Enable notifications
- Choose notification types

#### Security Tab

- Email verification requirement
- Password rules
- Session settings

#### Database Tab

- View Firebase status
- See stats (users, frames, DB size)
- Export/Import data
- Clear cache

**Saving Settings**:

- Edit values yang diinginkan
- Klik "Save Settings" di bottom
- Settings tersimpan di localStorage (atau Firebase jika configured)

---

## Common Tasks

### ✅ Approve New Kreator

1. Dashboard → Review Applications
2. Atau direct: `/admin/applications`
3. Filter "Pending"
4. Review application details
5. Klik "Approve"
6. User role otomatis upgraded ke kreator

### ✅ Approve Submitted Frame

1. Dashboard → Manage Frames
2. Atau direct: `/admin/frames`
3. Filter "Pending Review"
4. Review frame preview
5. Klik "Approve"
6. Frame publish ke marketplace

### ✅ Ban Problematic User

1. Go to: `/admin/users`
2. Search user by name/email
3. Klik "Ban" button
4. Confirm action
5. User tidak bisa login lagi

### ✅ Upload Custom Frame

1. Go to: `/admin/upload-frame`
2. Upload PNG frame image
3. Configure frame details
4. Add photo slots
5. Preview result
6. Save frame

### ✅ Change Platform Settings

1. Go to: `/admin/settings`
2. Pilih tab yang relevan
3. Edit settings
4. Klik "Save Settings"

---

## Tips & Best Practices

### 🎯 Frame Review

- **Check Quality**: Frame harus high quality dan tidak blur
- **Check Slots**: Pastikan slot positions make sense
- **Check Copyright**: Jangan approve frame yang copyrighted
- **Give Feedback**: Kalau request changes, be specific

### 🎯 User Management

- **Be Fair**: Review applications objectively
- **Communicate**: Reject dengan reason yang clear
- **Monitor**: Regular check banned users apakah perlu unban

### 🎯 Settings Management

- **Test First**: Jangan langsung production setting changes
- **Backup**: Export data sebelum major changes
- **Document**: Catat perubahan settings penting

### 🎯 Security

- **Strong Password**: Ganti default admin password
- **Regular Audit**: Check user activities regularly
- **Limited Access**: Jangan share admin credentials

---

## Keyboard Shortcuts

Belum ada keyboard shortcuts, tapi planned:

- `Ctrl + K`: Quick search
- `Ctrl + /`: Open command palette
- `A`: Approve (di review pages)
- `R`: Reject (di review pages)

---

## Troubleshooting

### "Firebase not configured" warning

**Solusi**: Setup Firebase di `src/config/firebase.js`

- Get Firebase config dari Firebase Console
- Copy ke firebaseConfig object
- Set `isFirebaseConfigured = true`

### CSS tidak update

**Solusi**: Hard refresh browser

- Windows: `Ctrl + Shift + R` atau `Ctrl + F5`
- Mac: `Cmd + Shift + R`
- Atau buka Incognito mode

### Admin tidak bisa login

**Check**:

1. Credentials benar: `admin@admin.com` / `admin`
2. AuthContext configured correct
3. Check browser console untuk errors

### Page blank setelah login

**Check**:

1. Routes configured di App.jsx
2. AdminLayout import correct
3. Browser console untuk component errors

---

## Support & Documentation

### Files to Reference

- **Full Documentation**: `ADMIN_PANEL_DOCUMENTATION.md`
- **Admin CSS**: `src/styles/admin.css`
- **Admin Layout**: `src/layouts/AdminLayout.jsx`
- **Auth Context**: `src/contexts/AuthContext.jsx`

### Component Examples

Lihat existing admin pages untuk examples:

- `AdminDashboard.jsx`: Stats & overview
- `AdminUsers.jsx`: List dengan search/filter
- `AdminFrames.jsx`: Review workflow
- `AdminSettings.jsx`: Tab navigation & forms

---

## Quick Reference

### URLs

- Login: `/login`
- Dashboard: `/admin/dashboard`
- Users: `/admin/users`
- Frames: `/admin/frames`
- Upload: `/admin/upload-frame`
- Applications: `/admin/applications`
- Settings: `/admin/settings`

### Credentials

- Email: `admin@admin.com`
- Password: `admin`

### Design Colors

- Accent: `#e0b7a9`
- Border: `#ecdeda`
- Background: `#fdf7f4` → `#fff` → `#f7f1ed`

Happy managing! 🎉
