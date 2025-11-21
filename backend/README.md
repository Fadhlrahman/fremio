# Fremio Backend API

Backend API untuk aplikasi Fremio Photo Booth menggunakan Express.js + Firebase.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Firebase Setup

1. **Create Firebase Project**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Authentication (Email/Password)
   - Create Firestore Database
   - Create Storage Bucket

2. **Download Service Account Key**

   - Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in `backend/` folder

3. **Configure Environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```env
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   ```

### 3. Deploy Firestore Security Rules

Copy content from `../my-app/firestore.rules` and paste to:

- Firebase Console → Firestore Database → Rules

### 4. Run Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will run on `http://localhost:5000`

---

## 📋 API Endpoints

### Authentication

```http
POST   /api/auth/register        # Register new user
GET    /api/auth/me              # Get current user profile
PUT    /api/auth/update-profile  # Update profile
```

### Frames

```http
GET    /api/frames                # Get all frames (paginated)
GET    /api/frames/:id            # Get single frame
POST   /api/frames                # Create frame (Admin/Kreator)
PUT    /api/frames/:id            # Update frame
DELETE /api/frames/:id            # Delete frame (Admin)
POST   /api/frames/:id/like       # Like frame
```

### Drafts

```http
GET    /api/drafts                # Get user's drafts
GET    /api/drafts/:id            # Get single draft
POST   /api/drafts                # Create draft
PUT    /api/drafts/:id            # Update draft
DELETE /api/drafts/:id            # Delete draft
```

### Upload

```http
POST   /api/upload/image          # Upload single image
POST   /api/upload/images         # Upload multiple images
POST   /api/upload/video          # Upload video
```

### Analytics

```http
POST   /api/analytics/track          # Track event
GET    /api/analytics/frame/:id      # Get frame stats (Admin)
GET    /api/analytics/overview       # Platform overview (Admin)
```

---

## 🔐 Authentication

All protected endpoints require Firebase ID Token:

```javascript
headers: {
  'Authorization': 'Bearer <firebase-id-token>'
}
```

### Get ID Token (Frontend)

```javascript
import { getAuth } from "firebase/auth";

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const idToken = await user.getIdToken();
  // Use idToken in API calls
}
```

---

## 📊 Database Collections

### `users`

- User profiles
- Stats (frames created, downloads)
- Preferences

### `custom_frames`

- Admin/Kreator uploaded frames
- Slots configuration
- Analytics (views, uses, likes)

### `drafts`

- User-created frames from Create page
- Canvas elements
- Captured photos/videos

### `saved_results`

- Downloaded photos/videos
- Applied filters
- Original captures

### `analytics_events`

- User behavior tracking
- Frame usage stats

---

## 🗂️ Storage Structure

```
/users/{userId}/
  /avatars/
  /drafts/{draftId}/
    /elements/
    /captured/
  /results/

/frames/{frameId}/
  - frame_image.png
  - thumbnail.jpg

/public/temp/
  - auto-deleted after 24h
```

---

## 🛠️ Migration from LocalStorage

### Step 1: Export Data from Browser

Open browser console on your app and run:

```javascript
const data = {
  customFrames: JSON.parse(localStorage.getItem("custom_frames") || "[]"),
  drafts: JSON.parse(localStorage.getItem("fremio-creator-drafts") || "[]"),
  savedImages: JSON.parse(localStorage.getItem("savedImages") || "[]"),
};

// Copy this output
console.log(JSON.stringify(data, null, 2));
```

### Step 2: Save to File

Save the output to `data.json`

### Step 3: Run Migration Script

```bash
node scripts/migrateLocalStorage.js <userId> data.json
```

Example:

```bash
node scripts/migrateLocalStorage.js user123 data.json
```

---

## 🔧 Configuration

### File Upload Limits

Edit `.env`:

```env
MAX_FILE_SIZE=10485760      # 10MB
MAX_IMAGE_SIZE=5242880       # 5MB
MAX_VIDEO_SIZE=52428800      # 50MB
```

### Temp File Cleanup

Auto-cleanup runs every 6 hours. Configure in `.env`:

```env
TEMP_FILE_CLEANUP_HOURS=24
```

---

## 🚨 Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error"
    }
  ]
}
```

---

## 📝 Development

### Project Structure

```
backend/
├── config/
│   └── firebase.js           # Firebase Admin initialization
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── upload.js            # File upload middleware
│   └── validator.js         # Request validation
├── routes/
│   ├── auth.js              # Auth endpoints
│   ├── frames.js            # Frames endpoints
│   ├── drafts.js            # Drafts endpoints
│   ├── upload.js            # Upload endpoints
│   └── analytics.js         # Analytics endpoints
├── services/
│   └── storageService.js    # Firebase Storage utilities
├── scripts/
│   └── migrateLocalStorage.js  # Migration script
├── server.js                # Express server
└── package.json
```

### Adding New Endpoint

1. Create route file in `routes/`
2. Import in `server.js`
3. Add to app: `app.use('/api/endpoint', endpointRoutes)`

---

## 🔍 Testing

### Health Check

```bash
curl http://localhost:5000/health
```

### Test Authentication

```bash
# Get ID token from Firebase Auth first
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/auth/me
```

---

## 🚀 Deployment

### Railway / Render / Heroku

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy!

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-url.com
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
JWT_SECRET=your-production-secret
```

---

## 📚 Resources

- [Express.js Docs](https://expressjs.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Storage Docs](https://firebase.google.com/docs/storage)

---

## 🐛 Troubleshooting

### "Firebase not initialized"

- Check `serviceAccountKey.json` exists
- Verify `.env` configuration

### "Permission denied" errors

- Deploy Firestore security rules
- Check user role in Firestore

### "File too large"

- Increase limits in `.env`
- Check multer configuration

---

## 📄 License

MIT
