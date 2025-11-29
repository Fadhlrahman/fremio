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
    // Check if user is logged in
    if (!user) {
      // Redirect to login with return path
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
    <>
      {/* Mobile grid v3 - force rebuild */}
      <style>{`
        .frames-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 4px !important;
        }
        .frame-card {
          padding: 3px !important;
          border-radius: 4px !important;
          background: white !important;
          border: 1px solid #e5e7eb !important;
        }
        .frame-card h4 {
          font-size: 7px !important;
          margin-top: 2px !important;
          line-height: 1.2 !important;
        }
        .frame-image-container {
          aspect-ratio: 3/4 !important;
          width: 100% !important;
          overflow: hidden !important;
          border-radius: 3px !important;
          background: #f9fafb !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        @media (min-width: 640px) {
          .frames-grid {
            gap: 8px !important;
          }
          .frame-card {
            padding: 6px !important;
            border-radius: 6px !important;
          }
          .frame-card h4 {
            font-size: 10px !important;
          }
        }
        @media (min-width: 768px) {
          .frames-grid {
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 10px !important;
          }
        }
        @media (min-width: 1024px) {
          .frames-grid {
            grid-template-columns: repeat(6, 1fr) !important;
            gap: 12px !important;
          }
          .frame-card h4 {
            font-size: 11px !important;
          }
        }
      `}</style>
      <section className="min-h-screen bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-2 sm:py-8">
        <div className="mx-auto px-1 sm:px-4 max-w-7xl">
          <h2 className="mb-2 sm:mb-6 text-center text-sm sm:text-xl md:text-2xl font-bold text-slate-900">
            Pilihan Frame dari{" "}
            <span className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-transparent">
              Admin Fremio
            </span>
          </h2>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#e0b7a9] border-t-transparent mb-4"></div>
            <p className="text-slate-600 text-sm">Memuat frame...</p>
          </div>
        )}

        {loadError && !isLoading && (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4 text-sm">Gagal memuat frame: {loadError}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#e0b7a9] text-white rounded-full text-sm">
              Coba Lagi
            </button>
          </div>
        )}

        {!isLoading && !loadError && customFrames.length > 0 ? (
          <div className="space-y-6">
            {framesByCategory.sortedCategories.map((category) => (
              <div key={category}>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-2">
                  {category} ({framesByCategory.categoryMap[category].length})
                </h3>
                <div className="frames-grid">
                  {framesByCategory.categoryMap[category].map((frame) => (
                    <div
                      key={frame.id}
                      onClick={() => handleFrameClick(frame)}
                      className="frame-card cursor-pointer hover:shadow-md hover:border-[#e0b7a9] active:scale-95 transition-all"
                    >
                      <div className="frame-image-container">
                        {imageErrors[frame.id] ? (
                          <svg className="w-3 h-3 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <img
                            src={imagePresets.card(frame.imagePath || frame.thumbnailUrl)}
                            alt={frame.name}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              if (!e.target.dataset.fallback) {
                                e.target.dataset.fallback = "true";
                                e.target.src = frame.imagePath || frame.thumbnailUrl;
                              } else {
                                handleImageError(frame.id);
                              }
                            }}
                          />
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-800 text-center line-clamp-1">
                        {frame.name}
                      </h4>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && !loadError && (
          <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-xl text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Belum Ada Frame Tersedia</h3>
            <p className="text-sm text-slate-600">Frame sedang ditambahkan oleh admin.</p>
          </div>
        )}
        </div>
      </section>
    </>
  );
}
