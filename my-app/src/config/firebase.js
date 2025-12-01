import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration - hardcoded for reliability
const firebaseConfig = {
  apiKey: "AIzaSyDKFFXhB6z3DDTCEdwJV1FZcQ97pa72ogI",
  authDomain: "fremio-64884.firebaseapp.com",
  projectId: "fremio-64884",
  storageBucket: "fremio-64884.firebasestorage.app",
  messagingSenderId: "726158761244",
  appId: "1:726158761244:web:c884d6c0696712cb2f6ed9"
};

// Always configured since we have hardcoded values
export const isFirebaseConfigured = true;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log('✅ Firebase initialized successfully');

export { auth, db, storage };
export default app;
