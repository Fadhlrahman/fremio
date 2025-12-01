const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCopx_tprX2i-RbiT5AkfKlTu6LqorvaG0",
  authDomain: "fremio-64884.firebaseapp.com",
  projectId: "fremio-64884",
  storageBucket: "fremio-64884.firebasestorage.app",
  messagingSenderId: "547897501223",
  appId: "1:547897501223:web:0f45b6fabed227cae1a9d4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check all collections for users
async function checkAllCollections() {
  console.log("🔍 Checking multiple collections for user data...\n");
  
  // Check fremio_all_users
  console.log("1️⃣ fremio_all_users:");
  const fremioUsers = await getDocs(collection(db, "fremio_all_users"));
  console.log(`   Found ${fremioUsers.size} documents`);
  fremioUsers.docs.forEach(d => console.log(`   - ${d.id}`));
  
  // Check users collection (old)
  console.log("\n2️⃣ users:");
  try {
    const users = await getDocs(collection(db, "users"));
    console.log(`   Found ${users.size} documents`);
    users.docs.forEach(d => console.log(`   - ${d.id}: ${JSON.stringify(d.data()).substring(0, 80)}...`));
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }
  
  // Check analytics_sessions for non-anonymous
  console.log("\n3️⃣ analytics_sessions (non-anonymous):");
  const sessions = await getDocs(collection(db, "analytics_sessions"));
  const nonAnon = sessions.docs.filter(d => !d.id.startsWith('anon_'));
  console.log(`   Found ${nonAnon.length} non-anonymous sessions out of ${sessions.size} total`);
  nonAnon.forEach(d => console.log(`   - ${d.id}`));
  
  // Check analytics_events for user email patterns
  console.log("\n4️⃣ analytics_events (looking for user data):");
  const events = await getDocs(collection(db, "analytics_events"));
  console.log(`   Total events: ${events.size}`);
  const usersFromEvents = new Set();
  events.docs.forEach(d => {
    const data = d.data();
    if (data.userId && !data.userId.startsWith('anon_')) {
      usersFromEvents.add(data.userId);
    }
    if (data.userEmail) {
      usersFromEvents.add(data.userEmail);
    }
  });
  console.log(`   Unique users found: ${usersFromEvents.size}`);
  usersFromEvents.forEach(u => console.log(`   - ${u}`));
  
  process.exit(0);
}

checkAllCollections().catch(console.error);
