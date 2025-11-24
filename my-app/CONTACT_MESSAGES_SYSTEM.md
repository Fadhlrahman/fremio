# 📧 Contact Messages System - Complete Documentation

## 🎯 Overview

Sistem untuk mengelola pesan dari pengguna yang mengirim pesan melalui **Call Center** form. Semua pesan akan masuk ke **Admin Dashboard** dan dapat dikelola oleh admin.

---

## ✨ Features

### **1. Call Center Form**

- ✅ Form kontak dengan 5 fields:

  - Nama Lengkap
  - Email
  - Phone Number
  - Topik (dropdown)
  - Pesan (textarea)

- ✅ 5 Topik pesan:

  - 🔧 **Technical Support** (Priority: High)
  - 👤 **Account Issues** (Priority: Medium)
  - 💳 **Billing & Payments** (Priority: High)
  - ❓ **General Inquiry** (Priority: Medium)
  - 💬 **Feedback & Suggestions** (Priority: Low)

- ✅ Validasi form
- ✅ Submit dengan loading state
- ✅ Toast notification setelah submit
- ✅ Auto-reset form after submit

### **2. Admin Messages Dashboard**

- ✅ View semua pesan dengan filter
- ✅ Real-time stats (Total, New, Read, Replied)
- ✅ Search pesan (by name, email, message)
- ✅ Filter by status (New, Read, Replied, Closed)
- ✅ Filter by topic
- ✅ Message detail panel
- ✅ Reply functionality
- ✅ Delete messages
- ✅ Auto mark as read when opened

### **3. Notification System**

- ✅ Badge notifikasi di sidebar admin
- ✅ Badge di Dashboard stats card
- ✅ Auto-refresh setiap 30 detik
- ✅ Highlight pesan baru dengan red dot
- ✅ "NEW" badge untuk pesan belum dibaca

---

## 📁 File Structure

```
src/
├── config/
│   └── firebaseCollections.js      (Added CONTACT_MESSAGES collection)
├── services/
│   └── contactMessageService.js    (NEW - Contact message CRUD)
├── pages/
│   ├── CallCenter.jsx              (Updated - Submit to service)
│   └── admin/
│       ├── AdminDashboard.jsx      (Updated - Show message stats)
│       └── AdminMessages.jsx       (NEW - Message management)
├── layouts/
│   └── AdminLayout.jsx             (Updated - Added Messages link with badge)
└── App.jsx                         (Updated - Added /admin/messages route)
```

---

## 🔧 Technical Implementation

### **Database Schema**

```javascript
// Collection: contactMessages
{
  id: "msg_1234567890_abc",
  name: "John Doe",
  email: "john@example.com",
  phone: "+62 812 3456 7890",
  topic: "technical", // technical|account|billing|general|feedback
  message: "Saya mengalami masalah...",

  // Status & Priority
  status: "new", // new|read|replied|closed
  priority: "high", // low|medium|high (auto-assigned by topic)

  // Reply data
  reply: "Terima kasih atas laporan Anda...",
  repliedBy: "admin_uid",
  repliedAt: "2024-01-15T10:30:00Z",

  // Assignment
  assignedTo: "admin_uid",

  // Timestamps
  createdAt: "2024-01-15T09:00:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
}
```

### **Priority Auto-Assignment**

```javascript
Topic → Priority Mapping:
- technical → high
- billing → high
- account → medium
- general → medium
- feedback → low
```

---

## 🎨 UI/UX Features

### **Call Center Page**

**Layout:**

```
┌─────────────────────────────────────────┐
│  📞 Call Center                          │
│  Hubungi kami untuk bantuan langsung    │
├─────────────┬───────────────────────────┤
│  SIDEBAR    │  CONTACT FORM              │
│  - Phone    │  - Nama Lengkap            │
│  - Email    │  - Email                   │
│  - WhatsApp │  - Phone                   │
│  - Office   │  - Topik (dropdown)        │
│  - Hours    │  - Pesan (textarea)        │
│             │  [📤 Kirim Pesan]          │
│             ├───────────────────────────┤
│             │  💡 Topik Populer          │
│             │  [chips...]                │
└─────────────┴───────────────────────────┘
```

**Features:**

- 2-column grid (sidebar + form)
- Contact info dengan icons
- Business hours display
- Topic chips untuk quick reference
- Responsive mobile layout

