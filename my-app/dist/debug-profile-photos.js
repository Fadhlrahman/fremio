// Debug Profile Photos
// Paste this in browser console to see all profile photos

console.log("=== PROFILE PHOTO DEBUG ===\n");

// Get all localStorage keys
const allKeys = Object.keys(localStorage);
const photoKeys = allKeys.filter((key) => key.startsWith("profilePhoto_"));

console.log(`Found ${photoKeys.length} profile photo(s):\n`);

photoKeys.forEach((key) => {
  const value = localStorage.getItem(key);
  console.log(`Key: ${key}`);
  console.log(`Size: ${(value.length / 1024).toFixed(2)} KB`);
  console.log(`Preview: ${value.substring(0, 50)}...`);
  console.log("---");
});

// Get current user from AuthContext
console.log("\nCurrent User Info:");
const userStr = localStorage.getItem("user");
if (userStr) {
  try {
    const user = JSON.parse(userStr);
    console.log("UID:", user.uid || "NO UID");
    console.log("Email:", user.email || "NO EMAIL");
    console.log("Display Name:", user.displayName || "NO DISPLAY NAME");

    // Check which photo keys exist for this user
    const uidKey = `profilePhoto_${user.uid}`;
    const emailKey = `profilePhoto_${user.email}`;

    console.log("\nProfile Photo Status:");
    console.log(
      `✓ ${uidKey}: ${localStorage.getItem(uidKey) ? "EXISTS" : "NOT FOUND"}`
    );
    console.log(
      `✓ ${emailKey}: ${
        localStorage.getItem(emailKey) ? "EXISTS" : "NOT FOUND"
      }`
    );
  } catch (e) {
    console.log("User data in localStorage:", userStr);
  }
} else {
  console.log("No user in localStorage - check Firebase auth state");
}

console.log("\n=== END DEBUG ===");
