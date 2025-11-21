# Admin to User Flow - Complete Integration

## 📋 Overview

Sistem terintegrasi penuh dari admin upload frame hingga analytics tracking di user side.

## 🔄 Complete Flow

### 1️⃣ **Admin Upload Frame**

**File**: `src/pages/admin/AdminUploadFrame.jsx`

```
Admin → Upload PNG Frame → Set Slots → Save
  ↓
customFrameService.saveCustomFrame()
  ↓
localStorage: 'custom_frames' = [
  {
    id: "frame-id",
    name: "Frame Name",
    category: "custom",
    imagePath: "base64...",
    slots: [...],
    maxCaptures: 3,
    views: 0,
    uses: 0,
    likes: 0,
    createdAt: "2025-11-20...",
  }
]
```

**Service**: `src/services/customFrameService.js`

- `saveCustomFrame()` - Simpan frame baru
- `getAllCustomFrames()` - Get semua custom frames
- `getCustomFrameConfig()` - Get config untuk frameProvider

---

### 2️⃣ **User Melihat Frames**

**File**: `src/pages/Frames.jsx`

```
User ke /frames
  ↓
Load custom frames: getAllCustomFrames()
  ↓
Display: Custom Frames Section (dengan badge "CUSTOM")
  ↓
User klik "Lihat Frame"
  ↓
Track View: trackFrameView(frameId, userId, frameName)
  ↓
frameProvider.setCustomFrame(frame)
  ↓
Navigate to /take-moment
```

**Tracking**:

- **View**: Tracked saat user klik button "Lihat Frame"
- **Data**: Simpan ke `localStorage: 'frame_usage'`
- **Activity Log**: Simpan ke `localStorage: 'recent_activities'`

---

### 3️⃣ **User Menggunakan Frame**

**File**: `src/pages/EditPhoto.jsx`

```
User di EditPhoto page
  ↓
frameConfig loaded (termasuk custom frames)
  ↓
User edit photo dengan frame
  ↓
Download Photo/Video
  ↓
Track Download: trackFrameDownload(frameId, userId, frameName)
  ↓
Analytics updated di localStorage
```

**Download Tracking**:

- Photo download → `trackFrameDownload()`
- Video download → `trackFrameDownload()`
- Both tracked to `frame_usage` localStorage

---

### 4️⃣ **Admin Melihat Analytics**

**File**: `src/pages/admin/AdminAnalytics.jsx`

```
Admin ke /admin/analytics
  ↓
loadAnalytics() reads from localStorage:
  - custom_frames
  - frame_usage
  - users
  - recent_activities
  ↓
Calculate REAL stats:
  - Total Views (sum of all views)
  - Total Downloads (sum of all downloads)
  - Total Likes (sum of all likes)
  - Top Frames (sorted by views)
  - Top Users (sorted by usage)
  - Category Distribution
  - Recent Activities
```

---

## 🗄️ LocalStorage Structure

### 1. `custom_frames`

```json
[
  {
    "id": "birthday-frame-1",
    "name": "Birthday Frame",
    "category": "birthday",
    "imagePath": "data:image/png;base64,...",
    "thumbnailUrl": "data:image/png;base64,...",
    "slots": [
      {
        "id": "slot_1",
        "left": 0.1,
        "top": 0.2,
        "width": 0.4,
        "height": 0.3,
        "aspectRatio": "4:5",
        "zIndex": 2,
        "photoIndex": 0
      }
    ],
    "maxCaptures": 3,
    "duplicatePhotos": false,
    "layout": {
      "aspectRatio": "9:16",
      "orientation": "portrait",
      "backgroundColor": "#ffffff"
    },
    "views": 0,
    "uses": 0,
    "likes": 0,
    "createdBy": "admin@admin.com",
    "createdAt": "2025-11-20T10:00:00Z",
    "updatedAt": "2025-11-20T10:00:00Z"
  }
]
```

### 2. `frame_usage`

```json
[
  {
    "id": "usage_1234567890_abc",
    "userId": "anon_1234567890_xyz",
    "frameId": "birthday-frame-1",
    "frameName": "Birthday Frame",
    "views": 5,
    "downloads": 2,
    "likes": 1,
    "createdAt": "2025-11-20T10:00:00Z",
    "lastViewedAt": "2025-11-20T10:05:00Z",
    "lastDownloadedAt": "2025-11-20T10:10:00Z",
    "lastLikedAt": "2025-11-20T10:15:00Z"
  }
]
```

### 3. `recent_activities`

```json
[
  {
    "id": "activity_1234567890_abc",
    "type": "view",
    "userId": "anon_1234567890_xyz",
    "userName": "Anonymous User",
    "frameId": "birthday-frame-1",
    "frameName": "Birthday Frame",
    "timestamp": "2025-11-20T10:00:00Z",
    "time": "2 min ago"
  },
  {
    "id": "activity_1234567891_def",
    "type": "download",
    "userId": "anon_1234567890_xyz",
    "userName": "Anonymous User",
    "frameId": "birthday-frame-1",
    "frameName": "Birthday Frame",
    "timestamp": "2025-11-20T10:05:00Z",
    "time": "5 min ago"
  }
]
```

### 4. `users` (for testing with demoData)

```json
[
  {
    "id": "user_1",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "user",
    "status": "active",
    "createdAt": "2025-11-20T10:00:00Z",
    "lastActive": "2 hours ago"
  }
]
```

---

## 📊 Analytics Service

**File**: `src/services/analyticsService.js`

### Functions:

#### `trackFrameView(frameId, userId, frameName)`

- Track ketika user melihat/klik frame
- Increment `views` count
- Log to `recent_activities`

#### `trackFrameDownload(frameId, userId, kreatorId, frameName)`

