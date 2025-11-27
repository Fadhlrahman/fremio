# 🔧 Admin Frames - Troubleshooting Guide

## 🐛 **MASALAH YANG DITEMUKAN**

### **Problem:**
1. ❌ Frame yang diupload di `/admin/upload-frame` tidak muncul di `/admin/frames`
2. ❌ Frame "test" yang tidak dikenal muncul di manage frames
3. ❌ Delete button mengatakan "berhasil" tapi frame tidak terhapus
4. ❌ User hanya melihat 1 frame padahal upload lebih dari itu

### **Root Cause:**
`AdminFrames.jsx` sebelumnya **membaca dari Firestore** (bukan localStorage!) karena:
```javascript
if (!isFirebaseConfigured) {
  // Load from localStorage
} else {
  // Load from Firestore ❌ SALAH!
}
```

Tapi `AdminUploadFrame.jsx` **menyimpan ke localStorage**, jadi:
- Upload → localStorage ✅
- Display → Firestore ❌ (data berbeda!)
- Delete → localStorage ✅ (tapi UI baca dari Firestore!)

---

## ✅ **SOLUSI YANG DITERAPKAN**

### **1. Fix AdminFrames.jsx - Always Read from localStorage**

**Before:**
```javascript
const fetchData = async () => {
  if (!isFirebaseConfigured) {
    // Load from localStorage
  } else {
    // Load from Firestore ❌
    const { getAllFrames } = await import("frameManagementService");
  }
};
```

**After:**
```javascript
const fetchData = async () => {
  // ALWAYS load from localStorage (where AdminUploadFrame saves)
  console.log("📂 Loading custom frames from localStorage...");
  const customFrames = getAllCustomFrames();
  console.log(`✅ Found ${customFrames.length} custom frame(s)`);
  
  setFrames(customFrames);
  setStats({ total: customFrames.length });
};
```

### **2. Enhanced Delete Logging**

Added detailed console logs untuk debugging:

```javascript
// In customFrameService.js
export const deleteCustomFrame = (frameId) => {
  console.log("🗑️ deleteCustomFrame called with ID:", frameId);
  console.log("📋 Current frames before delete:", frames.length);
  console.log("📋 Frame IDs:", frames.map(f => f.id));
  
  // ... delete logic ...
  
  console.log("✅ Verification: frames now =", verify.length);
};
```

### **3. Added Frame ID to Confirmation Dialog**

Sekarang confirmation popup menampilkan **ID** frame untuk memudahkan debugging:

```
⚠️ Hapus Frame?

Nama: Pasted Image
ID: pasted-1732501234567

Frame akan dihapus permanen...
```

---

## 🔍 **DEBUGGING STEPS**

### **Step 1: Check localStorage Content**

Buka https://localhost:5173/fremio/my-app/check-storage.html

Atau via browser console:
```javascript
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
console.log('Total frames:', frames.length);
frames.forEach((f, idx) => {
  console.log(`${idx + 1}. ID: ${f.id}, Name: ${f.name}`);
});
```

### **Step 2: Check Console Logs**

Saat membuka `/admin/frames`, harus muncul:
```
📂 Loading custom frames from localStorage...
✅ Found X custom frame(s)
```

Saat delete frame:
```
🗑️ Delete button clicked for frame: frame-id, Frame Name
🔄 Deleting frame: frame-id
🗑️ deleteCustomFrame called with ID: frame-id
📋 Current frames before delete: 3
📋 Frame IDs: ["frame1", "frame2", "frame3"]
🎯 Found frame to delete: Frame Name
📋 Frames after filter: 2
💾 Saved to localStorage
✅ Verification: frames now = 2
✅ Frame deleted successfully!
🔄 Refreshing frame list...
📂 Loading custom frames from localStorage...
✅ Found 2 custom frame(s)
```

### **Step 3: Clear Ghost Frames**

Jika ada frame yang tidak dikenal (seperti "test"), clear dengan:

```javascript
// Via console
localStorage.removeItem('custom_frames');
location.reload();
```

Atau gunakan Clear Storage button di `/admin/upload-frame`.

---

## 📋 **VERIFICATION CHECKLIST**

### **Test Upload → Display Flow:**

1. ✅ Upload frame baru di `/admin/upload-frame`
2. ✅ Buka `/admin/frames`
3. ✅ Frame baru muncul di list
4. ✅ Nama & thumbnail benar
5. ✅ Stats (views, uses, likes) = 0

### **Test Delete Flow:**

1. ✅ Klik tombol "Hapus"
2. ✅ Confirmation popup muncul dengan nama & ID
3. ✅ Klik OK
4. ✅ Success alert muncul
5. ✅ Frame hilang dari list
6. ✅ Total count berkurang
7. ✅ Refresh page → frame masih hilang
8. ✅ Console log lengkap tanpa error

### **Test User Visibility:**

1. ✅ Buka `/edit-photo` (user page)
2. ✅ Frame yang diupload muncul di frame selector
3. ✅ Delete frame di admin
4. ✅ Refresh `/edit-photo`
5. ✅ Frame sudah tidak muncul

---

## 🚨 **COMMON ISSUES & FIXES**

### **Issue 1: Frame muncul tapi thumbnail kosong**

**Symptom:** Frame card ada tapi gambar tidak muncul

**Cause:** `imagePath` tidak tersimpan dengan benar

