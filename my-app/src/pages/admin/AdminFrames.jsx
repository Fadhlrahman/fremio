import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllCustomFrames, deleteCustomFrame } from "../../services/customFrameService";
import { batchUpdateSortOrders, updateCategorySortOrder, clearFramesCache } from "../../services/supabaseFrameService";
import { imagePresets } from "../../utils/imageOptimizer";
import { ChevronUp, ChevronDown, GripVertical, Save, ArrowUp, ArrowDown } from "lucide-react";

const AdminFrames = () => {
  console.log("AdminFrames component rendering...");
  
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "sort"
  const [categoryOrders, setCategoryOrders] = useState({});

  // Helper: Get primary category (first one if multiple) - defined early for use in useEffect
  const getPrimaryCategoryFromFrame = (frame) => {
    if (frame.categories && Array.isArray(frame.categories) && frame.categories.length > 0) {
      return frame.categories[0];
    }
    if (frame.category) {
      const cats = frame.category.split(",").map(c => c.trim()).filter(c => c);
      return cats[0] || "Uncategorized";
    }
    return "Uncategorized";
  };

  useEffect(() => {
    const loadFrames = async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      console.log(`🔄 AdminFrames: Loading frames... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
      
      // Clear cache on first attempt to ensure fresh data
      if (retryCount === 0) {
        clearFramesCache();
        console.log("🧹 AdminFrames: Cache cleared for fresh data");
      }
      
      try {
        // Force refresh to bypass any browser/CDN cache
        const data = await getAllCustomFrames(true);
        console.log("✅ AdminFrames: Frames loaded, count:", data?.length || 0);
        
        if ((!data || data.length === 0) && retryCount < MAX_RETRIES) {
          console.warn(`⚠️ AdminFrames: No frames, retrying in 1s... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => loadFrames(retryCount + 1), 1000);
          return;
        }
        
        // Initialize with sort_order if not exists
        const framesWithOrder = (data || []).map((f, idx) => ({
          ...f,
          sortOrder: f.sort_order ?? f.sortOrder ?? idx,
          categorySortOrder: f.category_sort_order ?? f.categorySortOrder ?? 0
        }));
        setFrames(framesWithOrder);
        
        // Build category order map using PRIMARY category only
        const catOrders = {};
        framesWithOrder.forEach(f => {
          const cat = getPrimaryCategoryFromFrame(f);
          if (!catOrders[cat]) {
            catOrders[cat] = f.categorySortOrder || 0;
          }
        });
        setCategoryOrders(catOrders);
        setLoading(false);
      } catch (err) {
        console.error("❌ AdminFrames Error:", err.message);
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying in 1s... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => loadFrames(retryCount + 1), 1000);
        } else {
          console.error("❌ All retries failed");
          setLoading(false);
        }
      }
    };
    loadFrames();
  }, []);

  // Group frames by PRIMARY category only (first category)
  const framesByCategory = useMemo(() => {
    const grouped = {};
    frames.forEach(frame => {
      const cat = getPrimaryCategoryFromFrame(frame);
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(frame);
    });
    
    // Sort frames within each category by sortOrder
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
    
    return grouped;
  }, [frames]);

  // Get sorted categories
  const sortedCategories = useMemo(() => {
    return Object.keys(framesByCategory).sort((a, b) => {
      const orderA = categoryOrders[a] ?? 999;
      const orderB = categoryOrders[b] ?? 999;
      return orderA - orderB;
    });
  }, [framesByCategory, categoryOrders]);

  const handleDelete = async (frameId) => {
    if (window.confirm("Yakin ingin menghapus frame ini?")) {
      try {
        const result = await deleteCustomFrame(frameId);
        if (result.success) {
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

  // Move frame within category
  const moveFrame = (frameId, direction) => {
    const frame = frames.find(f => f.id === frameId);
    if (!frame) return;
    
    const cat = getPrimaryCategoryFromFrame(frame);
    const categoryFrames = framesByCategory[cat];
    if (!categoryFrames) return;
    
    const currentIndex = categoryFrames.findIndex(f => f.id === frameId);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= categoryFrames.length) return;
    
    // Update sort orders
    const updatedFrames = frames.map(f => {
      if (f.id === frameId) {
        return { ...f, sortOrder: newIndex };
      }
      if (f.id === categoryFrames[newIndex].id) {
        return { ...f, sortOrder: currentIndex };
      }
      return f;
    });
    
    setFrames(updatedFrames);
    setHasChanges(true);
  };

  // Move category up/down
  const moveCategory = (category, direction) => {
    const catList = [...sortedCategories];
    const currentIndex = catList.indexOf(category);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= catList.length) return;
    
    // Swap positions
    const newOrders = { ...categoryOrders };
    const otherCat = catList[newIndex];
    const currentOrder = categoryOrders[category] ?? currentIndex;
    const otherOrder = categoryOrders[otherCat] ?? newIndex;
    
    newOrders[category] = otherOrder;
    newOrders[otherCat] = currentOrder;
    
    setCategoryOrders(newOrders);
    setHasChanges(true);
  };

  // Save all changes
  const saveChanges = async () => {
    setSaving(true);
    try {
      // Update frame sort orders
      const frameUpdates = frames.map(f => ({
        frameId: f.id,
        sortOrder: f.sortOrder || 0
      }));
      
      const result = await batchUpdateSortOrders(frameUpdates);
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Update category sort orders
      for (const [category, order] of Object.entries(categoryOrders)) {
        await updateCategorySortOrder(category, order);
      }
      
      setHasChanges(false);
      alert("✅ Urutan berhasil disimpan!");
    } catch (err) {
      alert("❌ Gagal menyimpan: " + err.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading frames...</p>
      </div>
    );
  }

  console.log("AdminFrames about to return JSX, frames count:", frames.length);

  return (
    <div style={{ padding: "20px", backgroundColor: "#fff", minHeight: "200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <h1 style={{ color: "#111", margin: 0 }}>🖼️ Kelola Frame</h1>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* View Mode Toggle */}
          <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "8px 16px",
                background: viewMode === "grid" ? "#4f46e5" : "white",
                color: viewMode === "grid" ? "white" : "#374151",
                border: "none",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("sort")}
              style={{
                padding: "8px 16px",
                background: viewMode === "sort" ? "#4f46e5" : "white",
                color: viewMode === "sort" ? "white" : "#374151",
                border: "none",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Atur Urutan
            </button>
          </div>
          
          {hasChanges && (
            <button
              onClick={saveChanges}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "14px",
                opacity: saving ? 0.7 : 1
              }}
            >
              <Save size={16} />
              {saving ? "Menyimpan..." : "Simpan Urutan"}
            </button>
          )}
        </div>
      </div>
      
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Total frames: {frames.length}
      </p>
      
      <Link 
        to="/admin/upload-frame"
        style={{
          display: "inline-block",
          background: "#4f46e5",
          color: "white",
          padding: "10px 20px",
          borderRadius: "8px",
          textDecoration: "none",
          marginBottom: "20px"
        }}
      >
        + Upload Frame Baru
      </Link>

      {frames.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", background: "#f3f4f6", borderRadius: "8px" }}>
          <p style={{ color: "#6b7280" }}>Belum ada frame yang diupload</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View - Original */
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
          gap: "20px" 
        }}>
          {frames.map((frame) => (
            <div 
              key={frame.id} 
              style={{ 
                background: "white", 
                borderRadius: "12px", 
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ 
                height: "150px", 
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {frame.imagePath ? (
                  <img 
                    src={imagePresets.thumbnail(frame.imagePath)}
                    alt={frame.name}
                    loading="lazy"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    onError={(e) => {
                      if (!e.target.dataset.fallback) {
                        e.target.dataset.fallback = 'true';
                        e.target.src = frame.imagePath;
                      } else {
                        e.target.style.display = "none";
                      }
                    }}
                  />
                ) : (
                  <span style={{ color: "#9ca3af" }}>No Image</span>
                )}
              </div>
              <div style={{ padding: "12px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>{frame.name || "Untitled"}</h3>
                <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#6b7280" }}>
                  {frame.category || "No category"}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Link 
                    to={"/admin/upload-frame?edit=" + frame.id}
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
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Sort View - Organized by Category */
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {sortedCategories.map((category, catIndex) => (
            <div 
              key={category}
              style={{
                background: "#f9fafb",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e5e7eb"
              }}
            >
              {/* Category Header */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                marginBottom: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid #e5e7eb"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <GripVertical size={20} style={{ color: "#9ca3af" }} />
                  <h2 style={{ margin: 0, fontSize: "18px", color: "#111" }}>
                    {category}
                  </h2>
                  <span style={{ 
                    background: "#e0e7ff", 
                    color: "#4f46e5", 
                    padding: "2px 8px", 
                    borderRadius: "12px",
                    fontSize: "12px"
                  }}>
                    {framesByCategory[category].length} frame
                  </span>
                </div>
                
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => moveCategory(category, "up")}
                    disabled={catIndex === 0}
                    style={{
                      padding: "6px",
                      background: catIndex === 0 ? "#f3f4f6" : "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      cursor: catIndex === 0 ? "not-allowed" : "pointer",
                      opacity: catIndex === 0 ? 0.5 : 1
                    }}
                    title="Pindah kategori ke atas"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveCategory(category, "down")}
                    disabled={catIndex === sortedCategories.length - 1}
                    style={{
                      padding: "6px",
                      background: catIndex === sortedCategories.length - 1 ? "#f3f4f6" : "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      cursor: catIndex === sortedCategories.length - 1 ? "not-allowed" : "pointer",
                      opacity: catIndex === sortedCategories.length - 1 ? 0.5 : 1
                    }}
                    title="Pindah kategori ke bawah"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>
              
              {/* Frames in Category */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {framesByCategory[category].map((frame, frameIndex) => (
                  <div
                    key={frame.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      background: "white",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb"
                    }}
                  >
                    {/* Order Number */}
                    <span style={{ 
                      width: "24px", 
                      height: "24px", 
                      background: "#e0e7ff", 
                      color: "#4f46e5",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}>
                      {frameIndex + 1}
                    </span>
                    
                    {/* Thumbnail */}
                    <div style={{ 
                      width: "50px", 
                      height: "50px", 
                      background: "#f3f4f6",
                      borderRadius: "6px",
                      overflow: "hidden",
                      flexShrink: 0
                    }}>
                      {frame.imagePath && (
                        <img 
                          src={imagePresets.thumbnail(frame.imagePath)}
                          alt={frame.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      )}
                    </div>
                    
                    {/* Frame Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        margin: 0, 
                        fontWeight: 500, 
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {frame.name || "Untitled"}
                      </p>
                    </div>
                    
                    {/* Move Buttons */}
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => moveFrame(frame.id, "up")}
                        disabled={frameIndex === 0}
                        style={{
                          padding: "6px",
                          background: frameIndex === 0 ? "#f3f4f6" : "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          cursor: frameIndex === 0 ? "not-allowed" : "pointer",
                          opacity: frameIndex === 0 ? 0.5 : 1
                        }}
                        title="Pindah ke atas"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moveFrame(frame.id, "down")}
                        disabled={frameIndex === framesByCategory[category].length - 1}
                        style={{
                          padding: "6px",
                          background: frameIndex === framesByCategory[category].length - 1 ? "#f3f4f6" : "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          cursor: frameIndex === framesByCategory[category].length - 1 ? "not-allowed" : "pointer",
                          opacity: frameIndex === framesByCategory[category].length - 1 ? 0.5 : 1
                        }}
                        title="Pindah ke bawah"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                    
                    {/* Edit/Delete */}
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Link 
                        to={"/admin/upload-frame?edit=" + frame.id}
                        style={{
                          padding: "6px 10px",
                          background: "#e0e7ff",
                          color: "#4f46e5",
                          borderRadius: "6px",
                          textDecoration: "none",
                          fontSize: "12px"
                        }}
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDelete(frame.id)}
                        style={{
                          padding: "6px 10px",
                          background: "#fee2e2",
                          color: "#dc2626",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFrames;
