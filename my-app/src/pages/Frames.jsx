import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import unifiedFrameService from "../services/unifiedFrameService";
import { trackFrameView } from "../services/analyticsService";

// Helper to construct full URL for frame images
const getFrameImageUrl = (frame) => {
  const imagePath = frame.imageUrl || frame.thumbnailUrl || frame.imagePath;
  if (!imagePath) return null;
  
  // Already a full URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Relative path - construct full URL using API base
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://192.168.100.160:3000';
  return `${apiBase}${imagePath}`;
};

// FrameCard component with expandable description
function FrameCard({ frame, onSelect, imageError, onImageError, getImageUrl }) {
  const [expanded, setExpanded] = useState(false);
  const description = frame.description || "";
  const maxLength = 50; // characters before truncating
  const shouldTruncate = description.length > maxLength;
  const displayDescription = expanded ? description : description.slice(0, maxLength);

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
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
      }}
      onClick={() => onSelect(frame)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
        e.currentTarget.style.borderColor = "#e0a899";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
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
          <div style={{
            position: "absolute",
            inset: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
          }}>
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

      {/* Frame Name */}
      <div style={{
        padding: "8px 8px 4px 8px",
        textAlign: "center",
        fontSize: "12px",
        fontWeight: 600,
        color: "#1e293b",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {frame.name}
      </div>

      {/* Frame Description */}
      {description && (
        <div style={{
          padding: "0 8px 8px 8px",
          textAlign: "center",
          fontSize: "10px",
          color: "#64748b",
          lineHeight: "1.4",
        }}>
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
  const [customFrames, setCustomFrames] = useState([]);
  const [imageErrors, setImageErrors] = useState({});

  // Group frames by category (sorted by displayOrder within each category)
  const groupedFrames = customFrames.reduce((acc, frame) => {
    const category = frame.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(frame);
    return acc;
  }, {});

  // Sort frames within each category by displayOrder
  Object.keys(groupedFrames).forEach(category => {
    groupedFrames[category].sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
  });

  // Clear old frameConfig when entering Frames page
  useEffect(() => {
    // Clear frame-related data
    safeStorage.removeItem("frameConfig");
    safeStorage.removeItem("frameConfigTimestamp");
    safeStorage.removeItem("selectedFrame");
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");

    // Load custom frames from unified service (Firebase or VPS)
    const loadFrames = async () => {
      try {
        console.log("🔍 Loading custom frames...");
        console.log(`📡 Backend mode: ${unifiedFrameService.isVPSMode() ? 'VPS' : 'Firebase'}`);
        
        const loadedCustomFrames = await unifiedFrameService.getAllFrames();
        console.log("🎨 Custom frames loaded:", loadedCustomFrames.length);
        
        // Sort by displayOrder globally first
        loadedCustomFrames.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
        
        if (loadedCustomFrames.length > 0) {
          loadedCustomFrames.forEach((f, idx) => {
            console.log(`  ${idx + 1}. ${f.name} (ID: ${f.id}, Order: ${f.displayOrder ?? 'N/A'})`);
            console.log(`     - imagePath: ${(f.imagePath || f.imageUrl || '')?.substring(0, 60)}...`);
          });
        } else {
          console.warn("⚠️ NO CUSTOM FRAMES FOUND!");
        }
        
        setCustomFrames(loadedCustomFrames);
      } catch (error) {
        console.error("❌ Error loading custom frames:", error);
        setCustomFrames([]);
      }
    };

    loadFrames();
  }, []);

  const handleImageError = (frameId) => {
    console.error(`❌ Image failed to load for frame: ${frameId}`);
    setImageErrors(prev => ({ ...prev, [frameId]: true }));
  };

  const handleSelectFrame = async (frame) => {
    console.log("🎬 User clicked frame:", frame.name);
    console.log("📦 Frame data:", frame);
    
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
      <section style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #fdf7f4, white, #f7f1ed)",
        paddingTop: "48px",
        paddingBottom: "48px",
      }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0 16px",
      }}>
        {/* Title */}
        <h2 style={{
          marginBottom: "32px",
          textAlign: "center",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#1e293b",
        }}>
          Pilihan Frame dari{" "}
          <span style={{
            background: "linear-gradient(to right, #e0b7a9, #c89585)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Designer fremio
          </span>
        </h2>

        {/* Frames by Category */}
        {Object.keys(groupedFrames).length > 0 ? (
          Object.entries(groupedFrames).map(([category, frames]) => (
            <div key={category} style={{ marginBottom: "40px" }}>
              {/* Category Header */}
              <h3 style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#1e293b",
                marginBottom: "16px",
              }}>
                {category} ({frames.length})
              </h3>

              {/* Frames Grid - Responsive: 3 cols mobile, 5 cols desktop */}
              <div className="frames-grid">
                {frames.map((frame) => (
                  <FrameCard
                    key={frame.id}
                    frame={frame}
                    onSelect={handleSelectFrame}
                    imageError={imageErrors[frame.id]}
                    onImageError={handleImageError}
                    getImageUrl={getFrameImageUrl}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{
            padding: "48px",
            background: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)",
            border: "2px solid #e2e8f0",
            borderRadius: "16px",
            textAlign: "center",
          }}>
            <h3 style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px" }}>
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
