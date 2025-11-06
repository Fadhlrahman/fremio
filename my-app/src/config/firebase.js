import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Check if Firebase is properly configured
export const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

// Only initialize Firebase if credentials are provided
let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  // Firebase configuration from environment variables
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log('✅ Firebase initialized successfully');
} else {
  console.warn('⚠️ Firebase not configured - Running in LocalStorage mode');
  console.warn('📖 To enable Firebase features, add credentials to .env file');
  console.warn('📖 See QUICK_START_GUIDE.md for setup instructions');
}

export { auth, db, storage };
export default app;
