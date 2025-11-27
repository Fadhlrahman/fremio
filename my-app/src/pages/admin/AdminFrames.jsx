import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllCustomFrames, deleteCustomFrame } from "../../services/customFrameService";
import { imagePresets } from "../../utils/imageOptimizer";

const AdminFrames = () => {
  console.log("AdminFrames component rendering...");
  
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFrames = async () => {
      console.log("AdminFrames loading from Firebase...");
      try {
        const data = await getAllCustomFrames();
        console.log("Frames loaded from Firebase:", data);
        setFrames(data);
      } catch (err) {
        console.error("Error:", err);
      }
      setLoading(false);
    };
    loadFrames();
  }, []);

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

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading frames...</p>
      </div>
    );
  }

  // ULTRA SIMPLE - just to test if component renders at all
  console.log("AdminFrames about to return JSX, frames count:", frames.length);

  return (
    <div style={{ padding: "20px", backgroundColor: "#fff", minHeight: "200px" }}>
      <h1 style={{ color: "#111", marginBottom: "20px" }}>🖼️ Kelola Frame</h1>
      
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
      ) : (
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
                      // Fallback to original if CDN fails
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
      )}
    </div>
  );
};

export default AdminFrames;
