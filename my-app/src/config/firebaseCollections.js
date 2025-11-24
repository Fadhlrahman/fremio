// Firebase Collection Names and Schema Definitions
// This file defines all Firestore collections and their structures

export const COLLECTIONS = {
  USERS: "users",
  users: "users", // Alias for consistency
  KREATOR_APPLICATIONS: "kreatorApplications",
  kreatorApplications: "kreatorApplications", // Alias
  FRAMES: "frames",
  frames: "frames", // Alias
  FRAME_CATEGORIES: "frameCategories",
  NOTIFICATIONS: "notifications",
  ANALYTICS: "analytics",
  CONTACT_MESSAGES: "contactMessages",
  contactMessages: "contactMessages", // Alias
};

// User Roles
export const USER_ROLES = {
  ADMIN: "admin",
  KREATOR: "kreator",
  USER: "user",
};

// Frame Status
export const FRAME_STATUS = {
  DRAFT: "draft", // Kreator's work in progress
  PENDING_REVIEW: "pending_review", // Submitted for review
  APPROVED: "approved", // Approved and live
  REJECTED: "rejected", // Rejected by admin
  REQUEST_CHANGES: "request_changes", // Needs modifications
  ARCHIVED: "archived", // Removed from marketplace
};

// Kreator Application Status
export const APPLICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

// Frame Categories
export const FRAME_CATEGORIES_LIST = [
  { id: "birthday", name: "Birthday", icon: "🎂" },
  { id: "wedding", name: "Wedding", icon: "💒" },
  { id: "graduation", name: "Graduation", icon: "🎓" },
  { id: "corporate", name: "Corporate", icon: "💼" },
  { id: "holiday", name: "Holiday", icon: "🎄" },
  { id: "party", name: "Party", icon: "🎉" },
  { id: "baby", name: "Baby & Kids", icon: "👶" },
  { id: "anniversary", name: "Anniversary", icon: "💝" },
  { id: "travel", name: "Travel", icon: "✈️" },
  { id: "other", name: "Other", icon: "📸" },
];

/**
 * User Schema
 * Collection: users
 */
export const UserSchema = {
  uid: "string", // Firebase Auth UID
  email: "string",
  displayName: "string",
  photoURL: "string?",
  role: "admin|kreator|user", // Default: user

  // Kreator specific
  isKreator: "boolean",
  kreatorProfile: {
    bio: "string?",
    portfolio: "string[]?",
    socialLinks: {
      instagram: "string?",
      behance: "string?",
      dribbble: "string?",
    },
    badges: "string[]", // ['verified', 'top_kreator', 'elite']
    stats: {
      totalFrames: "number",
      totalUses: "number",
      averageRating: "number",
    },
  },

  createdAt: "timestamp",
  updatedAt: "timestamp",
};

/**
 * Kreator Application Schema
 * Collection: kreatorApplications
 */
export const KreatorApplicationSchema = {
  id: "string",
  userId: "string",
  applicantEmail: "string",
  applicantName: "string",

  // Application data
  portfolio: "string[]", // URLs to portfolio
  experience: "string",
  motivation: "string",
  socialLinks: {
    instagram: "string?",
    behance: "string?",
    dribbble: "string?",
  },
  sampleWorks: "string[]", // URLs to sample designs

  status: "pending|approved|rejected",

  // Review data
  reviewedBy: "string?", // Admin UID
  reviewedAt: "timestamp?",
  reviewNotes: "string?",
  rejectionReason: "string?",

  createdAt: "timestamp",
  updatedAt: "timestamp",
};

/**
 * Frame Schema
 * Collection: frames
 */
export const FrameSchema = {
  id: "string",
  name: "string",
  description: "string",

  // Frame configuration from Create page
  frameConfig: {
    canvasWidth: "number",
    canvasHeight: "number",
    canvasBackground: "string",
    aspectRatio: "string",
    elements: "array", // All designer elements
  },

  // Media
  thumbnail: "string", // Storage URL
  previewImages: "string[]", // Multiple preview angles

  // Categorization
  category: "string", // From FRAME_CATEGORIES_LIST
  tags: "string[]",
  difficulty: "simple|medium|complex",
  photoSlotCount: "number",

  // Status & workflow
  status: "draft|pending_review|approved|rejected|request_changes|archived",
  isPublic: "boolean",
  isFeatured: "boolean",

  // Creator info
  createdBy: "string", // Kreator UID
  creatorName: "string",
  creatorBadges: "string[]",

  // Review data
  reviewedBy: "string?",
  reviewedAt: "timestamp?",
  reviewNotes: "string?",
  rejectionReason: "string?",
  changesRequested: "string?",

  // Analytics
  viewCount: "number",
  useCount: "number",
  downloadCount: "number",
  ratingSum: "number",
  ratingCount: "number",
  averageRating: "number",

  // Metadata
  version: "number",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  publishedAt: "timestamp?",
  archivedAt: "timestamp?",
};

/**
 * Frame Category Schema
 * Collection: frameCategories
 */
export const FrameCategorySchema = {
  id: "string",
  name: "string",
  icon: "string",
  description: "string?",
  order: "number",
  isActive: "boolean",
  frameCount: "number",
};

/**
 * Notification Schema
 * Collection: notifications
 */
export const NotificationSchema = {
  id: "string",
  userId: "string",
  type: "application_status|frame_status|system",
  title: "string",
  message: "string",
  actionUrl: "string?",
  isRead: "boolean",
  createdAt: "timestamp",
};

/**
 * Analytics Schema
 * Collection: analytics
 */
export const AnalyticsSchema = {
  id: "string",
  type: "frame_view|frame_use|frame_download|frame_rating",
  frameId: "string?",
  userId: "string?",
  kreatorId: "string?",
  metadata: "object",
  timestamp: "timestamp",
};

/**
 * Contact Message Schema
 * Collection: contactMessages
 */
export const ContactMessageSchema = {
  id: "string",
  name: "string",
  email: "string",
  phone: "string",
  topic: "technical|account|billing|general|feedback",
  message: "string",
  status: "new|read|replied|closed",
  priority: "low|medium|high",
  assignedTo: "string?", // Admin UID
  reply: "string?",
  repliedAt: "timestamp?",
  repliedBy: "string?", // Admin UID
  createdAt: "timestamp",
  updatedAt: "timestamp",
};
