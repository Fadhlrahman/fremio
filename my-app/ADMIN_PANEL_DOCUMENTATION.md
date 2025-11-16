# Admin Panel - Complete Feature Documentation

## 🎯 Overview

Admin panel Fremio adalah dashboard khusus untuk administrator dengan fitur lengkap untuk mengelola platform. Semua halaman menggunakan design system yang konsisten dengan tampilan Profile user.

## 🎨 Design System

### Color Palette

- **Primary Accent**: `#e0b7a9` (warm peach/beige)
- **Border**: `#ecdeda` (soft border)
- **Background Soft**: `#faf6f5` (light beige)
- **Background Hover**: `#f0e4e0` (darker beige)
- **Text Primary**: `#222` (almost black)
- **Text Secondary**: `#6b6b6b` (gray)
- **Text Tertiary**: `#333` (dark gray)

### Page Background

Gradient dari atas ke bawah:

```css
background: linear-gradient(180deg, #fdf7f4 0%, #fff 50%, #f7f1ed 100%);
```

### Components

- **Cards**: Border radius `14px`, border `1px solid #ecdeda`
- **Buttons**: Border radius `10px`, padding konsisten
- **Inputs**: Border radius `10px`, focus ring dengan accent color

## 📋 Features & Pages

### 1. 🏠 Admin Dashboard (`/admin/dashboard`)

**File**: `src/pages/admin/AdminDashboard.jsx`

**Fitur**:

- ✅ Overview statistik platform (Users, Frames, Pending Reviews, Analytics)
- ✅ Stat cards dengan warna berbeda untuk setiap kategori
- ✅ Section Kreator Applications dengan mini stats (Pending, Approved, Rejected)
- ✅ Section Frame Management dengan mini stats
- ✅ Quick Actions grid (6 actions: Users, Applications, Frames, Categories, Analytics, Settings)
- ✅ Firebase status warning untuk localStorage mode

**Components**:

- `StatCard`: Card statistik besar dengan icon dan nilai
- `MiniStatCard`: Card statistik kecil untuk sub-sections
- `ActionButton`: Button untuk quick actions

**Navigation**:

- Setiap card dan button dapat di-klik untuk navigate ke halaman terkait

---

### 2. 👥 User Management (`/admin/users`)

**File**: `src/pages/admin/AdminUsers.jsx`

**Fitur**:

- ✅ List semua users dengan informasi lengkap
- ✅ Search users by name, email, atau phone
- ✅ Filter by role (Admin, Kreator, User)
- ✅ Filter by status (Active, Banned)
- ✅ User stats: Total, Kreators, Regular Users, Active, Banned
- ✅ User actions:
  - Promote regular user ke Kreator
  - Ban/Unban users
  - Delete users (dengan konfirmasi)
- ✅ Visual badges untuk role (Admin, Kreator, User)
- ✅ Status badges (Active, Banned)
- ✅ User avatar dengan initial

**Components**:

- `StatCard`: Statistik users
- `UserCard`: Card untuk setiap user dengan actions

**Features Detail**:

- **Search**: Real-time search dengan filter di name, email, phone
- **Role Promotion**: Promote user → kreator dengan satu klik
- **Ban System**: Ban users dengan status change
- **Protection**: Current user tidak bisa di-edit/delete

---

### 3. 🖼️ Frame Management (`/admin/frames`)

**File**: `src/pages/admin/AdminFrames.jsx`

**Fitur**:

- ✅ List semua frames yang disubmit kreators
- ✅ Filter by status (All, Pending, Approved, Rejected, Draft)
- ✅ Stats cards: Total, Pending, Approved, Rejected, Draft
- ✅ Frame preview dengan thumbnail
- ✅ Frame details: Name, Description, Creator, Views, Uses, Likes
- ✅ Frame actions (untuk pending frames):
  - Approve frame
  - Request changes (dengan feedback)
  - Reject frame (dengan reason)
- ✅ Status badges dengan icon

**Components**:

- `StatCard`: Frame statistics
- `FilterButton`: Filter tabs
- `FrameCard`: Card untuk setiap frame
- `FeedbackModal`: Modal untuk reject/request changes

