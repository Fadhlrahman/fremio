import { useState, useEffect } from "react";
import { Shield, Users, AlertCircle, CheckCircle, X, Plus } from "lucide-react";
import "../../styles/admin.css";

export default function AdminMaintenance() {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Fremio sedang maintenance. Silakan coba lagi nanti."
  );
  const [whitelist, setWhitelist] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMaintenanceStatus();
    loadWhitelist();
  }, []);

  const loadMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/maintenance/status`
      );
      const data = await response.json();
      
      if (data.success) {
        setMaintenanceEnabled(data.enabled);
        setMaintenanceMessage(data.message || "");
      }
    } catch (error) {
      console.error("Error loading maintenance status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWhitelist = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/maintenance/whitelist`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setWhitelist(data.whitelist || []);
      }
    } catch (error) {
      console.error("Error loading whitelist:", error);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/maintenance/admin/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            enabled: !maintenanceEnabled,
            message: maintenanceMessage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update maintenance mode");
      }

      setMaintenanceEnabled(!maintenanceEnabled);
      alert(
        `Maintenance mode ${!maintenanceEnabled ? "enabled" : "disabled"} successfully!`
      );
    } catch (error) {
      console.error("Error toggling maintenance:", error);
      alert("Failed to toggle maintenance mode: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToWhitelist = async () => {
    if (!newEmail.trim()) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/maintenance/whitelist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: newEmail.trim().toLowerCase(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add to whitelist");
      }

      await loadWhitelist();
      setNewEmail("");
      alert("Email added to whitelist!");
    } catch (error) {
      console.error("Error adding to whitelist:", error);
      alert("Failed to add email: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromWhitelist = async (email) => {
    if (!window.confirm(`Remove ${email} from whitelist?`)) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/maintenance/whitelist/${encodeURIComponent(
          email
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove from whitelist");
      }

      await loadWhitelist();
      alert("Email removed from whitelist!");
    } catch (error) {
      console.error("Error removing from whitelist:", error);
      alert("Failed to remove email: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Maintenance Mode</h1>
        </div>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>
            <Shield size={28} />
            Maintenance Mode
          </h1>
          <p>Manage site maintenance and whitelist access</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="admin-card" style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {maintenanceEnabled ? (
            <AlertCircle size={32} style={{ color: "#f59e0b" }} />
          ) : (
            <CheckCircle size={32} style={{ color: "#10b981" }} />
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem" }}>
              {maintenanceEnabled ? "Maintenance Active" : "Site Online"}
            </h2>
            <p style={{ margin: "0.25rem 0 0", color: "#6b7280" }}>
              {maintenanceEnabled
                ? "Public access is disabled"
                : "Site is accessible to all users"}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 600,
            }}
          >
            Maintenance Message
          </label>
          <textarea
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="Message to show users during maintenance"
            rows={3}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.95rem",
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          onClick={handleToggleMaintenance}
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            background: maintenanceEnabled ? "#10b981" : "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving
            ? "Saving..."
            : maintenanceEnabled
            ? "Disable Maintenance"
            : "Enable Maintenance"}
        </button>
      </div>

      {/* Whitelist Management */}
      <div className="admin-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <Users size={24} />
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
            Whitelist Management
          </h2>
        </div>

        <div
          style={{
            background: "#f9fafb",
            padding: "1rem",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
            <strong>Note:</strong> Admin users and whitelisted emails can access
            the site during maintenance mode.
          </p>
        </div>

        {/* Add Email */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 600,
            }}
          >
            Add Email to Whitelist
          </label>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              onKeyPress={(e) => e.key === "Enter" && handleAddToWhitelist()}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontSize: "0.95rem",
              }}
            />
            <button
              onClick={handleAddToWhitelist}
              disabled={saving || !newEmail.trim()}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: saving || !newEmail.trim() ? "not-allowed" : "pointer",
                opacity: saving || !newEmail.trim() ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        </div>

        {/* Whitelist Table */}
        <div>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
            Whitelisted Emails ({whitelist.length})
          </h3>
          {whitelist.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "#9ca3af",
              }}
            >
              No emails in whitelist
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                overflow: "hidden",
              }}
            >
              {whitelist.map((item, index) => (
                <div
                  key={item.email}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    borderBottom:
                      index < whitelist.length - 1 ? "1px solid #e5e7eb" : "none",
                    background: index % 2 === 0 ? "white" : "#f9fafb",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.email}</div>
                    {item.added_at && (
                      <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                        Added: {new Date(item.added_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveFromWhitelist(item.email)}
                    disabled={saving}
                    style={{
                      padding: "0.5rem",
                      background: "transparent",
                      color: "#ef4444",
                      border: "1px solid #fecaca",
                      borderRadius: "0.375rem",
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
