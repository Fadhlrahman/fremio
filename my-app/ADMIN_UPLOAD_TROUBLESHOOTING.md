# 🔧 Admin Upload Frame - Troubleshooting Guide

## ❌ Issue: Stuck di Loading "Menyimpan..."

### Kemungkinan Penyebab:

1. **Firebase Storage Error** (jika Firebase mode)
2. **LocalStorage Quota Exceeded** (jika localStorage mode)
3. **Image File Terlalu Besar**
4. **Browser Console Error**

---

## ✅ Solusi Step-by-Step

### 1. **Cek Mode yang Digunakan**

Buka browser console (Cmd+Option+J atau F12) dan lihat log saat page load:

```
✅ Firebase initialized successfully  → Firebase Mode
⚠️ Firebase not configured - Running in LocalStorage mode  → LocalStorage Mode
```

---

### 2. **Jika LocalStorage Mode:**

#### A. Cek LocalStorage Quota

Jalankan di browser console:

```javascript
// Cek ukuran localStorage saat ini
let total = 0;
for(let key in localStorage) {
  if(localStorage.hasOwnProperty(key)) {
    total += localStorage[key].length + key.length;
  }
}
console.log(`LocalStorage usage: ${(total / 1024 / 1024).toFixed(2)} MB`);

// Cek custom frames
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
console.log(`Total frames: ${frames.length}`);
```

**Jika lebih dari 5 MB**, localStorage mungkin penuh!

#### B. Clear Old Frames (jika perlu)

```javascript
// Clear all custom frames
localStorage.removeItem('custom_frames');
console.log('✅ Custom frames cleared');
```

#### C. Compress Image Sebelum Upload

- Gunakan tool seperti TinyPNG.com
- Target ukuran: **< 500KB**
- Resolusi: **1080 x 1920 px**

---

### 3. **Jika Firebase Mode:**

#### A. Cek Firestore Rules

Pastikan rules sudah di-update:

```javascript
match /frames/{frameId} {
  allow read: if true;
  allow write: if true;
}
```

#### B. Cek Firebase Storage Rules

Buka Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /frames/{frameId}/{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

#### C. Deploy Storage Rules

```bash
cd /Users/salwa/Documents/FremioNew/fremio/my-app
firebase deploy --only storage:rules
```

---

### 4. **Debug dengan Browser Console**

Saat klik tombol "Simpan Frame", perhatikan log di console:

```
🔥 handleSaveFrame called
📝 Frame name: ...
🖼️ Frame image file: ...
📍 Slots: ...
🔧 Firebase configured: false
💾 Starting save process...
💾 Using LocalStorage mode
💾 saveCustomFrame called
🔄 Converting image to base64...
✅ Image converted, size: ... chars
📤 Saving to localStorage...
✅ Frame saved successfully!
```

**Jika stuck**, cari error di console:

- ❌ `QuotaExceededError` → LocalStorage penuh
- ❌ `Missing or insufficient permissions` → Firestore rules belum update
- ❌ `storage is not defined` → Firebase config issue

---

### 5. **Quick Fix: Reduce Image Size**

Buat temporary image compressor di browser console:

```javascript
// Compress image before upload
function compressImage(file, maxWidth = 1080, maxHeight = 1920) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/png' }));
        }, 'image/png', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Usage: paste this in console, then use the function
```

---

### 6. **Alternative: Direct Add to LocalStorage**

Jika upload UI masih stuck, tambahkan frame secara manual:

```javascript
// Di browser console
const newFrame = {
  id: "test-frame-1",
  name: "Test Frame 1",
  description: "Testing manual add",
  category: "custom",
  maxCaptures: 3,
  duplicatePhotos: false,
  imagePath: "YOUR_BASE64_IMAGE_HERE", // paste base64 image
  thumbnailUrl: "YOUR_BASE64_IMAGE_HERE",
  slots: [
    {
      id: "slot_1",
      left: 0.1,
      top: 0.1,
      width: 0.4,
      height: 0.3,
      aspectRatio: "4:5",
      zIndex: 2,
      photoIndex: 0
    }
  ],
  layout: {
    aspectRatio: "9:16",
    orientation: "portrait",
    backgroundColor: "#ffffff"
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  views: 0,
  uses: 0,
  likes: 0
};

// Get existing frames
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');

// Add new frame
frames.push(newFrame);

// Save back
localStorage.setItem('custom_frames', JSON.stringify(frames));

console.log('✅ Frame added successfully!');
```

---

## 📞 Support

Jika masih stuck setelah langkah di atas:

1. **Copy semua log dari console** (termasuk error messages)
2. **Screenshot halaman upload**
3. **Cek file size image yang diupload**
4. **Share info tersebut untuk debugging lebih lanjut**

---

## ⚡ Quick Checklist

- [ ] Browser console terbuka (F12 atau Cmd+Option+J)
- [ ] Lihat mode: Firebase atau LocalStorage?
- [ ] Image size < 500KB?
- [ ] Firestore rules sudah published?
- [ ] LocalStorage tidak penuh?
- [ ] Ada error di console?
- [ ] Network tab menunjukkan request stuck?

---

**Last Updated:** 25 November 2025
