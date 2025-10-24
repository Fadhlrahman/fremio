import { useAuth } from "../contexts/AuthContext.jsx";
import { useState } from "react";

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("account");

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] p-8">
            <h2 className="text-3xl font-bold text-white">Settings</h2>
            <p className="text-white/90 mt-2">
              Manage your account preferences and settings
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("account")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "account"
                  ? "text-[#e0b7a9] border-b-2 border-[#e0b7a9]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "preferences"
                  ? "text-[#e0b7a9] border-b-2 border-[#e0b7a9]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "privacy"
                  ? "text-[#e0b7a9] border-b-2 border-[#e0b7a9]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Privacy
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {activeTab === "account" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Account Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={
                        user?.name || `${user?.firstName} ${user?.lastName}`
                      }
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-[#e0b7a9] to-[#c89585] text-white rounded-lg hover:shadow-lg transition-all"
                      onClick={() => alert("Edit profile feature coming soon!")}
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Preferences
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Email Notifications
                      </p>
                      <p className="text-sm text-gray-600">
                        Receive email updates about your activity
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#e0b7a9]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e0b7a9]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Dark Mode</p>
                      <p className="text-sm text-gray-600">Enable dark theme</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#e0b7a9]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e0b7a9]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Auto-save Photos
                      </p>
                      <p className="text-sm text-gray-600">
                        Automatically save captured photos
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#e0b7a9]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e0b7a9]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Privacy & Security
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Change Password
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Update your password regularly to keep your account secure
                    </p>
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-[#e0b7a9] to-[#c89585] text-white rounded-lg hover:shadow-lg transition-all"
                      onClick={() =>
                        alert("Change password feature coming soon!")
                      }
                    >
                      Change Password
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Two-Factor Authentication
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Add an extra layer of security to your account
                    </p>
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-[#e0b7a9] to-[#c89585] text-white rounded-lg hover:shadow-lg transition-all"
                      onClick={() => alert("2FA feature coming soon!")}
                    >
                      Enable 2FA
                    </button>
                  </div>

                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">
                      Delete Account
                    </h4>
                    <p className="text-sm text-red-700 mb-4">
                      Permanently delete your account and all associated data
                    </p>
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete your account? This action cannot be undone."
                          )
                        ) {
                          alert("Account deletion feature coming soon!");
                        }
                      }}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
