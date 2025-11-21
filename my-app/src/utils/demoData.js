/**
 * Demo Data Generator for Testing
 * Creates sample data in localStorage for testing admin dashboard
 */

export function initializeDemoData() {
  console.log("🎬 Initializing demo data...");

  // Generate demo users
  const users = generateDemoUsers();
  localStorage.setItem("users", JSON.stringify(users));

  // Generate demo frame usage data
  const frames = JSON.parse(localStorage.getItem("custom_frames") || "[]");
  if (frames.length > 0) {
    const frameUsage = generateDemoFrameUsage(users, frames);
    localStorage.setItem("frame_usage", JSON.stringify(frameUsage));

    // Generate demo activities
    const activities = generateDemoActivities(users, frames);
    localStorage.setItem("recent_activities", JSON.stringify(activities));
  }

  console.log("✅ Demo data initialized!");
  console.log(`   - ${users.length} users`);
  console.log(`   - ${frames.length} frames`);

  return {
    users,
    frames,
    message:
      "Demo data generated successfully! Refresh dashboard to see updates.",
  };
}

function generateDemoUsers() {
  const names = [
    "Ahmad Fadli",
    "Siti Nurhaliza",
    "Budi Santoso",
    "Rina Wijaya",
    "Eko Prasetyo",
    "Dewi Lestari",
    "Rudi Hermawan",
    "Maya Sari",
    "Joko Widodo",
    "Ani Yudhoyono",
  ];

  return names.map((name, i) => ({
    id: `user-${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(/\s/g, ".")}@example.com`,
    createdAt: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
  }));
}

function generateDemoFrameUsage(users, frames) {
  const usage = [];

  frames.forEach((frame) => {
    // Random 3-7 users per frame
    const userCount = 3 + Math.floor(Math.random() * 5);
    const selectedUsers = users
      .sort(() => Math.random() - 0.5)
      .slice(0, userCount);

    selectedUsers.forEach((user) => {
      usage.push({
        frameId: frame.id,
        userId: user.id,
        views: Math.floor(Math.random() * 20) + 1,
        downloads: Math.floor(Math.random() * 5),
        likes: Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0,
        lastViewedAt: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    });
  });

  return usage;
}

function generateDemoActivities(users, frames) {
  const activities = [];
  const types = ["view", "download", "like"];

  // Generate 20 random activities
  for (let i = 0; i < 20; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const frame = frames[Math.floor(Math.random() * frames.length)];
    const type = types[Math.floor(Math.random() * types.length)];

    activities.push({
      type,
      userId: user.id,
      frameId: frame.id,
      frameName: frame.name,
      userName: user.name,
      timestamp: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  }

  // Sort by timestamp descending
  return activities.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

export function clearDemoData() {
  localStorage.removeItem("users");
  localStorage.removeItem("frame_usage");
  localStorage.removeItem("recent_activities");
  console.log("🗑️ Demo data cleared!");

  return {
    message: "Demo data cleared! Refresh dashboard to see updates.",
  };
}

export function getDemoDataStats() {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const frames = JSON.parse(localStorage.getItem("custom_frames") || "[]");
  const usage = JSON.parse(localStorage.getItem("frame_usage") || "[]");
  const activities = JSON.parse(
    localStorage.getItem("recent_activities") || "[]"
  );

  return {
    users: users.length,
    frames: frames.length,
    usage: usage.length,
    activities: activities.length,
  };
}
