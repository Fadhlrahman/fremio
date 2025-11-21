import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { isFirebaseConfigured } from "../../config/firebase";
import { FRAME_CATEGORIES_LIST } from "../../config/firebaseCollections";
import "../../styles/admin.css";
import {
  FolderOpen,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  Image,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminCategories() {
  const { currentUser } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    icon: "📸",
    description: "",
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (!isFirebaseConfigured) {
      // Load from predefined list with REAL frame counts
      const customFrames = JSON.parse(
        localStorage.getItem("custom_frames") || "[]"
      );

      const localCategories = FRAME_CATEGORIES_LIST.map((cat, index) => {
        // Count REAL frames in this category
        const frameCount = customFrames.filter(
          (frame) => frame.category === cat.id
        ).length;

        return {
          ...cat,
          description: `${cat.name} themed photo frames`,
          isActive: true,
          order: index,
          frameCount, // REAL count from localStorage
        };
      });
      setCategories(localCategories);
      return;
    }

    setLoading(true);
    try {
      // TODO: Load from Firebase when configured
      const localCategories = FRAME_CATEGORIES_LIST.map((cat, index) => ({
        ...cat,
        description: `${cat.name} themed photo frames`,
        isActive: true,
        order: index,
        frameCount: 0,
      }));
      setCategories(localCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setFormData({
      id: "",
      name: "",
      icon: "📸",
      description: "",
      isActive: true,
      order: categories.length,
    });
    setShowAddModal(true);
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setFormData({
      id: category.id,
      name: category.name,
      icon: category.icon,
      description: category.description || "",
      isActive: category.isActive !== false,
      order: category.order || 0,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Category name is required");
      return;
    }

    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }

    setSaving(true);
    try {
      // TODO: Save to Firebase
      alert("Category saved! (Firebase integration pending)");
      setShowAddModal(false);
      setShowEditModal(false);
      loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category");
    }
    setSaving(false);
  };

  const handleDelete = async (categoryId) => {
    if (
      !window.confirm(
        "Delete this category? All frames in this category will be uncategorized."
      )
    ) {
      return;
    }

    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }

    try {
      // TODO: Delete from Firebase
      alert("Category deleted! (Firebase integration pending)");
      loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category");
    }
  };

  const handleToggleActive = async (categoryId, currentStatus) => {
    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }

    try {
      // TODO: Toggle in Firebase
      const newCategories = categories.map((cat) =>
        cat.id === categoryId ? { ...cat, isActive: !currentStatus } : cat
      );
      setCategories(newCategories);
    } catch (error) {
      console.error("Error toggling category:", error);
      alert("Failed to update category");
    }
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedCategory(null);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: "48px",
              height: "48px",
              border: "4px solid #f3f4f6",
              borderTop: "4px solid var(--accent)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px",
            }}
          ></div>
          <p style={{ color: "var(--text-secondary)" }}>
            Loading categories...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, #fdf7f4 0%, #fff 50%, #f7f1ed 100%)",
        minHeight: "100vh",
        padding: "32px 0 48px",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "0 16px" }}>
        {/* Firebase Warning Banner */}
        {!isFirebaseConfigured && (
          <div className="admin-alert">
            <AlertCircle size={24} className="admin-alert-icon" />
            <div>
              <h3 className="admin-alert-title">
                LocalStorage Mode - UI Preview Only
              </h3>
              <p className="admin-alert-message">
                Firebase is not configured. Category management features are
                disabled. You're viewing predefined categories.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(22px, 4vw, 34px)",
                  fontWeight: "800",
                  color: "#222",
                  margin: "0 0 8px",
                }}
              >
                Frame Categories
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
                Organize frames into categories for better browsing experience
              </p>
            </div>
            <button
              onClick={handleAdd}
              disabled={!isFirebaseConfigured}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 20px",
                background: isFirebaseConfigured
                  ? "linear-gradient(135deg, #e0b7a9 0%, #d4a193 100%)"
                  : "#e5e7eb",
                border: "none",
                borderRadius: "10px",
                color: isFirebaseConfigured ? "white" : "#9ca3af",
                fontSize: "14px",
                fontWeight: "600",
                cursor: isFirebaseConfigured ? "pointer" : "not-allowed",
                boxShadow: isFirebaseConfigured
                  ? "0 2px 8px rgba(224, 183, 169, 0.3)"
                  : "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (isFirebaseConfigured) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(224, 183, 169, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = isFirebaseConfigured
                  ? "0 2px 8px rgba(224, 183, 169, 0.3)"
                  : "none";
              }}
            >
              <Plus size={18} />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <StatCard
            icon={<FolderOpen size={24} />}
            label="Total Categories"
            value={categories.length}
            color="#e0b7a9"
          />
          <StatCard
            icon={<CheckCircle size={24} />}
            label="Active"
            value={categories.filter((c) => c.isActive !== false).length}
            color="#86efac"
          />
          <StatCard
            icon={<Image size={24} />}
            label="Total Frames"
            value={categories.reduce((sum, c) => sum + (c.frameCount || 0), 0)}
            color="#93c5fd"
          />
        </div>

        {/* Categories Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>

        {categories.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--text-secondary)",
            }}
          >
            <FolderOpen size={48} style={{ marginBottom: "16px" }} />
            <h3
              style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px" }}
            >
              No categories yet
            </h3>
            <p style={{ fontSize: "14px" }}>
              Add your first category to organize frames
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <Modal
          title={showAddModal ? "Add New Category" : "Edit Category"}
          onClose={closeModals}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label className="admin-label">Category Name *</label>
              <input
                type="text"
                className="admin-input"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Birthday"
              />
            </div>

            <div>
              <label className="admin-label">Icon (Emoji)</label>
              <input
                type="text"
                className="admin-input"
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
                placeholder="📸"
                maxLength="2"
              />
            </div>

            <div>
              <label className="admin-label">Description</label>
              <textarea
                className="admin-textarea"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this category..."
                rows="3"
              />
            </div>

            <div>
              <label className="admin-label">Display Order</label>
              <input
                type="number"
                className="admin-input"
                value={formData.order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order: parseInt(e.target.value) || 0,
                  })
                }
                min="0"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label
                htmlFor="isActive"
                style={{ fontSize: "14px", cursor: "pointer" }}
              >
                Active (visible to users)
              </label>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "8px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                onClick={handleSave}
                disabled={saving}
                className="admin-button-primary"
                style={{ flex: 1 }}
              >
                <Save size={16} />
                <span>{saving ? "Saving..." : "Save Category"}</span>
              </button>
              <button
                onClick={closeModals}
                disabled={saving}
                className="admin-button-secondary"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }) {
  return (
    <div className="admin-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: `${color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
          }}
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginBottom: "4px",
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#222" }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

// Category Card Component
function CategoryCard({ category, onEdit, onDelete, onToggleActive }) {
  const isActive = category.isActive !== false;

  return (
    <div
      className="admin-card"
      style={{
        padding: "20px",
        opacity: isActive ? 1 : 0.6,
        transition: "all 0.2s",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
          <div
            style={{
              fontSize: "36px",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {category.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#222",
                margin: "0 0 4px",
              }}
            >
              {category.name}
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              {category.description || `${category.name} themed frames`}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                marginBottom: "4px",
              }}
            >
              Frames
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#222" }}>
              {category.frameCount || 0}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                marginBottom: "4px",
              }}
            >
              Order
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#222" }}>
              #{category.order || 0}
            </div>
          </div>
        </div>
        <span
          className={`admin-badge-${isActive ? "success" : "secondary"}`}
          style={{ fontSize: "11px" }}
        >
          {isActive ? (
            <>
              <Eye size={12} /> Active
            </>
          ) : (
            <>
              <EyeOff size={12} /> Inactive
            </>
          )}
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => onToggleActive(category.id, isActive)}
          className="admin-button-secondary"
          style={{ flex: 1, fontSize: "13px", padding: "8px 12px" }}
          disabled={!isFirebaseConfigured}
        >
          {isActive ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{isActive ? "Deactivate" : "Activate"}</span>
        </button>
        <button
          onClick={() => onEdit(category)}
          className="admin-button-secondary"
          style={{ padding: "8px 12px" }}
          disabled={!isFirebaseConfigured}
        >
          <Edit size={14} />
        </button>
        <button
          onClick={() => onDelete(category.id)}
          className="admin-button-danger"
          style={{ padding: "8px 12px" }}
          disabled={!isFirebaseConfigured}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// Modal Component
function Modal({ title, children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="admin-card"
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "24px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#222",
            margin: "0 0 20px",
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
