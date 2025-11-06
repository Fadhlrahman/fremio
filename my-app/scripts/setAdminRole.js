/**
 * Firebase Admin Script - Set Admin Role
 * Run this script ONCE to set the first admin user
 * 
 * Prerequisites:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download service account key from Firebase Console
 * 3. Place serviceAccountKey.json in project root (add to .gitignore)
 * 
 * Usage:
 * node scripts/setAdminRole.js <user_email>
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setAdminRole(email) {
  try {
    console.log(`🔍 Finding user with email: ${email}`);

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`✅ User found: ${userRecord.uid}`);

    // Update user document in Firestore
    await db.collection('users').doc(userRecord.uid).update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ User role updated to 'admin' in Firestore`);
    console.log(`🎉 Success! ${email} is now an admin.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('💡 User not found. Please register the user first via the app.');
    }
    
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide user email as argument');
  console.log('Usage: node scripts/setAdminRole.js <user_email>');
  process.exit(1);
}

setAdminRole(email);
