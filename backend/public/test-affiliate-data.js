// Test script to add dummy affiliate applications to localStorage
// Run this in browser console: copy and paste the entire code

(function () {
  const STORAGE_KEY = "fremio_affiliate_applications";

  const dummyApplications = [
    {
      id: "aff_1732550000000_test001",
      name: "John Doe",
      email: "john@example.com",
      website: "https://johndoe.com",
      platform: "instagram",
      followers: "10k-50k",
      niche: "photography",
      message:
        "I love creating content and want to promote Fremio to my audience.",
      status: "pending",
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    },
    {
      id: "aff_1732550001000_test002",
      name: "Sarah Smith",
      email: "sarah@example.com",
      website: "https://sarahsmith.blog",
      platform: "youtube",
      followers: "50k-100k",
      niche: "design",
      message:
        "I create design tutorials and Fremio would be perfect for my viewers.",
      status: "pending",
      submittedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      reviewedAt: null,
      reviewedBy: null,
    },
    {
      id: "aff_1732550002000_test003",
      name: "Mike Johnson",
      email: "mike@example.com",
      website: "https://mikejohnson.com",
      platform: "tiktok",
      followers: "1k-10k",
      niche: "lifestyle",
      message:
        "Fremio is amazing! I want to share it with my TikTok community.",
      status: "approved",
      submittedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      reviewedAt: new Date(Date.now() - 86400000).toISOString(),
      reviewedBy: "admin@admin.com",
    },
  ];

  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dummyApplications));

  console.log(
    "✅ Successfully added 3 dummy affiliate applications to localStorage!"
  );
  console.log("📊 Applications:", dummyApplications);
  console.log("🔄 Please refresh the admin page to see the data");

  return dummyApplications;
})();