### **Admin Messages Dashboard**

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  📧 Contact Messages                                     │
│  Kelola pesan dari pengguna melalui Call Center        │
├──────────┬──────────┬──────────┬──────────┐            │
│ Total: 24│ New: 5   │ Read: 10 │ Replied:9│            │
└──────────┴──────────┴──────────┴──────────┘            │
┌─────────────────────────────┬───────────────────────────┐
│  MESSAGES LIST              │  DETAIL PANEL             │
│  ┌─────────────────────┐   │  ┌─────────────────────┐ │
│  │ [Search...]         │   │  │ Detail Pesan         │ │
│  │ [Status ▼] [Topic ▼]│   │  │                      │ │
│  └─────────────────────┘   │  │ From: John Doe       │ │
│                             │  │ Email: john@...      │ │
│  ┌─────────────────────┐   │  │ Phone: +62...        │ │
│  │ 🔴 John Doe         │   │  │                      │ │
│  │ john@example.com    │   │  │ Message:             │ │
│  │ Saya mengalami...   │   │  │ [message text]       │ │
│  │ [Baru] [Tinggi]     │   │  │                      │ │
│  └─────────────────────┘   │  │ Balasan:             │ │
│  ┌─────────────────────┐   │  │ [reply textarea]     │ │
│  │ Jane Smith          │   │  │ [Kirim Balasan]      │ │
│  │ ...                 │   │  └─────────────────────┘ │
└─────────────────────────────┴───────────────────────────┘
```

**Color Coding:**

**Status Badges:**

- 🔵 **New** - Blue (#3b82f6)
- 🟠 **Read** - Orange (#f59e0b)
- 🟢 **Replied** - Green (#10b981)
- ⚫ **Closed** - Gray (#6b7280)

**Priority Badges:**

- 🟢 **Low** - Green (#10b981)
- 🟠 **Medium** - Orange (#f59e0b)
- 🔴 **High** - Red (#ef4444)

---

## 🔄 User Flow

### **User Flow (Call Center):**

```
1. User mengisi form di /call-center
   ↓
2. User submit form
   ↓
3. Pesan disimpan ke localStorage/Firestore
   - Auto-assign priority berdasarkan topic
   - Status = "new"
   ↓
4. Toast notification: "Pesan berhasil dikirim!"
   ↓
5. Form reset, user bisa kirim lagi
```

### **Admin Flow (Admin Dashboard):**

```
1. Admin login → Dashboard
   ↓
2. Lihat badge "Pesan Baru: 5" di stats card
   ↓
3. Click card atau sidebar "Messages"
   ↓
4. Admin melihat list semua pesan
   - Filter by status/topic
   - Search by name/email
   ↓
5. Click pesan untuk lihat detail
   - Status auto-change: "new" → "read"
   ↓
6. Admin baca pesan
   ↓
7. Admin ketik reply di textarea
   ↓
8. Click "Kirim Balasan"
   - Status change: "read" → "replied"
   - Reply tersimpan dengan timestamp
   ↓