**Fix:**
```javascript
// Check in console:
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
console.log(frames[0].imagePath); // Should start with "data:image/"

// If null or undefined, re-upload frame
```

### **Issue 2: Delete berhasil tapi frame masih ada setelah refresh**

**Symptom:** Alert "berhasil" tapi frame masih muncul

**Cause:** Possible localStorage corruption atau cache

**Fix:**
```javascript
// Force clear and re-check
localStorage.removeItem('custom_frames');
location.reload();

// Re-upload all frames
```

### **Issue 3: Frame count tidak match**

**Symptom:** Stats bilang "3 frames" tapi hanya 1 yang tampil

**Cause:** Possible duplicate keys atau corrupted data

**Fix:**
```javascript
// Clean up localStorage
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
const cleaned = frames.filter(f => f && f.id && f.name && f.imagePath);
localStorage.setItem('custom_frames', JSON.stringify(cleaned));
location.reload();
```

### **Issue 4: "Frame tidak ditemukan" saat delete**

**Symptom:** Error message "Frame tidak ditemukan"

**Cause:** Frame ID mismatch

**Fix:**
```javascript
// Check frame IDs
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
console.log('Frame IDs:', frames.map(f => f.id));

// Compare with UI - frame ID should match exactly
```

---

## 🧹 **CLEAN SLATE PROCEDURE**

Jika semua kacau dan ingin start fresh:

### **Step 1: Clear All Data**
```javascript
// Open console
localStorage.clear();
sessionStorage.clear();
```

### **Step 2: Verify Clean**
```javascript
console.log('localStorage keys:', localStorage.length); // Should be 0
```

### **Step 3: Refresh**
```javascript
location.reload();
```

### **Step 4: Re-upload Frames**
- Go to `/admin/upload-frame`
- Upload frames satu per satu
- Verify each appears in `/admin/frames` before uploading next

---

## 📊 **STORAGE STRUCTURE**

### **localStorage Key:**
```
custom_frames
```

### **Data Structure:**
```javascript
[
  {
    id: "pasted-1732501234567",
    name: "Pasted Image",
    description: "Test frame",
    imagePath: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    thumbnailUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    maxCaptures: 1,
    duplicatePhotos: false,
    slots: [ /* slot definitions */ ],
    layout: { /* layout config */ },
    category: "custom",
    createdBy: "xhDAJ8tk8dPUf6Sbm3otlGIzSH3",
    createdAt: "2024-11-25T10:30:00.000Z",
    updatedAt: "2024-11-25T10:30:00.000Z",
    views: 0,
    uses: 0,
    likes: 0
  }
]
```

### **Size Estimate:**
- Base frame data: ~0.5 KB
- Compressed JPEG (720p, 50%): ~80 KB
- **Total per frame: ~80-85 KB**
- **Capacity: ~125 frames in 10MB localStorage**

---

## 🔐 **SECURITY NOTES**

### **No Authentication Check:**
Current implementation doesn't verify admin status before delete.

**Risk:** Any user with localStorage access can delete frames.

**Future Fix:** Add admin verification:
```javascript
const handleDelete = async () => {
  // Verify admin
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (!isAdmin) {
    alert('❌ Unauthorized');
    return;
  }
  
  // ... delete logic
};
```

### **No Backup:**
Deleted frames cannot be recovered.

**Future Fix:** Implement soft delete with 30-day retention:
```javascript
// Instead of deleting, mark as deleted
frame.deletedAt = new Date().toISOString();
frame.deletedBy = currentUser.uid;

// Filter in getAllCustomFrames
const active = frames.filter(f => !f.deletedAt);
```

---

## 📞 **SUPPORT COMMANDS**

### **Quick Diagnostics:**
```javascript
// Run in console at /admin/frames
console.log('=== DIAGNOSTICS ===');
console.log('Firebase configured:', typeof firebase !== 'undefined');
console.log('LocalStorage frames:', JSON.parse(localStorage.getItem('custom_frames') || '[]').length);
console.log('Session user:', localStorage.getItem('isAdmin'));
```

### **Export Frames (Backup):**
```javascript
// Export to JSON file
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
const dataStr = JSON.stringify(frames, null, 2);
const blob = new Blob([dataStr], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'custom_frames_backup.json';
a.click();
```

### **Import Frames (Restore):**
```javascript
// Read from file input
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'application/json';
fileInput.onchange = (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const frames = JSON.parse(e.target.result);
    localStorage.setItem('custom_frames', JSON.stringify(frames));
    location.reload();
  };
  reader.readAsText(file);
};
fileInput.click();
```

---

## ✅ **FINAL VERIFICATION**

Setelah fix diterapkan, verify dengan:

1. **Upload Test:**
   - Upload 1 frame → Harus langsung muncul di manage
   
2. **Delete Test:**
   - Delete frame → Harus hilang dan tidak muncul lagi
   
3. **Consistency Test:**
   - Upload 3 frame → Total count = 3
   - Delete 1 → Total count = 2
   - Refresh → Masih 2
   
4. **User Test:**
   - Frame di admin muncul di user `/edit-photo`
   - Delete di admin → Hilang dari user

**Expected Result:** ✅ All tests pass, no ghost frames, delete works correctly!

---

**Last Updated:** 25 November 2025  
**Status:** 🔧 FIXED - Now reads from localStorage consistently