**Workflow**:

1. Kreator submit frame → status: Pending Review
2. Admin review:
   - Approve → status: Approved (published)
   - Request Changes → status: Request Changes (kreator edit)
   - Reject → status: Rejected (dengan reason)

---

### 4. ⬆️ Upload Frame (`/admin/upload-frame`)

**File**: `src/pages/admin/AdminUploadFrame.jsx`

**Fitur**:

- ✅ Upload PNG frame image
- ✅ Frame information form:
  - Name (required)
  - Description
  - Category (Custom, Fremio Series, Inspired By, Seasonal)
  - Jumlah foto (1-10)
  - Duplicate photos option
- ✅ Visual slot editor:
  - Add/delete slots
  - Configure position (left, top, width, height) dalam percentage (0.0-1.0)
  - Set aspect ratio per slot (4:5, 1:1, 16:9, 3:4)
  - Assign photo index to each slot
- ✅ Live preview dengan overlay slots
- ✅ Save to LocalStorage atau Firebase

**Components**:

- `SlotConfig`: Editor untuk setiap photo slot

**Workflow**:

1. Upload PNG frame image
2. Configure frame details
3. Add slots dengan visual editor
4. Preview hasil akhir
5. Save frame

---

### 5. 📝 Kreator Applications (`/admin/applications`)

**File**: `src/pages/admin/KreatorApplications.jsx`

**Fitur**:

- ✅ List semua kreator applications
- ✅ Filter by status (All, Pending, Approved, Rejected)
- ✅ Stats: Total, Pending, Approved, Rejected
- ✅ Application details:
  - Display name, email
  - Portfolio link (clickable)
  - Motivation
  - Experience
  - Submit date
  - Rejection reason (jika rejected)
- ✅ Actions untuk pending applications:
  - Approve (promote to kreator)
  - Reject (dengan reason modal)
- ✅ Status badges

**Components**:

- `StatCard`: Application statistics
- `FilterButton`: Status filters
- `ApplicationCard`: Card per application
- `RejectModal`: Modal untuk reject dengan reason

**Workflow**:

1. User apply jadi kreator via `/apply-kreator`
2. Admin review application
3. Approve → user role changed to 'kreator'
4. Reject → user notified dengan reason

---

### 6. ⚙️ Platform Settings (`/admin/settings`)

**File**: `src/pages/admin/AdminSettings.jsx`

**Fitur**:

#### Tab 1: General Settings

- ✅ Site Name
- ✅ Site Description
- ✅ Site URL
- ✅ Contact Email
- ✅ Allow Registration toggle
- ✅ Maintenance Mode toggle

#### Tab 2: Frame Settings

- ✅ Max frames per regular user (0-100)
- ✅ Max frames per kreator (0-1000)
- ✅ Auto-approve frames from trusted kreators
- ✅ Allow duplicate photos in frames

#### Tab 3: Upload Settings

- ✅ Max image size (MB)
- ✅ Max video size (MB)
- ✅ Allowed image formats (jpg, jpeg, png, gif, webp)
- ✅ Allowed video formats (mp4, webm, mov)

#### Tab 4: Email Notifications

- ✅ Enable email notifications
- ✅ Notify on new user registration
- ✅ Notify on new frame submission
- ✅ Notify on new kreator application

#### Tab 5: Security Settings

- ✅ Require email verification
- ✅ Minimum password length (6-32)
- ✅ Session timeout (hours)
- ✅ Max login attempts (3-10)

#### Tab 6: Database

- ✅ Firebase status
- ✅ Database size
- ✅ Total users count
- ✅ Total frames count
- ✅ Export all data
- ✅ Import data
- ✅ Clear cache (logout)

**Components**:

- Tab navigation sidebar
- `InfoRow`: Display database info

**Storage**:

- Settings saved to `localStorage` (key: `admin_settings`)
- Firebase sync when configured

---

## 🔐 Access Control

### Login Credentials

- **Email**: `admin@admin.com`
- **Password**: `admin`

### Authentication Flow

1. Login dengan credentials admin
2. AuthContext check role === 'admin'
3. Redirect ke `/admin/dashboard`
4. Protected dengan `<AdminOnly>` guard

