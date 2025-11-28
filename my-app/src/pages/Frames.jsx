import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import { getAllCustomFrames } from "../services/customFrameService";
import { trackFrameView } from "../services/analyticsService";
import { imagePresets } from "../utils/imageOptimizer";

// CSS for responsive 5-column grid
const gridStyles = `
  .frames-grid-5col {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }
  @media (max-width: 900px) {
    .frames-grid-5col {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  @media (max-width: 700px) {
    .frames-grid-5col {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 500px) {
    .frames-grid-5col {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;

export default function Frames() {
  const navigate = useNavigate();
  const [customFrames, setCustomFrames] = useState([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Inject grid styles
  useEffect(() => {
    const styleId = 'frames-grid-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = gridStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Helper: Get primary category (first one only)
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

  // Group frames by PRIMARY category only and respect sort orders
  const framesByCategory = useMemo(() => {
    const categoryMap = {};
    const categoryOrders = {}; // Track category sort orders
    
    customFrames.forEach(frame => {
      // Use PRIMARY category only (first one)
      const cat = getPrimaryCategory(frame);
      
      if (!categoryMap[cat]) {
        categoryMap[cat] = [];
      }
      categoryMap[cat].push(frame);
      
      // Track category sort order (use the lowest one found)
      const catOrder = frame.category_sort_order ?? frame.categorySortOrder ?? 999;
      if (categoryOrders[cat] === undefined || catOrder < categoryOrders[cat]) {
        categoryOrders[cat] = catOrder;
      }
    });
    
    // Sort frames within each category by sort_order
    Object.keys(categoryMap).forEach(cat => {
      categoryMap[cat].sort((a, b) => {
        const orderA = a.sort_order ?? a.sortOrder ?? 999;
        const orderB = b.sort_order ?? b.sortOrder ?? 999;
        return orderA - orderB;
      });
    });
    
    // Sort categories by category_sort_order, with fallback to default order
    const sortedCategories = Object.keys(categoryMap).sort((a, b) => {
      const orderA = categoryOrders[a] ?? 999;
      const orderB = categoryOrders[b] ?? 999;
      
      // If both have same order, use default logic
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

  const toggleDescription = (frameId) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [frameId]: !prev[frameId],
    }));
  };

  // Clear old frameConfig when entering Frames page
  useEffect(() => {
    // Clear frame-related data
    safeStorage.removeItem("frameConfig");
    safeStorage.removeItem("frameConfigTimestamp");
    safeStorage.removeItem("selectedFrame");
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");

    // Load custom frames with retry logic
    const loadFrames = async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      
      try {
        setIsLoading(true);
        setLoadError(null);
        console.log(`🔍 Loading custom frames... (attempt ${retryCount + 1})`);
        
        const loadedCustomFrames = await getAllCustomFrames();
        console.log("🎨 Custom frames loaded:", loadedCustomFrames.length);
        
        if (loadedCustomFrames.length > 0) {
          loadedCustomFrames.forEach((f, idx) => {
            console.log(`  ${idx + 1}. ${f.name} (ID: ${f.id})`);
          });
          setCustomFrames(loadedCustomFrames);
          setIsLoading(false);
        } else if (retryCount < MAX_RETRIES) {
          // If no frames found, retry after a short delay
          console.warn(`⚠️ No frames found, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => loadFrames(retryCount + 1), 1000);
        } else {
          console.warn("⚠️ NO CUSTOM FRAMES FOUND after retries");
          setCustomFrames([]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("❌ Error loading custom frames:", error);
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
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
    console.error(`❌ Image failed to load for frame: ${frameId}`);
    setImageErrors(prev => ({ ...prev, [frameId]: true }));
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Title */}
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Pilihan Frame dari{" "}
          <span className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-transparent">
            Admin Fremio
          </span>
        </h2>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#e0b7a9] border-t-transparent mb-4"></div>
            <p className="text-slate-600">Memuat frame...</p>
          </div>
        )}

        {/* Error State */}
        {loadError && !isLoading && (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">Gagal memuat frame: {loadError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#e0b7a9] text-white rounded-full hover:bg-[#c89585] transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Custom Frames by Category */}
        {!isLoading && !loadError && customFrames.length > 0 ? (
          <div className="space-y-12">
            {framesByCategory.sortedCategories.map((category) => (
              <div key={category} className="mb-10">
                {/* Category Header */}
                <h3 className="text-xl font-bold text-slate-800 mb-4">
                  {category} ({framesByCategory.categoryMap[category].length})
                </h3>

                {/* Frames Grid - 5 columns on desktop */}
                <div 
                  className="frames-grid-5col"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "12px",
                    maxWidth: "100%",
                  }}
                >
                  {framesByCategory.categoryMap[category].map((frame) => (
                    <div
                      key={`${category}-${frame.id}`}
                      className="frame-card group"
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        padding: "10px",
                        backgroundColor: "white",
                        border: "2px solid #e5e7eb",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        overflow: "visible",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px)";
                        e.currentTarget.style.boxShadow = "0 12px 24px rgba(200,149,133,0.25)";
                        e.currentTarget.style.borderColor = "#e0b7a9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }}
                      onClick={async () => {
                        console.log("🎬 User clicked frame card");
                        console.log("📦 Frame data:", frame);
                        
                        if (!frame.slots || frame.slots.length === 0) {
                          alert("Error: Frame ini tidak memiliki slot foto.");
                          return;
                        }
                        
                        if (!frame.imagePath && !frame.thumbnailUrl) {
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
                      }}
                    >
                      {/* Frame Image */}
                      <div
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "10px",
                          backgroundColor: "#f9fafb",
                          marginTop: "4px",
                          marginBottom: "8px",
                          padding: "10px",
                          overflow: "visible",
                        }}
                      >
                        {imageErrors[frame.id] ? (
                          <div className="flex flex-col items-center justify-center text-gray-400" style={{ height: "clamp(160px, 18vw, 240px)" }}>
                            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs">Gambar tidak tersedia</span>
                          </div>
                        ) : (
                          <img
                            src={imagePresets.card(frame.imagePath || frame.thumbnailUrl)}
                            alt={frame.name}
                            loading="lazy"
                            className="transition-transform duration-300 group-hover:scale-105"
                            style={{
                              maxHeight: "clamp(160px, 18vw, 240px)",
                              width: "auto",
                              maxWidth: "100%",
                              objectFit: "contain",
                            }}
                            onError={(e) => {
                              // Fallback to original if CDN fails
                              if (!e.target.dataset.fallback) {
                                e.target.dataset.fallback = 'true';
                                e.target.src = frame.imagePath || frame.thumbnailUrl;
                              } else {
                                handleImageError(frame.id);
                              }
                            }}
                          />
                        )}
                      </div>

                      {/* Frame Title */}
                      <div style={{ textAlign: "center", width: "100%" }}>
                        <h4
                          className="font-bold text-slate-900"
                          style={{ fontSize: "14px", marginBottom: "0px" }}
                        >
                          {frame.name}
                        </h4>
                      </div>

                      {/* Frame Description */}
                      {frame.description && (
                        <div style={{ textAlign: "center", width: "100%", marginTop: "-6px" }}>
                          <p
                            className="text-slate-500"
                            style={{
                              fontSize: "10px",
                              lineHeight: "1.3",
                              display: "-webkit-box",
                              WebkitLineClamp: expandedDescriptions[frame.id] ? "unset" : 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {frame.description}
                          </p>
                          {frame.description.length > 80 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDescription(frame.id);
                              }}
                              className="mt-1 text-[#c89585] hover:text-[#e0b7a9] font-medium transition-colors"
                              style={{ fontSize: "9px" }}
                            >
                              {expandedDescriptions[frame.id] ? "Show Less" : "Show More"}
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
          <div className="mb-12 p-8 bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl text-center shadow-lg">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
                <svg
                  className="w-10 h-10 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              Belum Ada Frame Tersedia
            </h3>
            <p className="text-base text-slate-600 mb-2 max-w-lg mx-auto leading-relaxed">
              Frame sedang dalam proses penambahan oleh admin.
            </p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Silahkan kembali lagi nanti untuk melihat koleksi frame yang tersedia! 🎨
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
