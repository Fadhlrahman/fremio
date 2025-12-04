import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import unifiedFrameService from "../../services/unifiedFrameService";

const AdminFrames = () => {
  console.log("AdminFrames component rendering...");
  
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState("display-order"); // display-order, category-asc, category-desc, name-asc, name-desc, newest, oldest
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    const loadFrames = async () => {
      console.log("AdminFrames loading...");
      console.log(`📡 Backend mode: ${unifiedFrameService.isVPSMode() ? 'VPS' : 'Firebase'}`);
      try {
        const data = await unifiedFrameService.getAllFrames();
        console.log("Frames loaded:", data);
        // Sort by displayOrder initially
        const sortedData = [...data].sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));
        setFrames(sortedData);
      } catch (err) {
        console.error("Error:", err);
      }
      setLoading(false);
    };
    loadFrames();
  }, []);

  // Get unique categories
  const categories = [...new Set(frames.map(f => f.category || "Uncategorized"))].sort();

  // Filter and sort frames
  const filteredAndSortedFrames = React.useMemo(() => {
    let result = [...frames];
    
    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter(f => (f.category || "Uncategorized") === selectedCategory);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortOrder) {
        case "display-order":
          return (a.displayOrder || 999) - (b.displayOrder || 999);
        case "category-asc":
          return (a.category || "Uncategorized").localeCompare(b.category || "Uncategorized");
        case "category-desc":
          return (b.category || "Uncategorized").localeCompare(a.category || "Uncategorized");
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "newest":
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case "oldest":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        default:
          return 0;
      }
    });
    
    return result;
  }, [frames, selectedCategory, sortOrder]);

  // Group frames by category for display
  const groupedFrames = React.useMemo(() => {
    if (sortOrder.startsWith("category") && !isReorderMode) {
      const groups = {};
      filteredAndSortedFrames.forEach(frame => {
        const cat = frame.category || "Uncategorized";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(frame);
      });
      return groups;
    }
    return null;
  }, [filteredAndSortedFrames, sortOrder, isReorderMode]);

  // Move frame up in order
  const moveFrameUp = (frameId) => {
    const currentIndex = frames.findIndex(f => f.id === frameId);
    if (currentIndex <= 0) return;
    
    const newFrames = [...frames];
    [newFrames[currentIndex - 1], newFrames[currentIndex]] = [newFrames[currentIndex], newFrames[currentIndex - 1]];
    
    // Update displayOrder for all frames
    newFrames.forEach((frame, idx) => {
      frame.displayOrder = idx;
    });
    
    setFrames(newFrames);
  };

  // Move frame down in order
  const moveFrameDown = (frameId) => {
    const currentIndex = frames.findIndex(f => f.id === frameId);
    if (currentIndex < 0 || currentIndex >= frames.length - 1) return;
    
    const newFrames = [...frames];
    [newFrames[currentIndex], newFrames[currentIndex + 1]] = [newFrames[currentIndex + 1], newFrames[currentIndex]];
    
    // Update displayOrder for all frames
    newFrames.forEach((frame, idx) => {
      frame.displayOrder = idx;
    });
    
    setFrames(newFrames);
  };

  // Save current order to database
  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      const frameOrders = frames.map((frame, idx) => ({
        id: frame.id,
        displayOrder: idx
      }));
      
      await unifiedFrameService.updateFramesOrder(frameOrders);
      alert("Urutan berhasil disimpan!");
      setIsReorderMode(false);
    } catch (err) {
      console.error("Error saving order:", err);
      alert("Gagal menyimpan urutan: " + err.message);
    }
    setSavingOrder(false);
  };

  const handleDelete = async (frameId) => {
    if (window.confirm("Yakin ingin menghapus frame ini?")) {
      try {
        const result = await unifiedFrameService.deleteFrame(frameId);
        if (result.success !== false) {
          setFrames(frames.filter(f => f.id !== frameId));
          alert("Frame berhasil dihapus!");
        } else {
          alert("Gagal menghapus: " + result.message);
        }
      } catch (err) {
        alert("Gagal menghapus: " + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading frames...</p>
      </div>
    );
  }

  // ULTRA SIMPLE - just to test if component renders at all
  console.log("AdminFrames about to return JSX, frames count:", frames.length);

  // Frame card component
  const FrameCard = ({ frame, index }) => {
    const displayImageUrl = frame.imageUrl || frame.thumbnailUrl || frame.imagePath;
    const isFirst = index === 0;
    const isLast = index === frames.length - 1;
    
    return (
      <div 
        style={{ 
          background: "white", 
          borderRadius: "12px", 
          overflow: "hidden",
          boxShadow: isReorderMode ? "0 4px 12px rgba(79, 70, 229, 0.2)" : "0 2px 8px rgba(0,0,0,0.1)",
          border: isReorderMode ? "2px solid #4f46e5" : "none",
          position: "relative"
        }}
      >
        {/* Order number badge in reorder mode */}
        {isReorderMode && (
          <div style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: "#4f46e5",
            color: "white",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "bold",
            zIndex: 10
          }}>
            {index + 1}
          </div>
        )}
        
        {/* Frame thumbnail with 9:16 aspect ratio */}
        <div style={{ 
          position: "relative",
          paddingTop: "177.78%",
          background: frame.canvasBackground || "#f3f4f6",
          overflow: "hidden"
        }}>
          {displayImageUrl ? (
            <img 
              src={displayImageUrl}
              alt={frame.name}
              style={{ 
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain"
              }}
              onError={(e) => {
                console.error("Image load error for:", displayImageUrl);
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div style={{ 
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#9ca3af" 
            }}>No Image</div>
          )}
        </div>
        <div style={{ padding: "12px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>{frame.name || "Untitled"}</h3>
          <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#6b7280" }}>
            {frame.category || "No category"}
          </p>
          
          {isReorderMode ? (
            // Reorder controls
            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                onClick={() => moveFrameUp(frame.id)}
                disabled={isFirst}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: isFirst ? "#e5e7eb" : "#dbeafe",
                  color: isFirst ? "#9ca3af" : "#1d4ed8",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isFirst ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "bold"
                }}
                title="Pindah ke atas"
              >
                ↑
              </button>
              <button 
                onClick={() => moveFrameDown(frame.id)}
                disabled={isLast}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: isLast ? "#e5e7eb" : "#dbeafe",
                  color: isLast ? "#9ca3af" : "#1d4ed8",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isLast ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "bold"
                }}
                title="Pindah ke bawah"
              >
                ↓
              </button>
            </div>
          ) : (
            // Normal edit/delete controls
            <div style={{ display: "flex", gap: "8px" }}>
              <Link 
                to={`/admin/upload-frame?edit=${frame.id}`}
                style={{
                  flex: 1,
                  padding: "6px",
                  background: "#e0e7ff",
                  color: "#4f46e5",
                  borderRadius: "4px",
                  textAlign: "center",
                  textDecoration: "none",
                  fontSize: "12px"
                }}
              >
                Edit
              </Link>
              <button 
                onClick={() => handleDelete(frame.id)}
                style={{
                  flex: 1,
                  padding: "6px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Hapus
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#fff", minHeight: "200px" }}>
      <h1 style={{ color: "#111", marginBottom: "20px" }}>🖼️ Kelola Frame</h1>
      
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Total frames: {frames.length}
        {selectedCategory !== "all" && ` • Menampilkan: ${filteredAndSortedFrames.length}`}
        {isReorderMode && " • Mode Atur Urutan Aktif"}
      </p>
      
      {/* Reorder Mode Banner */}
      {isReorderMode && (
        <div style={{
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "white",
          padding: "16px 20px",
          borderRadius: "12px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <strong style={{ fontSize: "16px" }}>📋 Mode Atur Urutan</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
              Gunakan tombol ↑ ↓ untuk mengubah urutan tampilan frame di halaman user
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setIsReorderMode(false)}
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Batal
            </button>
            <button
              onClick={saveOrder}
              disabled={savingOrder}
              style={{
                padding: "10px 20px",
                background: "white",
                color: "#4f46e5",
                border: "none",
                borderRadius: "8px",
                cursor: savingOrder ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              {savingOrder ? "Menyimpan..." : "💾 Simpan Urutan"}
            </button>
          </div>
        </div>
      )}
      
      {/* Filter and Sort Controls */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap",
        gap: "12px", 
        marginBottom: "20px",
        alignItems: "center"
      }}>
        <Link 
          to="/admin/upload-frame"
          style={{
            display: "inline-block",
            background: "#4f46e5",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          + Upload Frame Baru
        </Link>
        
        {/* Reorder Mode Toggle Button */}
        {!isReorderMode && (
          <button
            onClick={() => {
              setIsReorderMode(true);
              setSortOrder("display-order");
              setSelectedCategory("all");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f0fdf4",
              color: "#15803d",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #86efac",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            ↕️ Atur Urutan Tampilan
          </button>
        )}

        {/* Category Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "14px", color: "#374151", fontWeight: 500 }}>
            Filter Kategori:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              background: "white",
              cursor: "pointer",
              minWidth: "150px"
            }}
          >
            <option value="all">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        {!isReorderMode && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "14px", color: "#374151", fontWeight: 500 }}>
              Urutkan:
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                background: "white",
                cursor: "pointer",
                minWidth: "180px"
              }}
            >
              <option value="display-order">Urutan Tampilan</option>
              <option value="category-asc">Kategori (A-Z)</option>
              <option value="category-desc">Kategori (Z-A)</option>
              <option value="name-asc">Nama (A-Z)</option>
              <option value="name-desc">Nama (Z-A)</option>
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
          </div>
        )}
      </div>

      {frames.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", background: "#f3f4f6", borderRadius: "8px" }}>
          <p style={{ color: "#6b7280" }}>Belum ada frame yang diupload</p>
        </div>
      ) : filteredAndSortedFrames.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", background: "#f3f4f6", borderRadius: "8px" }}>
          <p style={{ color: "#6b7280" }}>Tidak ada frame dalam kategori "{selectedCategory}"</p>
        </div>
      ) : isReorderMode ? (
        // Reorder mode - flat list with order controls
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
          gap: "20px" 
        }}>
          {frames.map((frame, index) => (
            <FrameCard key={frame.id} frame={frame} index={index} />
          ))}
        </div>
      ) : groupedFrames ? (
        // Grouped by category view
        <div>
          {Object.entries(groupedFrames).map(([category, categoryFrames]) => (
            <div key={category} style={{ marginBottom: "32px" }}>
              <h2 style={{ 
                fontSize: "18px", 
                fontWeight: "600", 
                color: "#1f2937", 
                marginBottom: "16px",
                paddingBottom: "8px",
                borderBottom: "2px solid #e5e7eb"
              }}>
                {category} 
                <span style={{ 
                  fontSize: "14px", 
                  fontWeight: "normal", 
                  color: "#6b7280",
                  marginLeft: "8px"
                }}>
                  ({categoryFrames.length} frame)
                </span>
              </h2>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
                gap: "20px" 
              }}>
                {categoryFrames.map((frame, index) => (
                  <FrameCard key={frame.id} frame={frame} index={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat list view (when sorted by name or date)
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
          gap: "20px" 
        }}>
          {filteredAndSortedFrames.map((frame, index) => (
            <FrameCard key={frame.id} frame={frame} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFrames;