### Guards

- **AdminOnly**: Wrapper component di `App.jsx`
- Check user role di `AuthContext`
- Non-admin redirect ke `/frames`

---

## 🎨 Component Library

### Shared Components (admin.css)

#### `.admin-card`

Card container dengan border dan shadow

```css
background: #ffffff;
border: 1px solid var(--border);
border-radius: 14px;
```

#### `.admin-card-header`

Header section dalam card

```css
padding: 22px 24px;
border-bottom: 1px solid #f3ebe8;
```

#### `.admin-card-body`

Body section dalam card

```css
padding: 22px 24px;
```

#### `.admin-button-primary`

Button utama dengan accent color

```css
background: var(--accent);
color: #231f1e;
border-radius: 10px;
```

#### `.admin-button-secondary`

Button sekunder

```css
background: #ffffff;
border: 1px solid var(--border);
```

#### `.admin-input`, `.admin-textarea`, `.admin-select`

Form inputs dengan styling konsisten

#### Badges

- `.admin-badge-success`: Green badge
- `.admin-badge-warning`: Yellow badge
- `.admin-badge-danger`: Red badge
- `.admin-badge-info`: Blue badge

---

## 📱 Responsive Design

### Breakpoints

- **Desktop**: > 1024px (full layout)
- **Tablet**: 768px - 1024px (adjusted grid)
- **Mobile**: < 768px (single column, collapsible sidebar)

### Mobile Features

- Hamburger menu untuk sidebar
- Overlay backdrop ketika sidebar open
- Stacked cards dan stats
- Touch-friendly buttons (min 44px height)

---

## 🚀 Future Enhancements

### Planned Features

- [ ] Analytics dashboard dengan charts
- [ ] Categories management
- [ ] Bulk actions (select multiple items)
- [ ] Export reports (PDF, CSV)
- [ ] Activity logs
- [ ] Role-based permissions (super admin, moderator)
- [ ] Email templates management
- [ ] Backup & restore system
- [ ] Real-time notifications
- [ ] Advanced search filters

### Firebase Integration

Ketika Firebase configured:

- Real-time data sync
- Cloud storage untuk frame images
- Email notifications via Firebase Functions
- Authentication dengan Firebase Auth
- Firestore untuk database
- Analytics tracking

---

## 📝 Development Notes

### Adding New Admin Pages

1. **Create page file**:

```jsx
// src/pages/admin/NewFeature.jsx
import "../../styles/admin.css";

export default function NewFeature() {
  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, #fdf7f4 0%, #fff 50%, #f7f1ed 100%)",
        minHeight: "100vh",
        padding: "32px 0 48px",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "0 16px" }}>
        {/* Content */}
      </div>
    </div>
  );
}
```

2. **Add route in App.jsx**:

```jsx
import NewFeature from "./pages/admin/NewFeature.jsx";

// In routes:
<Route path="new-feature" element={<NewFeature />} />;
```

3. **Add menu item in AdminLayout.jsx**:

```jsx
{ path: '/admin/new-feature', icon: IconName, label: 'New Feature' }
```

### Styling Guidelines

- Use inline styles untuk layout utama
- Use admin.css classes untuk components
- Konsisten dengan color palette
- Border radius: 10px (buttons), 14px (cards)
- Spacing: 12px, 16px, 20px, 24px, 32px

---

## 🎯 Summary

Admin panel Fremio menyediakan 6 halaman utama dengan design system yang konsisten:

1. **Dashboard** - Overview dan quick actions
2. **Users** - User management dengan search & filter
3. **Frames** - Frame moderation & approval
4. **Upload Frame** - Admin frame creation
5. **Applications** - Kreator application review
6. **Settings** - Platform configuration

Semua fitur sudah functional dengan:

- ✅ Clean UI/UX matching profile page
- ✅ Consistent color scheme
- ✅ Responsive design
- ✅ LocalStorage mode support
- ✅ Firebase ready (when configured)
- ✅ Role-based access control
- ✅ Comprehensive documentation

Login dengan `admin@admin.com` / `admin` untuk akses penuh! 🚀
