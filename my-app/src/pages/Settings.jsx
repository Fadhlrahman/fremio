import { useAuth } from "../contexts/AuthContext.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/profile.css";

// Wishlist pindah ke halaman /wishlist (mock data dipindahkan ke halaman tersebut)

const MOCK_PURCHASES = [
  {
    id: "INV-240001",
    date: "2025-06-12T09:30:00Z",
    items: 2,
    total: 120000,
    currency: "IDR",
    status: "Paid",
  },
  {
    id: "INV-240002",
    date: "2025-07-01T14:12:00Z",
    items: 1,
    total: 45000,
    currency: "IDR",
    status: "Pending",
  },
  {
    id: "INV-240003",
    date: "2025-08-05T19:05:00Z",
    items: 4,
    total: 210000,
    currency: "IDR",
    status: "Paid",
  },
];

const formatCurrency = (value, currency = "IDR") =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency }).format(value);

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const location = useLocation();
  const navigate = useNavigate();
  const purchases = useMemo(() => MOCK_PURCHASES, []);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // Derive readable identity pieces (for avatar/initials like Profile)
  const fullName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    (user?.email ? user.email.split("@")[0] : "User");

  const initials =
    (fullName || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  // Open tab from URL hash: #account | #preferences | #privacy | #purchases
  useEffect(() => {
    const hash = location.hash?.replace("#", "");
    if (!hash) return;
    const allowed = ["account", "preferences", "privacy", "purchases"];
    if (allowed.includes(hash)) setActiveTab(hash);
  }, [location.hash]);

  return (
    <section className="profile-page">
      <div className="profile-shell container">
        {/* Header matches Profile */}
        <div className="profile-header">
          <div className="profile-avatar" aria-hidden>
            <span>{initials}</span>
          </div>
          <h1 className="profile-title">Settings</h1>
        </div>

        <div className="profile-body">
          {/* Sidebar (mirrors Profile) */}
          <aside className="profile-sidebar" aria-label="Settings navigation">
            <nav>
              <Link className="nav-item" to="/profile">
                My Profile
              </Link>
              <Link className="nav-item active" to="/settings">
                Settings
              </Link>
            </nav>
            <button className="nav-logout" onClick={handleLogout}>
              Logout
            </button>
          </aside>

          {/* Content card */}
          <main className="profile-content" id="settings">
            <h2 className="section-title">Settings</h2>

            {/* Tabs */}
            <div className="flex border-b mb-4">
              <button
                onClick={() => setActiveTab("account")}
                className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                  activeTab === "account"
                    ? "text-[#e0b7a9] border-b-2 border-[#e0b7a9]"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Account
              </button>
              <button
                onClick={() => setActiveTab("preferences")}
                className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                  activeTab === "preferences"
                    ? "text-[#e0b7a9] border-b-2 border-[#e0b7a9]"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Preferences
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                  activeTab === "privacy"
                    ? "text-[#e0b7a9] border-b-2 border-[#e0b7a9]"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Privacy
              </button>
              <button
                onClick={() => setActiveTab("purchases")}
                className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                  activeTab === "purchases"
                    ? "text-[#e0b7a9] border-b-2 border-[#e0b7a9]"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Purchase History
              </button>
            </div>

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

            {/* Wishlist is a separate page (/wishlist) */}

            {activeTab === "purchases" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Purchase History
                </h3>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.length === 0 ? (
                        <tr>
                          <td className="px-4 py-3 text-gray-500" colSpan={6}>
                            Belum ada transaksi.
                          </td>
                        </tr>
                      ) : (
                        purchases.map((p) => (
                          <tr key={p.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {p.id}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {new Date(p.date).toLocaleString("id-ID")}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {p.items}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              {formatCurrency(p.total, p.currency)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold " +
                                  (p.status === "Paid"
                                    ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                                    : p.status === "Pending"
                                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                    : "bg-red-50 text-red-700 ring-1 ring-red-200")
                                }
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
