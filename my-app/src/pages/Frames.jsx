import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import { getAllCustomFrames, getCustomFrameById } from "../services/customFrameService";
import { trackFrameView } from "../services/analyticsService";
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
    safeStorage.removeItem("frameConfig");
    safeStorage.removeItem("frameConfigTimestamp");
    safeStorage.removeItem("selectedFrame");
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");
    const loadFrames = async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      try {
        setIsLoading(true);
        setLoadError(null);
        const loadedCustomFrames = await getAllCustomFrames();
        if (loadedCustomFrames.length > 0) {
          setCustomFrames(loadedCustomFrames);
          setIsLoading(false);
        } else if (retryCount < MAX_RETRIES) {
          setTimeout(() => loadFrames(retryCount + 1), 1000);
        } else {
          setCustomFrames([]);
          setIsLoading(false);
        }
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => loadFrames(retryCount + 1), 1000);
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

  const handleFrameClick = async (frame) => {
    if (!user) {
      navigate("/login", { state: { from: location, selectedFrameId: frame.id } });
      return;
    }
    const fullFrame = await getCustomFrameById(frame.id);
    if (!fullFrame) { alert("Error: Gagal memuat data frame."); return; }
    if (!fullFrame.slots || fullFrame.slots.length === 0) { alert("Error: Frame ini tidak memiliki slot foto."); return; }
    if (!fullFrame.imagePath && !fullFrame.thumbnailUrl && !fullFrame.image_url) { alert("Error: Frame ini tidak memiliki gambar."); return; }
    await trackFrameView(fullFrame.id, null, fullFrame.name);
    try {
      const success = await frameProvider.setCustomFrame(fullFrame);
      if (success !== false) { navigate("/take-moment"); }
      else { alert("Error: Gagal memilih frame"); }
    } catch (error) {
      alert("Error: Gagal memilih frame - " + error.message);
    }
  };

  return (
    <section style={{ minHeight: "100vh", background: "linear-gradient(to bottom, #fdf7f4, white, #f7f1ed)", padding: "16px 0" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 8px" }}>
        <h2 style={{ marginBottom: "16px", textAlign: "center", fontSize: "18px", fontWeight: "bold", color: "#0f172a" }}>
          Pilihan Frame dari <span style={{ background: "linear-gradient(to right, #e0b7a9, #c89585)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Admin Fremio</span>
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
                    <div key={frame.id} onClick={() => handleFrameClick(frame)} style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "6px", cursor: "pointer" }}>
                      <div style={{ width: "100%", aspectRatio: "2/3", backgroundColor: "#f9fafb", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "4px" }}>
                        {imageErrors[frame.id] ? (
                          <svg style={{ width: "16px", height: "16px", color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        ) : (
                          <img src={imagePresets.card(frame.imagePath || frame.thumbnailUrl)} alt={frame.name} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={(e) => { if (!e.target.dataset.fallback) { e.target.dataset.fallback = "true"; e.target.src = frame.imagePath || frame.thumbnailUrl; } else { handleImageError(frame.id); } }} />
                        )}
                      </div>
                      <p style={{ fontSize: "9px", fontWeight: "600", color: "#1e293b", textAlign: "center", lineHeight: "1.2", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", margin: 0 }}>{frame.name}</p>
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
        @media (min-width: 640px) { .frames-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 12px !important; } }
        @media (min-width: 1024px) { .frames-grid { grid-template-columns: repeat(5, 1fr) !important; gap: 16px !important; } }
      `}</style>
    </section>
  );
}
