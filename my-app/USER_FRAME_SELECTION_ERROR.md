# 🔧 User Frame Selection Error - Troubleshooting

## 🐛 **Error:**
```
Error: Gagal memilih frame
```

**Kapan terjadi:**
- User buka halaman Frames (`/fremio/frames`)
- User lihat custom frame yang diupload admin
- User klik tombol **"Lihat Frame"**
- Error muncul dan tidak bisa lanjut ke `/take-moment`

---

## 🔍 **Root Cause Analysis:**

### **Possible Causes:**

1. **Frame ID Mismatch**
   - Frame ID di UI berbeda dengan yang di localStorage
   - `getCustomFrameById(frameId)` return `null`

2. **localStorage Empty**
   - Custom frames belum di-load
   - `custom_frames` key tidak ada atau kosong

3. **Frame Data Incomplete**
   - Frame tidak punya `slots` data
   - Frame tidak punya `imagePath`
   - Frame tidak punya required fields

4. **Sync Issue**
   - Admin upload frame di satu browser
   - User buka di browser/tab berbeda
   - localStorage tidak shared across tabs/browsers

---

## 🧪 **Debugging Steps:**

### **Step 1: Check Console Logs**

Buka browser console saat klik "Lihat Frame":

**Expected logs:**
```
🎬 User clicked 'Lihat Frame'
📦 Frame data: {...}
🆔 Frame ID: pasted-xxxxx
🔄 Calling frameProvider.setCustomFrame...
🎨 setCustomFrame called with: {...}
🔍 getCustomFrameConfig called with frameId: pasted-xxxxx
📦 Retrieved frame: ✅ Found (Frame Name)
✅ setCustomFrame result: true
✅ Navigating to /take-moment
```

**Error logs (if failing):**
```
🔍 getCustomFrameConfig called with frameId: pasted-xxxxx
📦 Retrieved frame: ❌ Not found
💡 Available frames: []  ← PROBLEM: Empty!
❌ Frame not found in localStorage
❌ setCustomFrame returned false
Error: Gagal memilih frame
```

### **Step 2: Check localStorage**

Run in console:
```javascript
// Check if frames exist
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
console.log('📊 Total frames:', frames.length);
frames.forEach((f, i) => {
  console.log(`${i+1}. ID: ${f.id}, Name: ${f.name}`);
});
```

### **Step 3: Check Frame Data Structure**

```javascript
// Check specific frame
const frameId = 'pasted-1732501234567'; // Replace with actual ID
const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
const frame = frames.find(f => f.id === frameId);

console.log('Frame found:', !!frame);
console.log('Has slots:', !!frame?.slots);
console.log('Has imagePath:', !!frame?.imagePath);
console.log('Slots count:', frame?.slots?.length);
```

---

## ✅ **Solutions:**

### **Solution 1: Re-upload Frame (Admin)**

Jika localStorage kosong:

1. Admin buka `/admin/upload-frame`
2. Upload frame lagi
3. Verify muncul di `/admin/frames`
4. User refresh `/fremio/frames`
5. Frame harus muncul

### **Solution 2: Manual Frame Addition (Developer)**

Jika frame hilang tapi punya backup:

```javascript
// Add frame manually
import { addCustomFrame } from '/src/services/customFrameService.js';

const frameData = {
  id: "test-frame-001",
  name: "Test Frame",
  description: "Test description",
  maxCaptures: 3,
  duplicatePhotos: false,
  imagePath: "data:image/jpeg;base64,...", // Your frame image base64
  slots: [
    {
      id: "photo_1",
      left: 0.1,   // 10% from left
      top: 0.2,    // 20% from top
      width: 0.8,  // 80% width
      height: 0.6, // 60% height
      zIndex: 2,
      photoIndex: 0,
      aspectRatio: "4:5"
    }
  ],
  layout: {
    aspectRatio: "9:16",
    orientation: "portrait",
    backgroundColor: "#ffffff"
  },
  category: "custom",
  createdBy: "admin-uid",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  views: 0,
  uses: 0,
  likes: 0
};

addCustomFrame(frameData);
location.reload();
```

### **Solution 3: Fix Frame ID Mismatch**

Jika ID tidak match:

