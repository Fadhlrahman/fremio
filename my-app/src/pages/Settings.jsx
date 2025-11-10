import { useAuth } from "../contexts/AuthContext.jsx";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/profile.css";

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [savedPhoto, setSavedPhoto] = useState(null);
  const [tempPhoto, setTempPhoto] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Photo editor state
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // Load saved profile photo from localStorage
  useEffect(() => {
    const savedPhotoData = localStorage.getItem(`profilePhoto_${user?.email}`);
    if (savedPhotoData) {
      setSavedPhoto(savedPhotoData);
    }
  }, [user?.email]);

  // Handle photo selection
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempPhoto(reader.result);
      setIsEditing(true);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  // Handle mouse/touch drag for repositioning
  const handleMouseDown = (e) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
    }
  }, [isDragging, dragStart.x, dragStart.y]);

  // Save cropped photo
  const handleSavePhoto = () => {
    if (!tempPhoto) return;

    // Create canvas to crop the photo
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const size = 400; // Output size
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.onload = () => {
      // Calculate crop dimensions
      const scale = zoom;
      const imgSize = Math.min(img.width, img.height) * scale;
      const offsetX = (img.width - imgSize) / 2 + position.x / scale;
      const offsetY = (img.height - imgSize) / 2 + position.y / scale;

      // Draw cropped image
      ctx.drawImage(img, offsetX, offsetY, imgSize, imgSize, 0, 0, size, size);

      const croppedImage = canvas.toDataURL("image/jpeg", 0.9);
      localStorage.setItem(`profilePhoto_${user?.email}`, croppedImage);

      // Update state and close editor
      setIsEditing(false);
      setTempPhoto(null);
      setSavedPhoto(croppedImage);

      // Force update after state change
      setTimeout(() => {
        alert("Profile photo saved successfully!");
      }, 50);
    };
    img.src = tempPhoto;
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempPhoto(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Remove photo
  const handleRemovePhoto = () => {
    if (window.confirm("Remove profile photo?")) {
      setSavedPhoto(null);
      setTempPhoto(null);
      setIsEditing(false);
      localStorage.removeItem(`profilePhoto_${user?.email}`);
    }
  };

  // Get display photo
  const displayPhoto = savedPhoto;

  // Derive readable identity pieces (for avatar/initials like Profile)
  const fullName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    (user?.email ? user.email.split("@")[0] : "User");

  const initials =
    (fullName || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  // Open tab from URL hash: #account | #preferences | #privacy
  useEffect(() => {
    const hash = location.hash?.replace("#", "");
    if (!hash) return;
    const allowed = ["account", "preferences", "privacy"];
    if (allowed.includes(hash)) setActiveTab(hash);
  }, [location.hash]);

  return (
    <section className="profile-page">
      <div className="profile-shell container">
        {/* Header matches Profile */}
        <div className="profile-header">
          <div
            className="profile-avatar"
            aria-hidden
            key={savedPhoto} // Force re-render when photo changes
            style={{
              background: savedPhoto ? `url(${savedPhoto})` : "#d9d9d9",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!savedPhoto && <span>{initials}</span>}
          </div>
          <h1 className="profile-title">Settings</h1>
        </div>

        <div className="profile-body">
          {/* Sidebar (mirrors Profile) */}
          <aside className="profile-sidebar" aria-label="Settings navigation">
            <nav>
              <Link className="nav-item" to="/profile">
                My Profile
              </Link>
              <Link className="nav-item active" to="/settings">
                Settings
              </Link>
              <Link className="nav-item" to="/drafts">
                Drafts
              </Link>
            </nav>
            <button className="nav-logout" onClick={handleLogout}>
              Logout
            </button>
          </aside>

          {/* Content card */}
          <main className="profile-content" id="settings">
            <h2 className="section-title">Settings</h2>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "20px",
                padding: "4px",
                background: "#f5f5f5",
                borderRadius: "12px",
              }}
            >
              <button
                onClick={() => setActiveTab("account")}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "8px",
                  background: activeTab === "account" ? "#fff" : "transparent",
                  color: activeTab === "account" ? "#a2665a" : "#666",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow:
                    activeTab === "account"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                }}
              >
                Account
              </button>
              <button
                onClick={() => setActiveTab("preferences")}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "8px",
                  background:
                    activeTab === "preferences" ? "#fff" : "transparent",
                  color: activeTab === "preferences" ? "#a2665a" : "#666",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow:
                    activeTab === "preferences"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                }}
              >
                Preferences
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "8px",
                  background: activeTab === "privacy" ? "#fff" : "transparent",
                  color: activeTab === "privacy" ? "#a2665a" : "#666",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow:
                    activeTab === "privacy"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                }}
              >
                Privacy
              </button>
            </div>

            {activeTab === "account" && (
              <div>
                <div className="profile-details">
                  {/* Profile Photo Upload */}
                  <div
                    className="profile-row"
                    style={{ display: "block", padding: "18px 0" }}
                  >
                    <div className="label" style={{ marginBottom: "12px" }}>
                      Profile Photo
                    </div>

                    {!isEditing ? (
                      <div
                        className="value"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        {/* Avatar Preview */}
                        <div
                          style={{
                            width: "100px",
                            height: "100px",
                            borderRadius: "50%",
                            background: savedPhoto
                              ? `url(${savedPhoto})`
                              : "#d9d9d9",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "32px",
                            fontWeight: 800,
                            border: "3px solid #e0b7a9",
                            flexShrink: 0,
                          }}
                        >
                          {!savedPhoto && initials}
                        </div>

                        {/* Upload Controls */}
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              fontSize: "14px",
                              color: "#666",
                              marginBottom: "12px",
                            }}
                          >
                            Upload a profile photo. Recommended size: 400x400px.
                            Max 5MB.
                          </p>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <label
                              htmlFor="photoUpload"
                              style={{
                                padding: "10px 20px",
                                background:
                                  "linear-gradient(to right, #e0b7a9, #c89585)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                display: "inline-block",
                              }}
                            >
                              {savedPhoto ? "Change Photo" : "Upload Photo"}
                            </label>
                            <input
                              id="photoUpload"
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              style={{ display: "none" }}
                            />
                            {savedPhoto && (
                              <button
                                type="button"
                                onClick={handleRemovePhoto}
                                style={{
                                  padding: "10px 20px",
                                  background: "#fff",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                  borderRadius: "8px",
                                  fontWeight: 600,
                                  fontSize: "14px",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                              >
                                Remove Photo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Photo Editor */
                      <div className="value">
                        <div
                          style={{
                            background: "#f9fafb",
                            border: "2px dashed #e0b7a9",
                            borderRadius: "12px",
                            padding: "20px",
                            marginBottom: "16px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "14px",
                              color: "#666",
                              marginBottom: "16px",
                              textAlign: "center",
                            }}
                          >
                            Drag to reposition • Scroll or use slider to zoom
                          </p>

                          {/* Photo Preview Canvas */}
                          <div
                            style={{
                              width: "300px",
                              height: "300px",
                              margin: "0 auto 20px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              border: "3px solid #e0b7a9",
                              position: "relative",
                              cursor: isDragging ? "grabbing" : "grab",
                              background: "#f3f4f6",
                            }}
                            onMouseDown={handleMouseDown}
                          >
                            {tempPhoto && (
                              <img
                                src={tempPhoto}
                                alt="Preview"
                                style={{
                                  width: `${zoom * 100}%`,
                                  height: `${zoom * 100}%`,
                                  objectFit: "cover",
                                  position: "absolute",
                                  left: "50%",
                                  top: "50%",
                                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                                  userSelect: "none",
                                  pointerEvents: "none",
                                }}
                                draggable={false}
                              />
                            )}
                          </div>

                          {/* Zoom Slider */}
                          <div
                            style={{ maxWidth: "300px", margin: "0 auto 16px" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "14px",
                                  color: "#666",
                                  fontWeight: 600,
                                }}
                              >
                                Zoom:
                              </span>
                              <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.1"
                                value={zoom}
                                onChange={(e) =>
                                  setZoom(parseFloat(e.target.value))
                                }
                                style={{
                                  flex: 1,
                                  accentColor: "#e0b7a9",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "14px",
                                  color: "#666",
                                  minWidth: "40px",
                                }}
                              >
                                {zoom.toFixed(1)}x
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              onClick={handleSavePhoto}
                              style={{
                                padding: "10px 24px",
                                background:
                                  "linear-gradient(to right, #10b981, #059669)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              ✓ Save Photo
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              style={{
                                padding: "10px 24px",
                                background: "#fff",
                                color: "#666",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="profile-row">
                    <div className="label">Full Name</div>
                    <div className="value">
                      {user?.name ||
                        `${user?.firstName || ""} ${
                          user?.lastName || ""
                        }`.trim() ||
                        "-"}
                    </div>
                  </div>
                  <div className="profile-row">
                    <div className="label">Username</div>
                    <div className="value">
                      {user?.username ||
                        (user?.email ? user.email.split("@")[0] : "-")}
                    </div>
                  </div>
                  <div className="profile-row">
                    <div className="label">Email Address</div>
                    <div className="value">{user?.email || "-"}</div>
                  </div>
                  <div className="profile-row">
                    <div className="label">Phone Number</div>
                    <div className="value">
                      {user?.phone || user?.phoneNumber || "-"}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "20px" }}>
                  <button
                    style={{
                      padding: "12px 24px",
                      background: "linear-gradient(to right, #e0b7a9, #c89585)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onClick={() => alert("Edit profile feature coming soon!")}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <div>
                <div className="profile-details">
                  <div className="profile-row" style={{ alignItems: "center" }}>
                    <div className="label">Email Notifications</div>
                    <div
                      className="value"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{ flex: 1, fontSize: "14px", color: "#666" }}
                      >
                        Receive email updates about your activity
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#e0b7a9]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e0b7a9]"></div>
                      </label>
                    </div>
                  </div>
                  <div className="profile-row" style={{ alignItems: "center" }}>
                    <div className="label">Dark Mode</div>
                    <div
                      className="value"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{ flex: 1, fontSize: "14px", color: "#666" }}
                      >
                        Enable dark theme
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#e0b7a9]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e0b7a9]"></div>
                      </label>
                    </div>
                  </div>
                  <div className="profile-row" style={{ alignItems: "center" }}>
                    <div className="label">Auto-save Photos</div>
                    <div
                      className="value"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{ flex: 1, fontSize: "14px", color: "#666" }}
                      >
                        Automatically save captured photos
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#e0b7a9]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e0b7a9]"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                <div className="profile-details">
                  <div
                    className="profile-row"
                    style={{ display: "block", padding: "18px 0" }}
                  >
                    <div className="label" style={{ marginBottom: "8px" }}>
                      Change Password
                    </div>
                    <div className="value" style={{ marginBottom: "12px" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#666",
                          marginBottom: "12px",
                        }}
                      >
                        Update your password regularly to keep your account
                        secure
                      </p>
                      <button
                        style={{
                          padding: "10px 20px",
                          background:
                            "linear-gradient(to right, #e0b7a9, #c89585)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onClick={() =>
                          alert("Change password feature coming soon!")
                        }
                      >
                        Change Password
                      </button>
                    </div>
                  </div>
                  <div
                    className="profile-row"
                    style={{ display: "block", padding: "18px 0" }}
                  >
                    <div className="label" style={{ marginBottom: "8px" }}>
                      Two-Factor Authentication
                    </div>
                    <div className="value" style={{ marginBottom: "12px" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#666",
                          marginBottom: "12px",
                        }}
                      >
                        Add an extra layer of security to your account
                      </p>
                      <button
                        style={{
                          padding: "10px 20px",
                          background:
                            "linear-gradient(to right, #e0b7a9, #c89585)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onClick={() => alert("2FA feature coming soon!")}
                      >
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                  <div
                    className="profile-row"
                    style={{
                      display: "block",
                      padding: "18px 0",
                      borderBottom: "none",
                    }}
                  >
                    <div
                      className="label"
                      style={{ marginBottom: "8px", color: "#b91c1c" }}
                    >
                      Delete Account
                    </div>
                    <div className="value" style={{ marginBottom: "12px" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#991b1b",
                          marginBottom: "12px",
                        }}
                      >
                        Permanently delete your account and all associated data.
                        This action cannot be undone.
                      </p>
                      <button
                        style={{
                          padding: "10px 20px",
                          background: "#dc2626",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete your account? This action cannot be undone."
                            )
                          ) {
                            alert("Account deletion feature coming soon!");
                          }
                        }}
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
