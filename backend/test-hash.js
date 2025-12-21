import bcrypt from "bcryptjs";

const password = "admin123";
const hash = await bcrypt.hash(password, 12);

console.log("Password:", password);
console.log("Hash:", hash);
console.log("");

// Test with hardcoded hash from seed.sql
const seedHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.M5nwZvvGNHhHxm";
const match = await bcrypt.compare(password, seedHash);

console.log("Testing seed.sql hash:", seedHash);
console.log("Match:", match);
