import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { isFirebaseConfigured } from "../../config/firebase";
import "../../styles/admin.css";
import {
  TrendingUp,
  Users,
  FileImage,
  Eye,
  Download,
  Heart,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

export default function AdminAnalytics() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("7days"); // 7days, 30days, 90days, all
  const [analytics, setAnalytics] = useState({
    overview: {
      totalViews: 0,
      totalDownloads: 0,
      totalLikes: 0,
      totalFrames: 0,
      totalUsers: 0,
      totalKreators: 0,
    },
    trends: {
      viewsTrend: 0,
      downloadsTrend: 0,
      likesTrend: 0,
      usersTrend: 0,
    },
    topFrames: [],
    topUsers: [],
    categoryStats: [],
    recentActivity: [],
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    if (!isFirebaseConfigured) {
      // Load REAL data from localStorage
      const customFrames = JSON.parse(
        localStorage.getItem("custom_frames") || "[]"
      );
      const frameUsage = JSON.parse(
        localStorage.getItem("frame_usage") || "[]"
      );
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const activities = JSON.parse(
        localStorage.getItem("recent_activities") || "[]"
      );

      // Calculate totals
      const totalViews = frameUsage.reduce(
        (sum, usage) => sum + (usage.views || 0),
        0
      );
      const totalDownloads = frameUsage.reduce(
        (sum, usage) => sum + (usage.downloads || 0),
        0
      );
      const totalLikes = frameUsage.reduce(
        (sum, usage) => sum + (usage.likes || 0),
        0
      );

      // Calculate top frames
      const frameStats = {};
      frameUsage.forEach((usage) => {
        if (!frameStats[usage.frameId]) {
          const frame = customFrames.find((f) => f.id === usage.frameId);
          frameStats[usage.frameId] = {
            id: usage.frameId,
            name: frame?.name || `Frame ${usage.frameId}`,
            kreator: frame?.kreatorName || "Unknown",
            views: 0,
            downloads: 0,
            likes: 0,
          };
        }
        frameStats[usage.frameId].views += usage.views || 0;
        frameStats[usage.frameId].downloads += usage.downloads || 0;
        frameStats[usage.frameId].likes += usage.likes || 0;
      });

      const topFrames = Object.values(frameStats)
        .sort((a, b) => b.views - a.views)
        .slice(0, 3);

      // Calculate top users
      const userStats = {};
      frameUsage.forEach((usage) => {
        if (!userStats[usage.userId]) {
          const user = users.find((u) => u.id === usage.userId);
          userStats[usage.userId] = {
            id: usage.userId,
            name: user?.name || `User ${usage.userId}`,
            email: user?.email || "",
            framesUsed: 0,
            totalViews: 0,
            lastActive: user?.lastActive || "Unknown",
          };
        }
        userStats[usage.userId].framesUsed += 1;
        userStats[usage.userId].totalViews += usage.views || 0;
      });

      const topUsers = Object.values(userStats)
        .sort((a, b) => b.framesUsed - a.framesUsed)
        .slice(0, 3);

      // Calculate category stats
      const categoryStats = {};
      customFrames.forEach((frame) => {
        const category = frame.category || "Other";
        if (!categoryStats[category]) {
          categoryStats[category] = { category, frames: 0, views: 0 };
        }
        categoryStats[category].frames += 1;

        // Sum views for this frame
        const frameViews = frameUsage
          .filter((usage) => usage.frameId === frame.id)
          .reduce((sum, usage) => sum + (usage.views || 0), 0);
        categoryStats[category].views += frameViews;
      });

      const totalCategoryViews = Object.values(categoryStats).reduce(
        (sum, cat) => sum + cat.views,
        0
      );
      const categoryStatsArray = Object.values(categoryStats)
        .map((cat) => ({
          ...cat,
          percentage:
            totalCategoryViews > 0
              ? Math.round((cat.views / totalCategoryViews) * 100)
              : 0,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      // Get recent activities
      const recentActivity = activities.slice(0, 10).map((activity) => ({
        type: activity.type || "view",
        user: activity.userName || `User ${activity.userId}`,
        frame: activity.frameName || `Frame ${activity.frameId}`,
        time: activity.time || "Just now",
      }));

      setAnalytics({
        overview: {
          totalViews,
          totalDownloads,
          totalLikes,
          totalFrames: customFrames.length,
          totalUsers: users.length,
        },
        trends: {
          viewsTrend: 0, // TODO: Calculate from historical data
          downloadsTrend: 0,
          likesTrend: 0,
          usersTrend: 0,
        },
        topFrames,
        topUsers,
        categoryStats: categoryStatsArray,
        recentActivity,
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Load from Firebase Analytics service
      console.log("Loading analytics for:", timeRange);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
    setLoading(false);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <ArrowUp size={16} />;
    if (trend < 0) return <ArrowDown size={16} />;
    return <Minus size={16} />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return "#22c55e";
    if (trend < 0) return "#ef4444";
    return "#6b7280";
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: "48px",
              height: "48px",
              border: "4px solid #f3f4f6",
              borderTop: "4px solid var(--accent)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px",
            }}
          ></div>
          <p style={{ color: "var(--text-secondary)" }}>Loading analytics...</p>
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
          <div className="admin-alert">
            <AlertCircle size={24} className="admin-alert-icon" />
            <div>
              <h3 className="admin-alert-title">
                LocalStorage Mode - Real Data
              </h3>
              <p className="admin-alert-message">
                Firebase is not configured. You're viewing real analytics data
                from localStorage. Setup Firebase for cloud-based analytics.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(22px, 4vw, 34px)",
                  fontWeight: "800",
                  color: "#222",
                  margin: "0 0 8px",
                }}
              >
                Analytics Dashboard
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
                Track performance metrics and user engagement
              </p>
            </div>

            {/* Time Range Selector */}
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { value: "7days", label: "7 Days" },
                { value: "30days", label: "30 Days" },
                { value: "90days", label: "90 Days" },
                { value: "all", label: "All Time" },
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  style={{
                    padding: "8px 16px",
                    background:
                      timeRange === range.value ? "var(--accent)" : "white",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: timeRange === range.value ? "white" : "#222",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <MetricCard
            icon={<Eye size={24} />}
            label="Total Views"
            value={formatNumber(analytics.overview.totalViews)}
            trend={analytics.trends.viewsTrend}
            color="#3b82f6"
          />
          <MetricCard
            icon={<Download size={24} />}
            label="Downloads"
            value={formatNumber(analytics.overview.totalDownloads)}
            trend={analytics.trends.downloadsTrend}
            color="#8b5cf6"
          />
          <MetricCard
            icon={<Heart size={24} />}
            label="Likes"
            value={formatNumber(analytics.overview.totalLikes)}
            trend={analytics.trends.likesTrend}
            color="#ec4899"
          />
          <MetricCard
            icon={<Users size={24} />}
            label="Total Users"
            value={formatNumber(analytics.overview.totalUsers)}
            trend={analytics.trends.usersTrend}
            color="#10b981"
          />
        </div>

        {/* Charts Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          {/* Top Frames */}
          <div className="admin-card" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f59e0b",
                }}
              >
                <TrendingUp size={20} />
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#222",
                  margin: 0,
                }}
              >
                Top Performing Frames
              </h3>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {analytics.topFrames.map((frame, index) => (
                <div
                  key={frame.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    background: "#faf6f5",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "var(--accent)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: "700",
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#222",
                        marginBottom: "2px",
                      }}
                    >
                      {frame.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      by {frame.kreator}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#222",
                      }}
                    >
                      {formatNumber(frame.views)}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      views
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="admin-card" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#e0e7ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6366f1",
                }}
              >
                <PieChart size={20} />
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#222",
                  margin: 0,
                }}
              >
                Category Distribution
              </h3>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {analytics.categoryStats.map((cat) => (
                <div key={cat.category}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#222",
                      }}
                    >
                      {cat.category}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {cat.percentage}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      background: "#f3f4f6",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${cat.percentage}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, var(--accent) 0%, #d4a193 100%)`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Users & Recent Activity */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {/* Top Users by Frame Usage */}
          <div className="admin-card" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#dbeafe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3b82f6",
                }}
              >
                <Users size={20} />
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#222",
                  margin: 0,
                }}
              >
                Top Users by Frame Usage
              </h3>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {analytics.topUsers.map((user, index) => (
                <div
                  key={user.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    background: "#faf6f5",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, var(--accent) 0%, #d4a193 100%)`,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "700",
                      flexShrink: 0,
                    }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#222",
                        marginBottom: "2px",
                      }}
                    >
                      {user.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {user.framesUsed} frames used •{" "}
                      {formatNumber(user.totalViews)} views
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="admin-card" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a",
                }}
              >
                <Activity size={20} />
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#222",
                  margin: 0,
                }}
              >
                Recent Activity
              </h3>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {analytics.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "start",
                    gap: "12px",
                    padding: "12px",
                    background: "#faf6f5",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background:
                        activity.type === "view"
                          ? "#dbeafe"
                          : activity.type === "download"
                          ? "#e9d5ff"
                          : "#fce7f3",
                      color:
                        activity.type === "view"
                          ? "#3b82f6"
                          : activity.type === "download"
                          ? "#8b5cf6"
                          : "#ec4899",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {activity.type === "view" && <Eye size={16} />}
                    {activity.type === "download" && <Download size={16} />}
                    {activity.type === "like" && <Heart size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#222",
                        marginBottom: "2px",
                      }}
                    >
                      <strong>{activity.user}</strong>{" "}
                      {activity.type === "view" && "viewed"}
                      {activity.type === "download" && "downloaded"}
                      {activity.type === "like" && "liked"}{" "}
                      <strong>{activity.frame}</strong>
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, trend, color }) {
  const getTrendIcon = (trend) => {
    if (trend > 0) return <ArrowUp size={14} />;
    if (trend < 0) return <ArrowDown size={14} />;
    return <Minus size={14} />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return "#22c55e";
    if (trend < 0) return "#ef4444";
    return "#6b7280";
  };

  return (
    <div className="admin-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "start", gap: "16px" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "12px",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#222",
              lineHeight: 1,
              marginBottom: "8px",
            }}
          >
            {value}
          </div>
          {trend !== undefined && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: "600",
                color: getTrendColor(trend),
              }}
            >
              {getTrendIcon(trend)}
              <span>{Math.abs(trend).toFixed(1)}% vs last period</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
