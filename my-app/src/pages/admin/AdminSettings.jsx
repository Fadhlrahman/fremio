import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { isFirebaseConfigured } from "../../config/firebase";
import "../../styles/admin.css";
import {
  Settings as SettingsIcon,
  Save,
  Globe,
  Shield,
  Bell,
  Mail,
  Database,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Image,
  Video,
  FileText,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminSettings() {
  const { currentUser } = useAuth();

  // General Settings
  const [siteName, setSiteName] = useState("Fremio");
  const [siteDescription, setSiteDescription] = useState(
    "Create beautiful photo frames"
  );
  const [siteUrl, setSiteUrl] = useState("https://fremio.com");
  const [contactEmail, setContactEmail] = useState("support@fremio.com");
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Frame Settings
  const [maxFramesPerUser, setMaxFramesPerUser] = useState(10);
  const [maxFramesPerKreator, setMaxFramesPerKreator] = useState(50);
  const [autoApproveFrames, setAutoApproveFrames] = useState(false);
  const [allowDuplicateFrames, setAllowDuplicateFrames] = useState(true);

  // Upload Limits
  const [maxImageSize, setMaxImageSize] = useState(5); // MB
  const [maxVideoSize, setMaxVideoSize] = useState(50); // MB
  const [allowedImageFormats, setAllowedImageFormats] = useState(
    "jpg, jpeg, png, gif, webp"
  );
  const [allowedVideoFormats, setAllowedVideoFormats] =
    useState("mp4, webm, mov");

  // Email Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notifyOnNewUser, setNotifyOnNewUser] = useState(true);
  const [notifyOnNewFrame, setNotifyOnNewFrame] = useState(true);
  const [notifyOnNewApplication, setNotifyOnNewApplication] = useState(true);

  // Security Settings
  const [requireEmailVerification, setRequireEmailVerification] =
    useState(false);
  const [passwordMinLength, setPasswordMinLength] = useState(6);
  const [sessionTimeout, setSessionTimeout] = useState(24); // hours
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);

  // Firebase Settings (read-only info)
  const [firebaseStatus, setFirebaseStatus] = useState(isFirebaseConfigured);
  const [databaseSize, setDatabaseSize] = useState("0 MB");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    loadSettings();
    loadMaintenanceStatus();
    if (isFirebaseConfigured) {
      loadFirebaseStats();
    }
  }, []);

  const loadSettings = () => {
    // Load from localStorage or Firebase
    const savedSettings = localStorage.getItem("admin_settings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      // Apply saved settings
      setSiteName(settings.siteName || "Fremio");
      setSiteDescription(
        settings.siteDescription || "Create beautiful photo frames"
      );
      setAllowRegistration(settings.allowRegistration ?? true);
      // ... apply other settings
    }
  };

  const loadMaintenanceStatus = async () => {
    try {
      const raw = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
      const base = raw;
      const prefix = raw.endsWith("/api") ? "" : "/api";
      const response = await fetch(`${base}${prefix}/maintenance/status`);
      const data = await response.json();
      if (data.success) {
        setMaintenanceMode(data.enabled);
      }
    } catch (error) {
      console.error("Error loading maintenance status:", error);
    }
  };

  const loadFirebaseStats = async () => {
    try {
      const { getUserStats } = await import("../../services/userService");
      const unifiedFrameService = (await import("../../services/unifiedFrameService")).default;

      const userStats = await getUserStats();
      const frames = await unifiedFrameService.getAllFrames();

      setTotalUsers(userStats.total);
      setTotalFrames(frames?.length || 0);
      // Database size calculation would require additional APIs
      setDatabaseSize("N/A");
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    const settings = {
      siteName,
      siteDescription,
      siteUrl,
      contactEmail,
      allowRegistration,
      maintenanceMode,
      maxFramesPerUser,
      maxFramesPerKreator,
      autoApproveFrames,
      allowDuplicateFrames,
      maxImageSize,
      maxVideoSize,
      allowedImageFormats,
      allowedVideoFormats,
      emailNotifications,
      notifyOnNewUser,
      notifyOnNewFrame,
      notifyOnNewApplication,
      requireEmailVerification,
      passwordMinLength,
      sessionTimeout,
      maxLoginAttempts,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email,
    };

    try {
      // Save maintenance mode to backend API
      const token = localStorage.getItem("token");
      const raw = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
      const base = raw;
      const prefix = raw.endsWith("/api") ? "" : "/api";
      const maintenanceResponse = await fetch(
        `${base}${prefix}/maintenance/admin/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            enabled: maintenanceMode,
            message: maintenanceMode
              ? "Fremio sedang maintenance. Silakan coba lagi nanti."
              : "",
          }),
        }
      );

      if (!maintenanceResponse.ok) {
        throw new Error("Failed to update maintenance mode");
      }

      if (isFirebaseConfigured) {
        // TODO: Save to Firebase
        // const { saveAdminSettings } = await import("../../services/adminService");
        // await saveAdminSettings(settings);
      }

      // Save to localStorage
      localStorage.setItem("admin_settings", JSON.stringify(settings));
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings: " + error.message);
    }

    setSaving(false);
  };

  const handleExportData = () => {
    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }
    alert("Exporting data... This feature will be implemented soon.");
  };

  const handleImportData = () => {
    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }
    alert("Import data... This feature will be implemented soon.");
  };

  const handleClearCache = () => {
    if (window.confirm("Clear all cache? This will log you out.")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: <Globe size={18} /> },
    { id: "frames", label: "Frames", icon: <Image size={18} /> },
    { id: "uploads", label: "Uploads", icon: <Upload size={18} /> },
    { id: "email", label: "Email", icon: <Mail size={18} /> },
    { id: "security", label: "Security", icon: <Shield size={18} /> },
    { id: "database", label: "Database", icon: <Database size={18} /> },
  ];

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
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 34px)",
              fontWeight: "800",
              color: "#222",
              margin: "0 0 8px",
            }}
          >
            Platform Settings
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            Configure platform settings and preferences
          </p>
        </div>

        {/* Firebase Warning */}
        {!isFirebaseConfigured && (
          <div className="admin-alert">
            <AlertCircle size={24} className="admin-alert-icon" />
            <div>
              <h3 className="admin-alert-title">LocalStorage Mode</h3>
              <p className="admin-alert-message">
                Settings are saved locally. Setup Firebase to sync settings
                across devices and enable advanced features.
              </p>
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: "24px",
          }}
        >
          {/* Sidebar Tabs */}
          <div className="admin-card" style={{ height: "fit-content" }}>
            <div className="admin-card-body" style={{ padding: "14px" }}>
              <nav
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid transparent",
                      background:
                        activeTab === tab.id ? "var(--accent)" : "transparent",
                      color: activeTab === tab.id ? "#231f1e" : "#2a2a2a",
                      fontWeight: "600",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.id) {
                        e.currentTarget.style.background = "var(--bg-soft)";
                        e.currentTarget.style.borderColor = "var(--bg-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.id) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div>
            {/* General Settings */}
            {activeTab === "general" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">General Settings</h2>
                  <p className="admin-card-subtitle">
                    Basic platform configuration
                  </p>
                </div>
                <div
                  className="admin-card-body"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label className="admin-label">Site Name</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="admin-input"
                      placeholder="Fremio"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Site Description</label>
                    <textarea
                      value={siteDescription}
                      onChange={(e) => setSiteDescription(e.target.value)}
                      className="admin-textarea"
                      rows={3}
                      placeholder="Create beautiful photo frames"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Site URL</label>
                    <input
                      type="url"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                      className="admin-input"
                      placeholder="https://fremio.com"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Contact Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="admin-input"
                      placeholder="support@fremio.com"
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="allowRegistration"
                      checked={allowRegistration}
                      onChange={(e) => setAllowRegistration(e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="allowRegistration"
                      style={{
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      Allow user registration
                    </label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="maintenanceMode"
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="maintenanceMode"
                      style={{
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      Maintenance mode (disable public access)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Frame Settings */}
            {activeTab === "frames" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Frame Settings</h2>
                  <p className="admin-card-subtitle">
                    Configure frame creation and approval
                  </p>
                </div>
                <div
                  className="admin-card-body"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label className="admin-label">
                      Max Frames per Regular User
                    </label>
                    <input
                      type="number"
                      value={maxFramesPerUser}
                      onChange={(e) =>
                        setMaxFramesPerUser(parseInt(e.target.value))
                      }
                      className="admin-input"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="admin-label">
                      Max Frames per Kreator
                    </label>
                    <input
                      type="number"
                      value={maxFramesPerKreator}
                      onChange={(e) =>
                        setMaxFramesPerKreator(parseInt(e.target.value))
                      }
                      className="admin-input"
                      min="0"
                      max="1000"
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="autoApproveFrames"
                      checked={autoApproveFrames}
                      onChange={(e) => setAutoApproveFrames(e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="autoApproveFrames"
                      style={{
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      Auto-approve frames from trusted kreators
                    </label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="allowDuplicateFrames"
                      checked={allowDuplicateFrames}
                      onChange={(e) =>
                        setAllowDuplicateFrames(e.target.checked)
                      }
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="allowDuplicateFrames"
                      style={{
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      Allow duplicate photos in frames
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Settings */}
            {activeTab === "uploads" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Upload Settings</h2>
                  <p className="admin-card-subtitle">
                    Configure file upload limits and formats
                  </p>
                </div>
                <div
                  className="admin-card-body"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label className="admin-label">Max Image Size (MB)</label>
                    <input
                      type="number"
                      value={maxImageSize}
                      onChange={(e) =>
                        setMaxImageSize(parseInt(e.target.value))
                      }
                      className="admin-input"
                      min="1"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Max Video Size (MB)</label>
                    <input
                      type="number"
                      value={maxVideoSize}
                      onChange={(e) =>
                        setMaxVideoSize(parseInt(e.target.value))
                      }
                      className="admin-input"
                      min="1"
                      max="500"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Allowed Image Formats</label>
                    <input
                      type="text"
                      value={allowedImageFormats}
                      onChange={(e) => setAllowedImageFormats(e.target.value)}
                      className="admin-input"
                      placeholder="jpg, jpeg, png, gif, webp"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Allowed Video Formats</label>
                    <input
                      type="text"
                      value={allowedVideoFormats}
                      onChange={(e) => setAllowedVideoFormats(e.target.value)}
                      className="admin-input"
                      placeholder="mp4, webm, mov"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Settings */}
            {activeTab === "email" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Email Notifications</h2>
                  <p className="admin-card-subtitle">
                    Configure email notification preferences
                  </p>
                </div>
                <div
                  className="admin-card-body"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="emailNotifications"
                      style={{
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      Enable email notifications
                    </label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="notifyOnNewUser"
                      checked={notifyOnNewUser}
                      onChange={(e) => setNotifyOnNewUser(e.target.checked)}
                      disabled={!emailNotifications}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="notifyOnNewUser"
                      style={{
                        fontSize: "14px",
                        color: emailNotifications
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      Notify on new user registration
                    </label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="notifyOnNewFrame"
                      checked={notifyOnNewFrame}
                      onChange={(e) => setNotifyOnNewFrame(e.target.checked)}
                      disabled={!emailNotifications}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="notifyOnNewFrame"
                      style={{
                        fontSize: "14px",
                        color: emailNotifications
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      Notify on new frame submission
                    </label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="notifyOnNewApplication"
                      checked={notifyOnNewApplication}
                      onChange={(e) =>
                        setNotifyOnNewApplication(e.target.checked)
                      }
                      disabled={!emailNotifications}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="notifyOnNewApplication"
                      style={{
                        fontSize: "14px",
                        color: emailNotifications
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      Notify on new kreator application
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === "security" && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Security Settings</h2>
                  <p className="admin-card-subtitle">
                    Configure security and authentication
                  </p>
                </div>
                <div
                  className="admin-card-body"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="requireEmailVerification"
                      checked={requireEmailVerification}
                      onChange={(e) =>
                        setRequireEmailVerification(e.target.checked)
                      }
                      style={{ width: "16px", height: "16px" }}
                    />
                    <label
                      htmlFor="requireEmailVerification"
                      style={{
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      Require email verification for new users
                    </label>
                  </div>
                  <div>
                    <label className="admin-label">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      value={passwordMinLength}
                      onChange={(e) =>
                        setPasswordMinLength(parseInt(e.target.value))
                      }
                      className="admin-input"
                      min="6"
                      max="32"
                    />
                  </div>
                  <div>
                    <label className="admin-label">
                      Session Timeout (hours)
                    </label>
                    <input
                      type="number"
                      value={sessionTimeout}
                      onChange={(e) =>
                        setSessionTimeout(parseInt(e.target.value))
                      }
                      className="admin-input"
                      min="1"
                      max="168"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Max Login Attempts</label>
                    <input
                      type="number"
                      value={maxLoginAttempts}
                      onChange={(e) =>
                        setMaxLoginAttempts(parseInt(e.target.value))
                      }
                      className="admin-input"
                      min="3"
                      max="10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Database Settings */}
            {activeTab === "database" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">Database Information</h2>
                    <p className="admin-card-subtitle">
                      Database status and statistics
                    </p>
                  </div>
                  <div className="admin-card-body">
                    <div style={{ display: "grid", gap: "16px" }}>
                      <InfoRow
                        label="Firebase Status"
                        value={firebaseStatus ? "Connected" : "Not Configured"}
                      />
                      <InfoRow label="Database Size" value={databaseSize} />
                      <InfoRow label="Total Users" value={totalUsers} />
                      <InfoRow label="Total Frames" value={totalFrames} />
                    </div>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">Database Actions</h2>
                    <p className="admin-card-subtitle">
                      Manage database and cache
                    </p>
                  </div>
                  <div
                    className="admin-card-body"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={handleExportData}
                      className="admin-button-secondary"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Download size={18} />
                      Export All Data
                    </button>
                    <button
                      onClick={handleImportData}
                      className="admin-button-secondary"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Upload size={18} />
                      Import Data
                    </button>
                    <button
                      onClick={handleClearCache}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        background: "#fef2f2",
                        border: "1px solid #fdd8d8",
                        borderRadius: "10px",
                        color: "#b42318",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <Trash2 size={18} />
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => loadSettings()}
                className="admin-button-secondary"
                style={{
                  padding: "12px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <RefreshCw size={18} />
                Reset
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="admin-button-primary"
                style={{
                  padding: "12px 24px",
                  width: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        padding: "12px 0",
        borderBottom: "1px solid #f3ebe8",
      }}
    >
      <div
        style={{
          color: "var(--text-secondary)",
          fontWeight: "700",
          fontSize: "14px",
        }}
      >
        {label}
      </div>
      <div style={{ color: "var(--text-primary)", fontSize: "14px" }}>
        {value}
      </div>
    </div>
  );
}
