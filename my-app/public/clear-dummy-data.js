// Script to clear all dummy data and reset to real data only
// Run this in browser console

(function () {
  console.log("🧹 Clearing all dummy data...");

  // Clear frame usage (views, downloads, likes)
  localStorage.removeItem("frame_usage");
  console.log("✅ Cleared frame_usage");

  // You can also manually reset to empty array
  localStorage.setItem("frame_usage", JSON.stringify([]));

  console.log("✅ All dummy data cleared!");
  console.log("🔄 Please refresh the page to see real data only");

  return {
    message: "Success! Refresh the page.",
    clearedKeys: ["frame_usage"],
  };
})();
