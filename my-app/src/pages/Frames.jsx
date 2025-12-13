import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import unifiedFrameService from "../services/unifiedFrameService";
import paymentService from "../services/paymentService";
import { trackFrameView } from "../services/analyticsService";

// Helper to construct full URL for frame images
const getFrameImageUrl = (frame) => {
  const imagePath = frame.imageUrl || frame.thumbnailUrl || frame.imagePath;
  if (!imagePath) return null;

  // Already a full URL
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Relative path - construct full URL using API base
  const apiBase =
    import.meta.env.VITE_API_BASE_URL || "https://192.168.100.160:3000";
  return `${apiBase}${imagePath}`;
};

// FrameCard component with expandable description
function FrameCard({
  frame,
  onSelect,
  imageError,
  onImageError,
  getImageUrl,
  isLocked,
}) {
  const [expanded, setExpanded] = useState(false);
  const description = frame.description || "";
  const maxLength = 50; // characters before truncating
  const shouldTruncate = description.length > maxLength;
  const displayDescription = expanded
    ? description
    : description.slice(0, maxLength);

  return (
    <div
      className="frame-card"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "8px",
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        border: "2px solid transparent",
        cursor: "pointer",
        transition:
          "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        position: "relative",
        opacity: isLocked ? 0.7 : 1,
      }}
      onClick={() => onSelect(frame)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
        e.currentTarget.style.borderColor = isLocked ? "#94a3b8" : "#e0a899";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      {/* Locked Badge */}
      {isLocked && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: "600",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          🔒 Premium
        </div>
      )}

      {/* Frame Image Container - 9:16 aspect ratio */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#f9fafb",
          aspectRatio: "9/16",
          width: "100%",
          padding: "12px",
          boxSizing: "border-box",
        }}
      >
        {imageError ? (
          <div
            style={{
              position: "absolute",
              inset: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
            }}
          >
            <span style={{ fontSize: "12px" }}>Gambar tidak tersedia</span>
          </div>
        ) : (
          <img
            src={getImageUrl(frame)}
            alt={frame.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "4px",
            }}
            onError={() => onImageError(frame.id)}
          />
        )}
      </div>

      {/* Frame Name - wrap to multiple lines if needed, smaller font for long names */}
      <div
        style={{
          padding: "8px 8px 4px 8px",
          textAlign: "center",
          fontSize: frame.name && frame.name.length > 25 ? "10px" : "12px",
          fontWeight: 600,
          color: "#1e293b",
          lineHeight: "1.3",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          hyphens: "auto",
          minHeight: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {frame.name}
      </div>

      {/* Frame Description */}
      {description && (
        <div
          style={{
            padding: "0 8px 8px 8px",
            textAlign: "center",
            fontSize: "10px",
            color: "#64748b",
            lineHeight: "1.4",
          }}
        >
          <span>
            {displayDescription}
            {shouldTruncate && !expanded && "..."}
          </span>
          {shouldTruncate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{
                display: "inline",
                marginLeft: "4px",
                padding: 0,
                border: "none",
                background: "none",
                color: "#c89585",
                fontSize: "10px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {expanded ? "Sembunyikan" : "Selengkapnya"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Frames() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [customFrames, setCustomFrames] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [accessibleFrameIds, setAccessibleFrameIds] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Group frames by category and sort categories by min displayOrder
  const groupedFrames = (() => {
    // First, group frames by category
    const groups = customFrames.reduce((acc, frame) => {
      const category = frame.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(frame);
      return acc;
    }, {});

    // Sort frames within each category by displayOrder
    Object.keys(groups).forEach((category) => {
      groups[category].sort(
        (a, b) => (a.displayOrder || 999) - (b.displayOrder || 999)
      );
    });

    // Get category order based on minimum displayOrder of frames in each category
    const categoryOrder = Object.keys(groups).map((category) => ({
      category,
      minDisplayOrder: Math.min(
        ...groups[category].map((f) => f.displayOrder || 999)
      ),
    }));

    // Sort categories by their minimum displayOrder
    categoryOrder.sort((a, b) => a.minDisplayOrder - b.minDisplayOrder);

    // Build ordered result
    const orderedGroups = {};
    categoryOrder.forEach(({ category }) => {
      orderedGroups[category] = groups[category];
    });

    return orderedGroups;
  })();

  // Clear old frameConfig when entering Frames page
  useEffect(() => {
    // Clear frame-related data
    safeStorage.removeItem("frameConfig");
    safeStorage.removeItem("frameConfigTimestamp");
    safeStorage.removeItem("selectedFrame");
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");

    // Load custom frames and user access
    const loadFramesAndAccess = async () => {
      setLoading(true);
      try {
        // Load frames
        console.log("🔍 Loading custom frames...");
        console.log(
          `📡 Backend mode: ${
            unifiedFrameService.isVPSMode() ? "VPS" : "Firebase"
          }`
        );

        const loadedCustomFrames = await unifiedFrameService.getAllFrames();
        console.log("🎨 Custom frames loaded:", loadedCustomFrames.length);

        // Sort by displayOrder globally first
        loadedCustomFrames.sort(
          (a, b) => (a.displayOrder || 999) - (b.displayOrder || 999)
        );

        if (loadedCustomFrames.length > 0) {
          loadedCustomFrames.forEach((f, idx) => {
            console.log(
              `  ${idx + 1}. ${f.name} (ID: ${f.id}, Order: ${
                f.displayOrder ?? "N/A"
              })`
            );
            console.log(
              `     - imagePath: ${(f.imagePath || f.imageUrl || "")?.substring(
                0,
                60
              )}...`
            );
          });
        } else {
          console.warn("⚠️ NO CUSTOM FRAMES FOUND!");
        }

        setCustomFrames(loadedCustomFrames);

        // Check user access (only if logged in)
        if (currentUser) {
          try {
            const accessResponse = await paymentService.getAccess();
            if (accessResponse.success && accessResponse.hasAccess) {
              setHasAccess(true);
              setAccessibleFrameIds(accessResponse.data.frameIds || []);
              console.log(
                "✅ User has access to frames:",
                accessResponse.data.frameIds?.length
              );
            } else {
              setHasAccess(false);
              setAccessibleFrameIds([]);
              console.log("❌ User has no active access");
            }
          } catch (error) {
            console.error("Error checking access:", error);
            setHasAccess(false);
            setAccessibleFrameIds([]);
          }
        } else {
          setHasAccess(false);
          setAccessibleFrameIds([]);
        }
      } catch (error) {
        console.error("❌ Error loading frames:", error);
        setCustomFrames([]);
      } finally {
        setLoading(false);
      }
    };

    loadFramesAndAccess();
  }, [currentUser]);

  const handleImageError = (frameId) => {
    console.error(`❌ Image failed to load for frame: ${frameId}`);
    setImageErrors((prev) => ({ ...prev, [frameId]: true }));
  };

  const handleSelectFrame = async (frame) => {
    console.log("🎬 User clicked frame:", frame.name);
    console.log("📦 Frame data:", frame);

    // Check if user has access to this frame (for premium frames)
    // Guest users can access free frames without login
    if (currentUser && !hasAccess && !accessibleFrameIds.includes(frame.id)) {
      // Show upgrade/payment prompt for logged-in users without access
      const shouldUpgrade = confirm(
        "Frame ini memerlukan akses premium.\n\n" +
          "Dapatkan akses ke 30 frames premium hanya Rp 10.000 selama 30 hari!\n\n" +
          "Klik OK untuk upgrade sekarang."
      );

      if (shouldUpgrade) {
        navigate("/pricing");
      }
      return;
    }

    if (!frame.slots || frame.slots.length === 0) {
      alert("Error: Frame ini tidak memiliki slot foto.");
      return;
    }

    if (!frame.imagePath && !frame.thumbnailUrl && !frame.imageUrl) {
      alert("Error: Frame ini tidak memiliki gambar.");
      return;
    }

    await trackFrameView(frame.id, null, frame.name);

    try {
      const success = await frameProvider.setCustomFrame(frame);

      if (success !== false) {
        navigate("/take-moment");
      } else {
        alert("Error: Gagal memilih frame");
      }
    } catch (error) {
      console.error("Error in setCustomFrame:", error);
      alert("Error: Gagal memilih frame - " + error.message);
    }
  };

  return (
    <>
      {/* Responsive CSS for frames grid */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .frames-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .frames-grid .frame-card {
          width: 100%;
          max-width: 220px;
        }
        @media (min-width: 768px) {
          .frames-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 20px;
          }
          .frames-grid .frame-card {
            width: 100%;
            max-width: 220px;
          }
        }
      `}</style>
      <section
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #fdf7f4, white, #f7f1ed)",
          paddingTop: "48px",
          paddingBottom: "48px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 16px",
          }}
        >
          {/* Title */}
          <h2
            style={{
              marginBottom: "32px",
              textAlign: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1e293b",
            }}
          >
            Pilihan Frame dari{" "}
            <span
              style={{
                background: "linear-gradient(to right, #e0b7a9, #c89585)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Designer fremio
            </span>
          </h2>

          {/* Upgrade Banner - show if user logged in but no access */}
          {currentUser && !hasAccess && !loading && (
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "30px",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                🎨 Unlock Premium Frames!
              </h3>
              <p style={{ marginBottom: "15px", opacity: 0.95 }}>
                Dapatkan akses ke 30 frames premium hanya Rp 10.000 selama 30
                hari
              </p>
              <button
                onClick={() => navigate("/pricing")}
                style={{
                  background: "white",
                  color: "#667eea",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Lihat Paket Premium →
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  border: "4px solid #f3f3f3",
                  borderTop: "4px solid #667eea",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 20px",
                }}
              />
              <p style={{ color: "#666" }}>Memuat frames...</p>
            </div>
          )}

          {/* Frames by Category */}
          {!loading && Object.keys(groupedFrames).length > 0
            ? Object.entries(groupedFrames).map(([category, frames]) => (
                <div key={category} style={{ marginBottom: "40px" }}>
                  {/* Category Header */}
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#1e293b",
                      marginBottom: "16px",
                    }}
                  >
                    {category} ({frames.length})
                  </h3>

                  {/* Frames Grid - Responsive: 3 cols mobile, 5 cols desktop */}
                  <div className="frames-grid">
                    {frames.map((frame) => {
                      const isLocked =
                        currentUser &&
                        !hasAccess &&
                        !accessibleFrameIds.includes(frame.id);
                      return (
                        <FrameCard
                          key={frame.id}
                          frame={frame}
                          onSelect={handleSelectFrame}
                          imageError={imageErrors[frame.id]}
                          onImageError={handleImageError}
                          getImageUrl={getFrameImageUrl}
                          isLocked={isLocked}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            : !loading && (
                <div
                  style={{
                    padding: "48px",
                    background:
                      "linear-gradient(to bottom right, #f8fafc, #f1f5f9)",
                    border: "2px solid #e2e8f0",
                    borderRadius: "16px",
                    textAlign: "center",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1e293b",
                      marginBottom: "12px",
                    }}
                  >
                    Belum Ada Frame Tersedia
                  </h3>
                  <p style={{ color: "#64748b" }}>
                    Frame sedang dalam proses penambahan oleh admin.
                  </p>
                </div>
              )}
        </div>
      </section>
    </>
  );
}