```javascript
// Check what frames Frames.jsx is loading
import { getAllCustomFrames } from '/src/services/customFrameService.js';
const frames = getAllCustomFrames();
console.log('Frames in state:', frames);

// Compare with localStorage
const raw = JSON.parse(localStorage.getItem('custom_frames') || '[]');
console.log('Frames in localStorage:', raw);

// If different, fix the mismatch
localStorage.setItem('custom_frames', JSON.stringify(frames));
location.reload();
```

### **Solution 4: Cross-Browser Issue**

Jika admin upload di Chrome tapi user buka di Safari:

**Problem:** localStorage is per-browser, not shared!

**Solution:** Need backend storage (Firebase/Firestore)

**Temporary workaround:**
1. Admin export frames:
   ```javascript
   const frames = JSON.parse(localStorage.getItem('custom_frames') || '[]');
   console.log(JSON.stringify(frames, null, 2));
   // Copy output
   ```

2. User import frames:
   ```javascript
   const frames = [ /* paste exported JSON */ ];
   localStorage.setItem('custom_frames', JSON.stringify(frames));
   location.reload();
   ```

---

## 🔧 **Code Improvements Made:**

### **Enhanced Error Messages:**

**Before:**
```jsx
alert("Error: Gagal memilih frame");
```

**After:**
```jsx
alert("Error: Gagal memilih frame\n\nFrame tidak ditemukan di localStorage.");
```

### **Added Debug Logging:**

```jsx
// In Frames.jsx
console.log("🎬 User clicked 'Lihat Frame'");
console.log("📦 Frame data:", frame);
console.log("🆔 Frame ID:", frame.id);
console.log("✅ setCustomFrame result:", success);

// In customFrameService.js
console.log("🔍 getCustomFrameConfig called with frameId:", frameId);
console.log("📦 Retrieved frame:", frame ? "✅ Found" : "❌ Not found");
console.log("💡 Available frames:", getAllCustomFrames().map(f => f.id));
```

---

## 🎯 **Prevention:**

### **Best Practices:**

1. **Always verify frame in localStorage after upload:**
   ```javascript
   // In AdminUploadFrame after save
   const verify = getAllCustomFrames();
   console.log('✅ Frames in localStorage:', verify.length);
   ```

2. **Show warning if no frames available:**
   ```jsx
   {customFrames.length === 0 && (
     <div className="alert">
       ⚠️ Belum ada frame. Admin perlu upload frame terlebih dahulu.
     </div>
   )}
   ```

3. **Add retry mechanism:**
   ```jsx
   const success = await frameProvider.setCustomFrame(frame);
   if (!success) {
     // Retry once
     await new Promise(resolve => setTimeout(resolve, 500));
     const retry = await frameProvider.setCustomFrame(frame);
     if (!retry) {
       alert("Error: Frame not found");
     }
   }
   ```

---

## 📊 **Testing Checklist:**

### **Full Flow Test:**

1. [ ] Admin upload frame di `/admin/upload-frame`
2. [ ] Verify frame muncul di `/admin/frames`
3. [ ] Check localStorage punya frame:
   ```javascript
   JSON.parse(localStorage.getItem('custom_frames') || '[]').length > 0
   ```
4. [ ] User buka `/fremio/frames`
5. [ ] Frame muncul di list
6. [ ] Klik "Lihat Frame"
7. [ ] **NO ERROR** - Navigate to `/take-moment` ✅
8. [ ] Frame loaded di EditPhoto
9. [ ] User bisa capture photo dengan frame

### **Error Scenarios:**

1. [ ] localStorage empty → Show "No frames" message
2. [ ] Frame ID not found → Show specific error
3. [ ] Frame missing slots → Show validation error
4. [ ] Cross-browser → Provide export/import solution

---

## 💡 **Long-term Solution:**

### **Move to Firestore:**

```javascript
// Instead of localStorage
import { collection, getDocs } from 'firebase/firestore';

export const getAllCustomFrames = async () => {
  const snapshot = await getDocs(collection(db, 'custom_frames'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
```

**Benefits:**
- ✅ Shared across all users
- ✅ Shared across all browsers
- ✅ Real-time sync
- ✅ Backup & recovery
- ✅ No storage limits

---

**Last Updated:** 25 November 2025  
**Status:** 🔍 INVESTIGATING - Debug logs added
**Next:** Wait for user to test and check console logs