9. (Optional) Admin delete pesan
```

---

## 📊 Stats & Analytics

### **Dashboard Stats Card:**

```javascript
{
  label: "Pesan Baru",
  value: 5,
  subtitle: "Pesan belum dibaca",
  color: "#8b5cf6",
  badge: true (if > 0)
}
```

### **Messages Dashboard Stats:**

```javascript
{
  total: 24,        // Total semua pesan
  new: 5,           // Status = "new"
  read: 10,         // Status = "read"
  replied: 9        // Status = "replied"
}
```

---

## 🔐 Security & Permissions

- ✅ **Admin Only**: Hanya admin yang bisa akses `/admin/messages`
- ✅ **Public Form**: Siapa saja bisa kirim pesan via Call Center
- ✅ **Protected Route**: Admin routes protected dengan `AdminOnly` guard
- ✅ **Validation**: Form validation untuk semua fields

---

## 💾 Data Storage

### **LocalStorage Mode** (No Firebase):

```javascript
// Key: "contact_messages"
[
  {
    id: "msg_1234567890_abc",
    name: "John Doe",
    email: "john@example.com",
    phone: "+62 812 3456 7890",
    topic: "technical",
    message: "...",
    status: "new",
    priority: "high",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
];
```

### **Firebase Mode** (With Firebase):

```javascript
// Collection: contactMessages
// Document ID: auto-generated
{
  name: "John Doe",
  email: "john@example.com",
  phone: "+62 812 3456 7890",
  topic: "technical",
  message: "...",
  status: "new",
  priority: "high",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🚀 API Functions

### **contactMessageService.js**

```javascript
// Submit new message
submitContactMessage(messageData)
  → Returns: { success: true, id: "msg_..." }

// Get all messages (Admin)
getAllContactMessages()
  → Returns: Array of messages

// Get unread count
getUnreadMessagesCount()
  → Returns: Number

// Update status
updateMessageStatus(messageId, status)
  → Returns: { success: true }

// Reply to message
replyToMessage(messageId, reply, adminUid)
  → Returns: { success: true }

// Delete message
deleteContactMessage(messageId)
  → Returns: { success: true }

// Helper: Get topic label
getTopicLabel(topic)
  → Returns: "🔧 Technical Support"

// Helper: Get status color
getStatusColor(status)
  → Returns: "#3b82f6"

// Helper: Get priority color
getPriorityColor(priority)
  → Returns: "#ef4444"
```

---

## 🎯 Routes

```javascript
// Public Routes
/call-center → CallCenter.jsx (Form untuk kirim pesan)

// Admin Routes (Protected)
/admin/messages → AdminMessages.jsx (Message management)
/admin/dashboard → AdminDashboard.jsx (Shows unread count)
```

---

## 🔔 Notification System

### **Sidebar Badge:**

```jsx
<Link to="/admin/messages">
  <Mail size={18} />
  <span>Messages</span>
  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
</Link>
```

### **Dashboard Stats Badge:**

```jsx
<StatCard
  title="Pesan Baru"
  value={stats.unreadMessages}
  badge={stats.unreadMessages > 0}
  // Shows "NEW" badge if value > 0
/>
```

### **Auto-Refresh:**

- Sidebar badge: refresh setiap **30 detik**
- Dashboard stats: refresh on mount
- Messages list: manual refresh via API calls

---

## 📱 Responsive Design

### **Desktop** (> 1024px):

- Messages: 2-column grid (list + detail)
- Call Center: 2-column grid (sidebar + form)

### **Tablet** (768px - 1024px):

- Messages: stacked layout
- Call Center: sidebar grid 2 columns

### **Mobile** (< 768px):

- Messages: full-width stacked
- Call Center: full-width stacked
- Form: single column

---

## 🧪 Testing Checklist

### **Call Center Form:**

- [x] Form submit berhasil
- [x] Toast notification muncul
- [x] Form reset after submit
- [x] Validation untuk semua fields
- [x] Loading state saat submit
- [x] Button disabled saat loading

### **Admin Messages:**

- [x] List semua pesan
- [x] Stats card accurate
- [x] Search berfungsi
- [x] Filter status berfungsi
- [x] Filter topic berfungsi
- [x] Click pesan → detail muncul
- [x] Auto mark as read
- [x] Reply form berfungsi
- [x] Delete message berfungsi

### **Notification:**

- [x] Badge di sidebar muncul
- [x] Badge di dashboard muncul
- [x] Badge update setelah action
- [x] Auto-refresh setiap 30 detik

---

## 💡 Usage Examples

### **User Mengirim Pesan:**

```javascript
// User mengisi form:
{
  name: "John Doe",
  email: "john@example.com",
  phone: "+62 812 3456 7890",
  topic: "technical",
  message: "Saya tidak bisa login ke akun saya"
}

// Submit → pesan masuk ke admin dashboard
// Priority auto-set: "high" (karena technical)
// Status: "new"
```

### **Admin Membaca & Membalas:**

```javascript
// Admin click pesan
→ Status berubah: "new" → "read"

// Admin ketik reply
{
  reply: "Silakan coba reset password Anda..."
}

// Submit reply
→ Status berubah: "read" → "replied"
→ repliedAt: timestamp
→ repliedBy: admin_uid
```

---

## 🎨 Styling

### **Color Palette:**

```css
Primary: #e0b7a9 (Fremio brand)
Blue: #3b82f6
Purple: #8b5cf6
Green: #10b981
Orange: #f59e0b
Red: #ef4444
Gray: #6b7280

Background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)
Card: white with #e2e8f0 border
```

### **Typography:**

```css
Headers: 2rem - 1.2rem, font-weight: 700-800
Body: 1rem - 0.9rem, font-weight: 400-500
Small: 0.85rem - 0.75rem
```

---

## 🔄 Future Enhancements

### **Possible Features:**

- [ ] Email notification ke admin saat ada pesan baru
- [ ] Email notification ke user saat admin reply
- [ ] Assign message to specific admin
- [ ] Message categories/tags
- [ ] Attachment support (upload files)
- [ ] Canned responses (quick reply templates)
- [ ] Message archive
- [ ] Export messages to CSV
- [ ] Message analytics (response time, etc.)
- [ ] Internal notes (admin-only comments)
- [ ] Message priority override
- [ ] Auto-close after X days

---

## 📊 Performance

### **LocalStorage:**

- ✅ Instant read/write
- ✅ No network latency
- ⚠️ Limited to ~5-10MB
- ⚠️ Not synced across devices

### **Firebase:**

- ✅ Real-time sync
- ✅ Unlimited storage
- ✅ Multi-device access
- ⚠️ Network dependent
- ⚠️ Read/write costs

---

## 🐛 Troubleshooting

### **Pesan tidak masuk ke admin:**

1. Check console untuk errors
2. Verify `contactMessageService.js` imported correctly
3. Check localStorage: `contact_messages` key
4. Verify Firebase config (if using Firebase)

### **Badge tidak muncul:**

1. Check `getUnreadMessagesCount()` returns correct value
2. Verify `unreadCount` state in AdminLayout
3. Check interval refresh (30 seconds)

### **Reply tidak tersimpan:**

1. Verify `replyToMessage()` dipanggil dengan parameter benar
2. Check `repliedBy` parameter (admin UID)
3. Verify message status update

---

## ✅ Complete!

**System Overview:**

- ✅ Call Center form functional
- ✅ Admin message management complete
- ✅ Notification badges working
- ✅ Filter & search implemented
- ✅ Reply system functional
- ✅ LocalStorage & Firebase support
- ✅ Responsive design
- ✅ Toast notifications

**Total Files Created/Modified:**

- ✅ 1 Collection added (CONTACT_MESSAGES)
- ✅ 1 Service created (contactMessageService.js)
- ✅ 1 Page created (AdminMessages.jsx)
- ✅ 3 Files updated (CallCenter, AdminDashboard, AdminLayout)
- ✅ 2 Routes added (App.jsx)

**Ready for Production!** 🚀
