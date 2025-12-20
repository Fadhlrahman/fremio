import React, { useState, useEffect } from "react";
import api from "../../services/api";
import "./AdminPackages.css";

const AdminPackages = () => {
  const [packages, setPackages] = useState([]);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    frameIds: [],
  });

  useEffect(() => {
    loadPackages();
    loadFrames();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/packages");
      setPackages(response.data.data || []);
    } catch (error) {
      console.error("Load packages error:", error);
      alert("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const loadFrames = async () => {
    try {
      const response = await api.get("/frames");
      const data = response.data;
      setFrames(Array.isArray(data) ? data : (data.frames || []));
    } catch (error) {
      console.error("Load frames error:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.frameIds.length > 10) {
      alert("Maksimal 10 frames per paket");
      return;
    }

    if (formData.frameIds.length === 0) {
      alert("Pilih minimal 1 frame");
      return;
    }

    try {
      setCreating(true);

      if (editingPackage) {
        // Update package
        await api.put(`/admin/packages/${editingPackage.id}`, formData);
        alert("Paket berhasil diupdate");
      } else {
        // Create package
        await api.post("/admin/packages", formData);
        alert("Paket berhasil dibuat");
      }

      resetForm();
      loadPackages();
    } catch (error) {
      console.error("Submit error:", error);
      alert(error.response?.data?.message || "Failed to save package");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      frameIds: pkg.frame_ids || [],
    });
  };

  const handleDelete = async (packageId) => {
    if (!confirm("Yakin ingin menghapus paket ini?")) return;

    try {
      await api.delete(`/admin/packages/${packageId}`);
      alert("Paket berhasil dihapus");
      loadPackages();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete package");
    }
  };

  const handleToggleActive = async (packageId, currentStatus) => {
    try {
      await api.put(`/admin/packages/${packageId}`, {
        isActive: !currentStatus,
      });
      loadPackages();
    } catch (error) {
      console.error("Toggle active error:", error);
      alert("Failed to update status");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      frameIds: [],
    });
    setEditingPackage(null);
  };

  const toggleFrameSelection = (frameId) => {
    setFormData((prev) => {
      const isSelected = prev.frameIds.includes(frameId);
      if (isSelected) {
        return {
          ...prev,
          frameIds: prev.frameIds.filter((id) => id !== frameId),
        };
      } else {
        if (prev.frameIds.length >= 10) {
          alert("Maksimal 10 frames per paket");
          return prev;
        }
        return {
          ...prev,
          frameIds: [...prev.frameIds, frameId],
        };
      }
    });
  };

  if (loading) {
    return (
      <div className="admin-packages">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-packages">
      <div className="packages-header">
        <h1>📦 Manajemen Paket Frame</h1>
        <p>Kelola paket frame yang akan dijual kepada user</p>
      </div>

      {/* Create/Edit Form */}
      <div className="package-form-card">
        <h2>{editingPackage ? "✏️ Edit Paket" : "➕ Buat Paket Baru"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nama Paket *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Contoh: Paket Premium 1"
              required
            />
          </div>

          <div className="form-group">
            <label>Deskripsi</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Deskripsi paket (opsional)"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Pilih Frames ({formData.frameIds.length}/10) *</label>
            <div className="frames-selection">
              {frames.map((frame) => {
                const isSelected = formData.frameIds.includes(frame.id);
                return (
                  <div
                    key={frame.id}
                    className={`frame-item ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleFrameSelection(frame.id)}
                  >
                    <div className="frame-preview">
                      {frame.thumbnailUrl || frame.imageUrl ? (
                        <img
                          src={frame.thumbnailUrl || frame.imageUrl}
                          alt={frame.name}
                          onError={(e) =>
                            (e.target.src = "/placeholder-frame.png")
                          }
                        />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </div>
                    <div className="frame-info">
                      <span className="frame-name">{frame.name}</span>
                      {isSelected && <span className="check-mark">✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating
                ? "Menyimpan..."
                : editingPackage
                ? "Update Paket"
                : "Buat Paket"}
            </button>
            {editingPackage && (
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Packages List */}
      <div className="packages-list">
        <h2>📋 Daftar Paket ({packages.length})</h2>

        {packages.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada paket. Buat paket pertama Anda!</p>
          </div>
        ) : (
          <div className="packages-grid">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`package-card ${!pkg.is_active ? "inactive" : ""}`}
              >
                <div className="package-header">
                  <h3>{pkg.name}</h3>
                  <div className="package-actions">
                    <button
                      className={`btn-toggle ${
                        pkg.is_active ? "active" : "inactive"
                      }`}
                      onClick={() => handleToggleActive(pkg.id, pkg.is_active)}
                      title={pkg.is_active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {pkg.is_active ? "👁️" : "👁️‍🗨️"}
                    </button>
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(pkg)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(pkg.id)}
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {pkg.description && (
                  <p className="package-description">{pkg.description}</p>
                )}

                <div className="package-stats">
                  <span className="stat">
                    <strong>{pkg.frame_ids?.length || 0}</strong> frames
                  </span>
                  <span
                    className={`status ${
                      pkg.is_active ? "active" : "inactive"
                    }`}
                  >
                    {pkg.is_active ? "✅ Aktif" : "❌ Nonaktif"}
                  </span>
                </div>

                <div className="package-frames-preview">
                  {pkg.frame_ids?.slice(0, 5).map((frameId, idx) => {
                    const frame = frames.find((f) => f.id === frameId);
                    return frame ? (
                      <div key={idx} className="mini-frame" title={frame.name}>
                        {frame.thumbnailUrl || frame.imageUrl ? (
                          <img
                            src={frame.thumbnailUrl || frame.imageUrl}
                            alt={frame.name}
                          />
                        ) : (
                          <div className="no-img">?</div>
                        )}
                      </div>
                    ) : null;
                  })}
                  {pkg.frame_ids?.length > 5 && (
                    <div className="more-frames">
                      +{pkg.frame_ids.length - 5}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPackages;
