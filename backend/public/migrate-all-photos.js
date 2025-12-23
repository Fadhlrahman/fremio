// Migrate All Profile Photos Script
// Run this in browser console to migrate all existing profile photos

console.log("=== PROFILE PHOTO MIGRATION SCRIPT ===\n");

// Get all localStorage keys
const allKeys = Object.keys(localStorage);
const photoKeys = allKeys.filter((key) => key.startsWith("profilePhoto_"));

console.log(`Found ${photoKeys.length} profile photo(s) in storage\n`);

// Get current user
const userStr = localStorage.getItem("fremio_user");
if (!userStr) {
  console.error("❌ No user logged in. Please login first.");
} else {
  try {
    const user = JSON.parse(userStr);
    console.log("Current User:");
    console.log(`  UID: ${user.uid || "NO UID"}`);
    console.log(`  Email: ${user.email || "NO EMAIL"}\n`);

    if (!user.uid) {
      console.error("❌ User has no UID. Cannot migrate.");
    } else {
      const emailKey = `profilePhoto_${user.email}`;
      const uidKey = `profilePhoto_${user.uid}`;

      const photoByEmail = localStorage.getItem(emailKey);
      const photoByUid = localStorage.getItem(uidKey);

      console.log("Migration Status:");
      console.log(
        `  Email-based key (${emailKey}): ${
          photoByEmail ? "EXISTS" : "NOT FOUND"
        }`
      );
      console.log(
        `  UID-based key (${uidKey}): ${photoByUid ? "EXISTS" : "NOT FOUND"}\n`
      );

      if (photoByEmail && !photoByUid) {
        // Migrate
        localStorage.setItem(uidKey, photoByEmail);
        console.log("✅ MIGRATED: Copied photo from email key to UID key");
        console.log(`   Source: ${emailKey}`);
        console.log(`   Target: ${uidKey}`);
        console.log(`   Size: ${(photoByEmail.length / 1024).toFixed(2)} KB\n`);

        // Optionally remove old email-based key
        console.log(
          "Keep email-based key for backward compatibility? (Recommended: YES)"
        );
        console.log(
          'To remove email key, run: localStorage.removeItem("' +
            emailKey +
            '")'
        );
      } else if (photoByUid && photoByEmail) {
        console.log("ℹ️  Both keys exist. Photo already migrated.");
        console.log("   You can optionally remove email key for cleanup:");
        console.log('   localStorage.removeItem("' + emailKey + '")');
      } else if (photoByUid && !photoByEmail) {
        console.log("✅ Already using UID-based key. No migration needed.");
      } else {
        console.log("ℹ️  No profile photo found. Upload a photo in Settings.");
      }
    }
  } catch (e) {
    console.error("❌ Error parsing user data:", e);
  }
}

console.log("\n=== END MIGRATION ===");
console.log("\nTip: Refresh page to see changes take effect.");