- Track ketika user download photo/video
- Increment `downloads` count
- Log to `recent_activities`

#### `trackFrameLike(frameId, userId, kreatorId, frameName)`

- Track ketika user like frame
- Toggle `likes` (0 atau 1)
- Log to `recent_activities` (only on like, not unlike)

#### `hasUserLikedFrame(frameId, userId)`

- Check apakah user sudah like frame
- Return boolean

#### `getFrameStats(frameId)`

- Get stats untuk specific frame
- Return: `{ totalViews, totalDownloads, totalLikes, uniqueUsers }`

#### `getAllFrameUsage()`

- Get semua frame usage data
- Return array of usage records

#### `getAllActivities()`

- Get semua recent activities
- Return array (max 100 items)

---

## 🎯 Integration Points

### 1. Admin Dashboard

**File**: `src/pages/admin/AdminDashboard.jsx`

```javascript
// Load stats from localStorage
const customFrames = JSON.parse(localStorage.getItem("custom_frames") || "[]");
const frameUsage = JSON.parse(localStorage.getItem("frame_usage") || "[]");
const users = JSON.parse(localStorage.getItem("users") || "[]");

// Calculate totals
const totalViews = frameUsage.reduce((sum, u) => sum + (u.views || 0), 0);
const totalDownloads = frameUsage.reduce(
  (sum, u) => sum + (u.downloads || 0),
  0
);
const totalLikes = frameUsage.reduce((sum, u) => sum + (u.likes || 0), 0);
```

### 2. Admin Analytics

**File**: `src/pages/admin/AdminAnalytics.jsx`

```javascript
// Top Frames calculation
const frameStats = {};
frameUsage.forEach((usage) => {
  if (!frameStats[usage.frameId]) {
    frameStats[usage.frameId] = { views: 0, downloads: 0, likes: 0 };
  }
  frameStats[usage.frameId].views += usage.views || 0;
});

const topFrames = Object.values(frameStats)
  .sort((a, b) => b.views - a.views)
  .slice(0, 3);
```

### 3. Admin Users

**File**: `src/pages/admin/AdminUsers.jsx`

```javascript
// Load real users from localStorage
const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");

// Calculate stats
const kreators = storedUsers.filter((u) => u.role === "kreator").length;
const regular = storedUsers.filter((u) => u.role === "user").length;
const active = storedUsers.filter((u) => u.status === "active").length;
```

### 4. Admin Categories

**File**: `src/pages/admin/AdminCategories.jsx`

```javascript
// Count real frames per category
const customFrames = JSON.parse(localStorage.getItem("custom_frames") || "[]");
const frameCount = customFrames.filter(
  (frame) => frame.category === cat.id
).length;
```

---

## 🧪 Testing Demo Data

**File**: `src/utils/demoData.js`

### Usage:

```javascript
import { initializeDemoData } from "../utils/demoData";

// Initialize demo data for testing
const result = initializeDemoData();
console.log(result.message); // "Demo data initialized successfully!"
```

**What it creates**:

- 10 sample users
- Frame usage records for testing
- Recent activities log

**Button**: Admin Dashboard has "Initialize Demo Data" button

---

## ✅ Testing Checklist

### End-to-End Flow:

1. ✅ Admin upload frame di `/admin/upload-frame`
2. ✅ Frame tersimpan ke `localStorage: custom_frames`
3. ✅ User ke `/frames` → Custom frame muncul
4. ✅ User klik "Lihat Frame" → View tracked
5. ✅ User ke `/take-moment` → Frame loaded
6. ✅ User ambil foto/video
7. ✅ User ke `/edit-photo` → Edit with custom frame
8. ✅ User download → Download tracked
9. ✅ Admin ke `/admin/analytics` → Stats updated
10. ✅ Admin Dashboard shows real numbers

### Analytics Tracking:

- ✅ Views tracked on frame click
- ✅ Downloads tracked on photo download
- ✅ Downloads tracked on video download
- ✅ Activities logged for all actions
- ✅ User ID (anonymous or logged in) tracked

### Admin Pages:

- ✅ Dashboard: Shows real stats (no dummy data)
- ✅ Analytics: Shows real analytics (no dummy data)
- ✅ Users: Shows real users from localStorage
- ✅ Categories: Shows real frame counts per category
- ✅ Frames: Lists all custom frames

---

## 🔗 Key Files Modified

1. **Services**:

   - `src/services/customFrameService.js` - Frame CRUD
   - `src/services/analyticsService.js` - Analytics tracking (updated for localStorage)

2. **User Pages**:

   - `src/pages/Frames.jsx` - Display custom frames + track views
   - `src/pages/EditPhoto.jsx` - Track downloads

3. **Admin Pages**:

   - `src/pages/admin/AdminUploadFrame.jsx` - Upload frames
   - `src/pages/admin/AdminDashboard.jsx` - Real data dashboard
   - `src/pages/admin/AdminAnalytics.jsx` - Real analytics
   - `src/pages/admin/AdminUsers.jsx` - Real users
   - `src/pages/admin/AdminCategories.jsx` - Real frame counts

4. **Utils**:
   - `src/utils/frameProvider.js` - Handle custom frames
   - `src/utils/demoData.js` - Generate test data

---

## 🎉 Summary

**SEMUA FITUR SUDAH TERKONEKSI END-TO-END:**

1. ✅ Admin upload frame → Langsung tersedia untuk user
2. ✅ User pakai frame → Analytics tracked otomatis
3. ✅ Admin lihat dashboard → Data REAL dari localStorage
4. ✅ NO DUMMY DATA di semua halaman admin
5. ✅ Activity logging untuk semua aksi user
6. ✅ Custom frames fully integrated dengan built-in frames

**Ready for production use in localStorage mode!** 🚀
