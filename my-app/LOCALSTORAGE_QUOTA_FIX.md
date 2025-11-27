# 🔧 LocalStorage Quota Exceeded - Quick Fix

## ❌ Error: "The quota has been exceeded"

Ini terjadi karena **LocalStorage penuh** (max ~10MB di browser).

---

## ✅ Solusi Instant (Pilih Salah Satu):

### **Solusi 1: Clear Old Frames (Recommended)**

Buka browser console (F12), paste command ini:

```javascript
// Lihat frames yang ada
window.storageDebug.checkFrames()

// Hapus semua custom frames (HATI-HATI!)
window.storageDebug.clearFrames(true)

// Reload page
location.reload()
```

---

### **Solusi 2: Clear Browser Cache**

**Chrome/Edge:**
1. Tekan `Cmd + Shift + Delete` (Mac) atau `Ctrl + Shift + Delete` (Windows)
2. Pilih **"Cached images and files"** dan **"Cookies and site data"**
3. Klik **"Clear data"**
4. Reload page

**Safari:**
1. Safari → Preferences → Privacy
2. Klik **"Manage Website Data"**
3. Cari "localhost"
4. Klik **"Remove"**
5. Reload page

---

### **Solusi 3: Compress Image Before Upload**

#### **Online Tools (No Install):**
- https://tinypng.com - **BEST** untuk PNG
- https://squoosh.app - Google tool
- https://compressor.io - Multi-format

#### **Target:**
- Size: **< 200KB** (ideal)
- Resolution: **1080 x 1920 px**
- Format: **PNG with transparency**

#### **Desktop Tools:**
- Photoshop: Save for Web (PNG-8)
- GIMP: Export as PNG with compression
- Preview (Mac): Export → Reduce File Size

---

## 📊 Check Storage Usage

Di browser console:

```javascript
// Full diagnostic
window.storageDebug.runDiagnostic()

// Quick check
window.storageDebug.checkUsage()

// List all frames
window.storageDebug.checkFrames()
```

---

## 🗑️ Manual Delete Specific Frame

```javascript
// Get all frames
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');

// Show frame list
frames.forEach((f, i) => {
  console.log(`${i}: ${f.id} - ${f.name}`);
});

// Delete frame by index (example: delete frame at index 0)
frames.splice(0, 1); // Remove first frame

// Save back
localStorage.setItem('custom_frames', JSON.stringify(frames));

console.log('✅ Frame deleted');
```

---

## 🔍 Why This Happens:

1. **PNG images in base64** are ~33% larger than original
2. **LocalStorage limit** is ~5-10MB depending on browser
3. **Multiple frames** + large images = quota exceeded

---

## ✅ New Features (After Latest Update):

1. **Auto Image Compression** ✅
   - Images now auto-compressed to ~300KB
   - Quality: 70% (good balance)
   
2. **Auto Cleanup** ✅
   - If quota exceeded, oldest frame auto-deleted
   
3. **Better Error Messages** ✅
   - Clear instructions on what to do

---

## 🎯 Best Practices:

### **Before Upload:**
1. Compress image to <200KB
2. Use 1080x1920 resolution
3. Test with `window.storageDebug.getSpace()`

### **After Upload:**
1. Check storage: `window.storageDebug.checkUsage()`
2. If >80%, delete old frames
3. Consider clearing cache periodically

---

## 🚨 Emergency: Clear Everything

**WARNING: This will delete ALL app data!**

```javascript
// Clear all localStorage
localStorage.clear();

// Or just clear custom frames
localStorage.removeItem('custom_frames');

// Reload
location.reload();
```

---

## 📱 Test Upload Process:

```javascript
// Check available space before upload
const space = window.storageDebug.getSpace();
console.log('Available:', space.availableMB, 'MB');

if (!space.canFitImage) {
  console.warn('⚠️ Not enough space! Clear old frames first.');
  window.storageDebug.clearFrames(true);
}
```

---

## 🆘 Still Having Issues?

1. **Use Private/Incognito Mode**
   - Fresh localStorage
   - Test if it's a cache issue

2. **Try Different Browser**
   - Chrome vs Safari vs Firefox
   - Different browsers have different limits

3. **Check Console for Detailed Logs**
   - Upload process logs everything
   - Share console output for debugging

---

## 📞 Support Checklist:

Before reporting issue, provide:

- [ ] Result of `window.storageDebug.runDiagnostic()`
- [ ] Original image file size
- [ ] Browser & version
- [ ] Full console log during upload
- [ ] Screenshot of error

---

**Last Updated:** 25 November 2025  
**Status:** ✅ Auto-compression enabled
