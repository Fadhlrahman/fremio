import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import { getAllCustomFrames } from "../services/customFrameService";
import { trackFrameView, trackUserSession, trackFunnelEvent } from "../services/analyticsService";
import { imagePresets } from "../utils/imageOptimizer";
import { useAuth } from "../contexts/AuthContext";

export default function Frames() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [customFrames, setCustomFrames] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [selectingFrameId, setSelectingFrameId] = useState(null);

  const toggleDescription = (frameId, e) => {
    e.stopPropagation();
    setExpandedDescriptions(prev => ({ ...prev, [frameId]: !prev[frameId] }));
  };

  const getPrimaryCategory = (frame) => {
    if (frame.categories && Array.isArray(frame.categories) && frame.categories.length > 0) {
      return frame.categories[0];
    }
    if (frame.category) {
      const cats = frame.category.split(",").map(c => c.trim()).filter(c => c);
      return cats[0] || "Lainnya";
    }
    return "Lainnya";
  };

  const framesByCategory = useMemo(() => {
    const categoryMap = {};
    const categoryOrders = {};
    customFrames.forEach(frame => {
      const cat = getPrimaryCategory(frame);
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(frame);
      const catOrder = frame.category_sort_order ?? frame.categorySortOrder ?? 999;
      if (categoryOrders[cat] === undefined || catOrder < categoryOrders[cat]) {
        categoryOrders[cat] = catOrder;
      }
    });
    Object.keys(categoryMap).forEach(cat => {
      categoryMap[cat].sort((a, b) => {
        const orderA = a.sort_order ?? a.sortOrder ?? 999;
        const orderB = b.sort_order ?? b.sortOrder ?? 999;
        return orderA - orderB;
      });
    });
    const sortedCategories = Object.keys(categoryMap).sort((a, b) => {
      const orderA = categoryOrders[a] ?? 999;
      const orderB = categoryOrders[b] ?? 999;
      if (orderA === orderB) {
        if (a === "Fremio Series") return -1;
        if (b === "Fremio Series") return 1;
        if (a === "Lainnya") return 1;
        if (b === "Lainnya") return -1;
        return a.localeCompare(b);
      }
      return orderA - orderB;
    });
    return { categoryMap, sortedCategories };
  }, [customFrames]);

  useEffect(() => {
    // Track user session and funnel
    const trackVisit = async () => {
      try {
        await trackUserSession();
        await trackFunnelEvent("visit");
        // Track frame_view when user opens Frames page (browsing frames)
        await trackFunnelEvent("frame_view");
        console.log("📊 Frames: Tracked visit and frame_view");
      } catch (error) {
        console.error("Tracking error:", error);
      }
    };
    trackVisit();
    
    safeStorage.removeItem("frameConfig");
    safeStorage.removeItem("frameConfigTimestamp");
    safeStorage.removeItem("selectedFrame");
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");
    const loadFrames = async (retryCount = 0) => {
      const MAX_RETRIES = 2;
      try {
        setIsLoading(true);
        setLoadError(null);
        const loadedCustomFrames = await getAllCustomFrames();
        if (loadedCustomFrames.length > 0) {
          setCustomFrames(loadedCustomFrames);
          setIsLoading(false);
          console.log('✅ Frames loaded:', loadedCustomFrames.length);
        } else if (retryCount < MAX_RETRIES) {
          setTimeout(() => loadFrames(retryCount + 1), 500);
        } else {
          setCustomFrames([]);
          setIsLoading(false);
        }
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => loadFrames(retryCount + 1), 500);
        } else {
          setLoadError(error.message);
          setCustomFrames([]);
          setIsLoading(false);
        }
      }
    };
    loadFrames();
  }, []);

  const handleImageError = (frameId) => {
    setImageErrors(prev => ({ ...prev, [frameId]: true }));
  };

  // Default slots for 4-photo frame (standard layout)
  // Values in decimal (0-1) representing percentage of frame dimensions
  const DEFAULT_SLOTS = [
    { id: 1, left: 0.05, top: 0.05, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 0, aspectRatio: '4:5' },
    { id: 2, left: 0.53, top: 0.05, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 1, aspectRatio: '4:5' },
    { id: 3, left: 0.05, top: 0.28, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 2, aspectRatio: '4:5' },
    { id: 4, left: 0.53, top: 0.28, width: 0.42, height: 0.20, zIndex: 1, photoIndex: 3, aspectRatio: '4:5' }
  ];

  const handleFrameClick = async (frame) => {
    setSelectingFrameId(frame.id);
    
    try {
      // Build frame with slots - use existing slots or default
      const fullFrame = {
        id: frame.id,
        name: frame.name,
        imagePath: frame.imagePath || frame.thumbnailUrl || frame.image_url,
        image_url: frame.image_url || frame.imagePath || frame.thumbnailUrl,
        thumbnailUrl: frame.thumbnailUrl || frame.image_url,
        maxCaptures: frame.maxCaptures || frame.max_captures || 4,
        slots: (frame.slots && frame.slots.length > 0) ? frame.slots : DEFAULT_SLOTS,
        category: frame.category
      };
      
      console.log('🎯 Frame selected:', fullFrame.name, 'slots:', fullFrame.slots.length);
      
      // Track view in background (don't await)
      trackFrameView(fullFrame.id, null, fullFrame.name).catch(() => {});
      trackFunnelEvent("frame_select", fullFrame.id, fullFrame.name);
      
      // Store frame config
      safeStorage.setJSON("frameConfig", fullFrame);
      
      // Set frame and navigate immediately
      const success = await frameProvider.setCustomFrame(fullFrame);
      if (success !== false) { 
        navigate("/take-moment"); 
      } else { 
        setSelectingFrameId(null);
        alert("Error: Gagal memilih frame"); 
      }
    } catch (error) {
      console.error("Frame click error:", error);
      setSelectingFrameId(null);
      alert("Error: Gagal memilih frame. Silakan refresh halaman.");
    }
  };

  return (
    <section style={{ minHeight: "100vh", background: "linear-gradient(to bottom, #fdf7f4, white, #f7f1ed)", padding: "16px 0" }}>
      {/* Loading overlay when selecting a frame */}
      {selectingFrameId && (
        <div style={{ 
          position: "fixed", 
          inset: 0, 
          backgroundColor: "rgba(253, 247, 244, 0.95)", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          zIndex: 9999,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{ 
            width: "56px", 
            height: "56px", 
            border: "4px solid #f3e8e4", 
            borderTopColor: "#e0b7a9", 
            borderRadius: "50%", 
            animation: "spin 0.8s linear infinite",
            marginBottom: "20px"
          }}></div>
          <p style={{ 
            color: "#1e293b", 
            fontSize: "16px", 
            fontWeight: "600",
            marginBottom: "8px"
          }}>Menyiapkan frame...</p>
          <p style={{ 
            color: "#64748b", 
            fontSize: "13px"
          }}>Mohon tunggu sebentar</p>
        </div>
      )}
      
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 8px" }}>
        <h2 style={{ marginBottom: "16px", textAlign: "center", fontSize: "18px", fontWeight: "bold", color: "#0f172a" }}>
          Pilihan Frame dari <span style={{ background: "linear-gradient(to right, #e0b7a9, #c89585)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Designer fremio</span>
        </h2>

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
            <div style={{ width: "40px", height: "40px", border: "4px solid #e0b7a9", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "16px" }}></div>
            <p style={{ color: "#475569", fontSize: "14px" }}>Memuat frame...</p>
          </div>
        )}

        {loadError && !isLoading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: "#ef4444", marginBottom: "16px", fontSize: "14px" }}>Gagal memuat frame: {loadError}</p>
            <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", backgroundColor: "#e0b7a9", color: "white", borderRadius: "9999px", fontSize: "14px", border: "none", cursor: "pointer" }}>Coba Lagi</button>
          </div>
        )}

        {!isLoading && !loadError && customFrames.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {framesByCategory.sortedCategories.map((category) => (
              <div key={category}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px", paddingLeft: "4px" }}>
                  {category} ({framesByCategory.categoryMap[category].length})
                </h3>
                <div className="frames-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {framesByCategory.categoryMap[category].map((frame) => (
                    <div key={frame.id} className="frame-card" onClick={() => handleFrameClick(frame)} style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "6px", cursor: "pointer" }}>
                      <div className="frame-image-container" style={{ width: "100%", aspectRatio: "2/3", backgroundColor: "#f9fafb", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "4px" }}>
                        {imageErrors[frame.id] ? (
                          <svg style={{ width: "16px", height: "16px", color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        ) : (
                          <img src={imagePresets.card(frame.imagePath || frame.thumbnailUrl)} alt={frame.name} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = "true"; e.target.src = frame.imagePath || frame.thumbnailUrl; } else { handleImageError(frame.id); } }} />
                        )}
                      </div>
                      <p className="frame-title" style={{ fontSize: "9px", fontWeight: "600", color: "#1e293b", textAlign: "center", lineHeight: "1.2", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", margin: 0 }}>{frame.name}</p>
                      {frame.description && (
                        <div className="frame-description-wrapper">
                          <p className="frame-description" style={{ fontSize: "8px", color: "#64748b", textAlign: "center", lineHeight: "1.4", overflow: expandedDescriptions[frame.id] ? "visible" : "hidden", textOverflow: "ellipsis", display: expandedDescriptions[frame.id] ? "block" : "-webkit-box", WebkitLineClamp: expandedDescriptions[frame.id] ? "unset" : 2, WebkitBoxOrient: "vertical", margin: "4px 0 0 0" }}>{frame.description}</p>
                          {frame.description.length > 80 && (
                            <button className="show-more-btn" onClick={(e) => toggleDescription(frame.id, e)} style={{ fontSize: "9px", color: "#e0b7a9", background: "none", border: "none", cursor: "pointer", padding: "2px 0", marginTop: "2px", fontWeight: "600" }}>
                              {expandedDescriptions[frame.id] ? "Show less" : "Show more"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && !loadError && (
          <div style={{ padding: "24px", backgroundColor: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", backgroundColor: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg style={{ width: "32px", height: "32px", color: "#94a3b8" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", marginBottom: "8px" }}>Belum Ada Frame Tersedia</h3>
            <p style={{ fontSize: "14px", color: "#475569" }}>Frame sedang ditambahkan oleh admin.</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .frame-description-wrapper { display: none !important; }
        .show-more-btn { display: none !important; }
        @media (min-width: 640px) { .frames-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 12px !important; } }
        @media (min-width: 1024px) { 
          .frames-grid { grid-template-columns: repeat(5, 1fr) !important; gap: 16px !important; }
          .frame-title { font-size: 12px !important; }
          .frame-description-wrapper { display: block !important; text-align: center; }
          .frame-description { display: -webkit-box !important; font-size: 11px !important; }
          .show-more-btn { display: inline-block !important; font-size: 10px !important; }
          .show-more-btn:hover { text-decoration: underline; }
          .frame-card { 
            padding: 10px !important; 
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          }
          .frame-card:hover { 
            transform: translateY(-4px) scale(1.02); 
            box-shadow: 0 8px 20px rgba(0,0,0,0.12); 
            border-color: #e0b7a9 !important;
          }
          .frame-image-container { aspect-ratio: 9/14 !important; margin-bottom: 10px !important; }
        }
      `}</style>
    </section>
  );
}
