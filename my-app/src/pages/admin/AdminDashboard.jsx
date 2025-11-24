import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isFirebaseConfigured } from "../../config/firebase";
import { getAllCustomFrames } from "../../services/customFrameService";
import { getUnreadMessagesCount } from "../../services/contactMessageService";
import { getAllUsers } from "../../services/userService";
import { getAffiliateStats } from "../../services/affiliateService";
import "../../styles/admin.css";
import {
  Users,
  FileImage,
  TrendingUp,
  Shield,
  Package,
  Settings,
  AlertCircle,
  Upload,
  Eye,
  Download,
  Heart,
  Mail,
  Handshake,
} from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [stats, setStats] = useState({
    totalFrames: 0,
    totalUsers: 0,
    totalViews: 0,
    totalDownloads: 0,
    totalLikes: 0,
    unreadMessages: 0,
    pendingAffiliates: 0,
    totalAffiliates: 0,
  });
  const [loading, setLoading] = useState(false);

  // Load REAL stats from localStorage
  const loadStats = async () => {
    try {
      console.log("📊 AdminDashboard - Loading stats...");
      const frames = getAllCustomFrames();
      console.log("📊 Frames loaded:", frames.length);

      const usersData = await getAllUsers();
      console.log("📊 Users loaded:", usersData.length, usersData);

      const usage = JSON.parse(localStorage.getItem("frame_usage") || "[]");
      const unreadMessages = await getUnreadMessagesCount();
      const affiliateStats = await getAffiliateStats();

      const totalViews = usage.reduce((sum, u) => sum + (u.views || 0), 0);
      const totalDownloads = usage.reduce(
        (sum, u) => sum + (u.downloads || 0),
        0
      );
      const totalLikes = usage.reduce((sum, u) => sum + (u.likes || 0), 0);

      const newStats = {
        totalFrames: frames.length,
        totalUsers: usersData.length,
        totalViews,
        totalDownloads,
        totalLikes,
        unreadMessages,
        pendingAffiliates: affiliateStats.pending,
        totalAffiliates: affiliateStats.total,
      };

      console.log("📊 Final stats:", newStats);
      setStats(newStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  // Fetch dashboard stats
  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, #fdf7f4 0%, #fff 50%, #f7f1ed 100%)",
        minHeight: "100vh",
        padding: "32px 0 48px",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "0 16px" }}>
        {/* Firebase Warning Banner */}
        {!isFirebaseConfigured && (
          <div
            style={{
              marginBottom: "24px",
              background: "#fef9c3",
              border: "1px solid #fde047",
              borderRadius: "14px",
              padding: "16px 18px",
            }}
          >
            <div
              style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}
            >
              <AlertCircle
                size={24}
                style={{ color: "#ca8a04", flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#854d0e",
                    marginBottom: "4px",
                  }}
                >
                  LocalStorage Mode - UI Preview Only
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#a16207",
                    marginBottom: "8px",
                  }}
                >
                  Firebase is not configured. You're viewing the admin UI with
                  demo data. To enable full functionality (data management,
                  approvals, etc.), please setup Firebase.
                </p>
                <p style={{ fontSize: "12px", color: "#ca8a04" }}>
                  📖 See{" "}
                  <code
                    style={{
                      background: "#fef08a",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    QUICK_START_GUIDE.md
                  </code>{" "}
                  for setup instructions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <StatCard
            title="Total Frames"
            value={stats.totalFrames}
            subtitle="Custom frames uploaded"
            icon={<FileImage size={24} />}
            color="#3b82f6"
            onClick={() => navigate("/admin/frames")}
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            subtitle="Registered users"
            icon={<Users size={24} />}
            color="#a855f7"
            onClick={() => navigate("/admin/analytics")}
          />
          <StatCard
            title="Total Views"
            value={stats.totalViews}
            subtitle="Frame views"
            icon={<Eye size={24} />}
            color="#10b981"
            onClick={() => navigate("/admin/analytics")}
          />
          <StatCard
            title="Total Downloads"
            value={stats.totalDownloads}
            subtitle="Frame downloads"
            icon={<Download size={24} />}
            color="#f59e0b"
            onClick={() => navigate("/admin/analytics")}
          />
          <StatCard
            title="Total Likes"
            value={stats.totalLikes}
            subtitle="Frame likes"
            icon={<Heart size={24} />}
            color="#ef4444"
            onClick={() => navigate("/admin/analytics")}
          />
          <StatCard
            title="Pesan Baru"
            value={stats.unreadMessages}
            subtitle="Pesan belum dibaca"
            icon={<Mail size={24} />}
            color="#8b5cf6"
            onClick={() => navigate("/admin/messages")}
            badge={stats.unreadMessages > 0}
          />
          <StatCard
            title="Affiliate Apps"
            value={stats.pendingAffiliates}
            subtitle={`${stats.totalAffiliates} total aplikasi`}
            icon={<Handshake size={24} />}
            color="#06b6d4"
            onClick={() => navigate("/admin/affiliates")}
            badge={stats.pendingAffiliates > 0}
          />
        </div>

        {/* Frame Management Section */}
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #ecdeda",
            borderRadius: "14px",
            marginBottom: "24px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "22px 24px",
              borderBottom: "1px solid #f3ebe8",
            }}
          >
            <h2
              style={{
                margin: "0 0 4px",
                fontSize: "20px",
                fontWeight: "800",
                color: "#333",
              }}
            >
              Quick Actions
            </h2>
            <p style={{ margin: 0, color: "#6b6b6b", fontSize: "14px" }}>
              Manage frames and test with demo data
            </p>
          </div>
          <div style={{ padding: "22px 24px" }}>
            {/* Info Message when no frames */}
            {stats.totalFrames === 0 && (
              <div
                style={{
                  backgroundColor: "#f0f9ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FileImage
                  size={20}
                  style={{ color: "#3b82f6", flexShrink: 0 }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "#1e40af",
                    lineHeight: "1.5",
                  }}
                >
                  Belum ada frame yang diupload. Klik{" "}
                  <strong>"Upload Frame"</strong> untuk menambahkan frame custom
                  pertama Anda!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <button
                onClick={() => navigate("/admin/upload-frame")}
                style={{
                  padding: "12px",
                  background:
                    "linear-gradient(135deg, #e0b7a9 0%, #d4a396 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 8px rgba(224, 183, 169, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(224, 183, 169, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(224, 183, 169, 0.3)";
                }}
              >
                <Upload size={18} />
                Upload Frame
              </button>

              <button
                onClick={() => navigate("/admin/frames")}
                style={{
                  padding: "12px",
                  background: "white",
                  color: "#333",
                  border: "2px solid #e0b7a9",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#faf6f5";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <FileImage size={18} />
                Manage Frames
              </button>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #ecdeda",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "22px 24px",
              borderBottom: "1px solid #f3ebe8",
            }}
          >
            <h2
              style={{
                margin: "0 0 4px",
                fontSize: "20px",
                fontWeight: "800",
                color: "#333",
              }}
            >
              Quick Actions
            </h2>
            <p style={{ margin: 0, color: "#6b6b6b", fontSize: "14px" }}>
              Common administrative tasks
            </p>
          </div>
          <div
            style={{
              padding: "22px 24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            <ActionButton
              icon={<Upload size={20} />}
              label="Upload Frame"
              description="Upload custom PNG frame"
              onClick={() => navigate("/admin/upload-frame")}
              highlight={true}
            />
            <ActionButton
              icon={<Users size={20} />}
              label="Manage Users"
              description="View and manage user accounts"
              onClick={() => navigate("/admin/users")}
            />
            <ActionButton
              icon={<FileImage size={20} />}
              label="Manage Frames"
              description="View and manage frames"
              onClick={() => navigate("/admin/frames")}
            />
            <ActionButton
              icon={<Package size={20} />}
              label="Categories"
              description="Manage frame categories"
              onClick={() => navigate("/admin/categories")}
            />
            <ActionButton
              icon={<TrendingUp size={20} />}
              label="Analytics"
              description="View platform statistics"
              onClick={() => navigate("/admin/analytics")}
            />
            <ActionButton
              icon={<Mail size={20} />}
              label="Messages"
              description="View contact messages"
              onClick={() => navigate("/admin/messages")}
              badge={stats.unreadMessages}
            />
            <ActionButton
              icon={<Settings size={20} />}
              label="Settings"
              description="Platform configuration"
              onClick={() => navigate("/admin/settings")}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  onClick,
  badge = false,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#ffffff",
        border: "1px solid #ecdeda",
        borderRadius: "14px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {badge && value > 0 && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "#ef4444",
            color: "white",
            borderRadius: "12px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            fontWeight: "700",
            animation: "pulse 2s infinite",
          }}
        >
          NEW
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            background: color,
            color: "white",
            padding: "10px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
      <h3
        style={{
          fontSize: "28px",
          fontWeight: "800",
          color: "#222",
          margin: "0 0 4px",
        }}
      >
        {value}
      </h3>
      <p
        style={{
          fontSize: "14px",
          fontWeight: "700",
          color: "#333",
          margin: "0 0 2px",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "12px",
          color: "#6b6b6b",
          margin: 0,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

// Mini Stat Card Component
function MiniStatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "#faf6f5",
        border: "1px solid #f0e4e0",
        borderRadius: "10px",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          color: "#6b6b6b",
          margin: "0 0 6px",
          fontWeight: "600",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "24px",
          fontWeight: "800",
          color: color,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// Action Button Component
function ActionButton({
  icon,
  label,
  description,
  onClick,
  highlight = false,
  badge = 0,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "16px",
        borderRadius: "10px",
        border: highlight ? "2px solid #e0b7a9" : "1px solid #ecdeda",
        background: highlight
          ? "linear-gradient(135deg, #fff5f2 0%, #ffffff 100%)"
          : "#ffffff",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.2s",
        width: "100%",
        boxShadow: highlight ? "0 4px 12px rgba(224, 183, 169, 0.2)" : "none",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = highlight
          ? "linear-gradient(135deg, #fff0ec 0%, #fef9f7 100%)"
          : "#faf6f5";
        e.currentTarget.style.borderColor = "#e0b7a9";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 6px 16px rgba(224, 183, 169, 0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = highlight
          ? "linear-gradient(135deg, #fff5f2 0%, #ffffff 100%)"
          : "#ffffff";
        e.currentTarget.style.borderColor = highlight ? "#e0b7a9" : "#ecdeda";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = highlight
          ? "0 4px 12px rgba(224, 183, 169, 0.2)"
          : "none";
      }}
    >
      {badge > 0 && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "#ef4444",
            color: "white",
            borderRadius: "12px",
            padding: "4px 8px",
            fontSize: "0.7rem",
            fontWeight: "700",
            minWidth: "20px",
            textAlign: "center",
          }}
        >
          {badge}
        </div>
      )}
      <div
        style={{
          color: highlight ? "#e0b7a9" : "var(--accent, #e0b7a9)",
          flexShrink: 0,
          marginTop: "2px",
          background: highlight ? "#e0b7a9" : "transparent",
          padding: highlight ? "8px" : "0",
          borderRadius: highlight ? "8px" : "0",
        }}
      >
        <div style={{ color: highlight ? "white" : "#e0b7a9" }}>{icon}</div>
      </div>
      <div>
        <p
          style={{
            fontWeight: "700",
            color: highlight ? "#e0b7a9" : "#222",
            margin: "0 0 4px",
            fontSize: "15px",
          }}
        >
          {label}
          {highlight && (
            <span
              style={{
                marginLeft: "8px",
                fontSize: "11px",
                fontWeight: "600",
                background: "#e0b7a9",
                color: "white",
                padding: "2px 8px",
                borderRadius: "6px",
              }}
            >
              NEW
            </span>
          )}
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "#6b6b6b",
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
    </button>
  );
}
