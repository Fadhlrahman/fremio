import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isFirebaseConfigured } from "../../config/firebase";
import { getAllCustomFrames } from "../../services/customFrameService";
import "../../styles/admin.css";
import { FileImage, Eye, Download, Heart, AlertCircle } from "lucide-react";

export default function AdminFrames() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [frames, setFrames] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  // Fetch frames (Firebase or LocalStorage custom frames)
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isFirebaseConfigured) {
      // Load custom frames from localStorage
      const customFrames = getAllCustomFrames();
      setFrames(customFrames);

      // Calculate stats from custom frames
      const statsData = {
        total: customFrames.length,
      };
      setStats(statsData);
      return;
    }

    setLoading(true);

    try {
      const { getAllFrames, getFrameStats } = await import(
        "../../services/frameManagementService"
      );

      const [framesData, statsData] = await Promise.all([
        getAllFrames(),
        getFrameStats(),
      ]);

      setFrames(framesData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching frames:", error);
    }

    setLoading(false);
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
          <p style={{ color: "var(--text-secondary)" }}>Loading frames...</p>
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
                LocalStorage Mode - UI Preview Only
              </h3>
              <p className="admin-alert-message">
                Firebase is not configured. Frames list and actions are
                disabled. Setup Firebase to enable full functionality.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 34px)",
              fontWeight: "800",
              color: "#222",
              margin: "0 0 8px",
            }}
          >
            Frame Management
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
            Review and manage community-submitted frames
          </p>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <StatCard title="Total Frames" value={stats.total} color="#3b82f6" />
        </div>

        {/* Frames Grid */}
        {frames.length === 0 ? (
          <div
            className="admin-card"
            style={{
              padding: "60px 20px",
              textAlign: "center",
            }}
          >
            <FileImage
              size={48}
              style={{ margin: "0 auto 16px", color: "var(--text-secondary)" }}
            />
            <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
              Belum ada frame. Upload frame pertama Anda!
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {frames.map((frame) => (
              <FrameCard key={frame.id} frame={frame} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, color }) {
  return (
    <div className="admin-card" style={{ padding: "20px" }}>
      <div
        style={{
          backgroundColor: color,
          color: "white",
          padding: "10px",
          borderRadius: "10px",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "12px",
        }}
      >
        <FileImage size={20} />
      </div>
      <p
        style={{
          fontSize: "28px",
          fontWeight: "800",
          color: "#2d1b14",
          marginBottom: "6px",
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: "14px",
          color: "#8b7064",
          fontWeight: "500",
        }}
      >
        {title}
      </p>
    </div>
  );
}

// Frame Card Component
function FrameCard({ frame }) {
  return (
    <div className="admin-card" style={{ padding: "26px" }}>
      <div style={{ display: "flex", gap: "24px" }}>
        {/* Thumbnail */}
        <div
          style={{
            flexShrink: 0,
            width: "200px",
            height: "200px",
            background: "linear-gradient(135deg, #fef3f0 0%, #f7ebe7 100%)",
            borderRadius: "14px",
            overflow: "hidden",
            border: "2px solid var(--border)",
          }}
        >
          {frame.thumbnailUrl ? (
            <img
              src={frame.thumbnailUrl}
              alt={frame.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <FileImage size={48} style={{ color: "#c8b5ae" }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#2d1b14",
                  marginBottom: "6px",
                }}
              >
                {frame.name}
              </h3>
              <p
                style={{
                  color: "#8b7064",
                  marginBottom: "10px",
                  fontSize: "15px",
                }}
              >
                {frame.description || "No description"}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#a89289",
                  fontWeight: "500",
                }}
              >
                Created by:{" "}
                <span style={{ fontWeight: "700", color: "#6d5449" }}>
                  {frame.creatorName || "Unknown"}
                </span>
              </p>
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              marginBottom: "20px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#8b7064",
              }}
            >
              <Eye size={16} />
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                {frame.views || 0} views
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#8b7064",
              }}
            >
              <Download size={16} />
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                {frame.uses || 0} uses
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#8b7064",
              }}
            >
              <Heart size={16} />
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                {frame.likes || 0} likes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
