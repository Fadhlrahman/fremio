import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import draftStorage from "../utils/draftStorage.js";
import userStorage from "../utils/userStorage.js";
import "../styles/drafts.css";
import "../styles/profile.css";

export default function Drafts() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const isMountedRef = useRef(true);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // Get user info for avatar
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

  // Get profile photo from localStorage (UID first, email fallback)
  const profilePhoto =
    localStorage.getItem(`profilePhoto_${user?.uid}`) ||
    localStorage.getItem(`profilePhoto_${user?.email}`);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reloadDrafts = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const loaded = await draftStorage.loadDrafts();
      if (isMountedRef.current) {
        setDrafts(Array.isArray(loaded) ? loaded : []);
      }
    } catch (error) {
      console.error("⚠️ Failed to load drafts", error);
      if (isMountedRef.current) {
        setErrorMessage("Gagal memuat draft. Coba lagi nanti.");
        setDrafts([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    reloadDrafts();
  }, [reloadDrafts]);

  const sortedDrafts = useMemo(() => {
    return [...drafts].sort((a, b) => {
      const left = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
      const right = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
      return right - left;
    });
  }, [drafts]);

  const handleUseDraft = async (draft) => {
    if (!draft) return;
    setErrorMessage("");

    // Navigate to Create editor with draft ID
    navigate("/create/editor", { state: { draftId: draft.id } });

    // Set active draft in storage for Create page to load (use userStorage)
    userStorage.setItem("activeDraftId", draft.id);
    if (draft.signature) {
      userStorage.setItem("activeDraftSignature", draft.signature);
    } else {
      userStorage.removeItem("activeDraftSignature");
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (!draftId) return;
    const confirmDelete = window.confirm("Hapus draft ini?");
    if (!confirmDelete) return;

    if (isMountedRef.current) {
      setDeletingId(draftId);
    }
    try {
      await draftStorage.deleteDraft(draftId);
      await reloadDrafts();
    } catch (error) {
      console.error("❌ Failed to delete draft", error);
      if (isMountedRef.current) {
        setErrorMessage("Draft tidak bisa dihapus. Coba lagi.");
      }
    } finally {
      if (isMountedRef.current) {
        setDeletingId(null);
      }
    }
  };

  const renderDraftRow = (draft) => {
    const frameTitle = draft.title?.trim() || "Draft Frame";

    // Determine aspect ratio
    let ratioWidth = 9;
    let ratioHeight = 16;

    if (draft.aspectRatio && typeof draft.aspectRatio === "string") {
      const [ratioW, ratioH] = draft.aspectRatio.split(":").map(Number);
      if (
        Number.isFinite(ratioW) &&
        ratioW > 0 &&
        Number.isFinite(ratioH) &&
        ratioH > 0
      ) {
        ratioWidth = ratioW;
        ratioHeight = ratioH;
      }
    } else if (draft.canvasWidth && draft.canvasHeight) {
      const width = Number(draft.canvasWidth);
      const height = Number(draft.canvasHeight);
      if (
        Number.isFinite(width) &&
        width > 0 &&
        Number.isFinite(height) &&
        height > 0
      ) {
        ratioWidth = width;
        ratioHeight = height;
      }
    }

    const numericRatio = ratioWidth / ratioHeight;
    let displayRatio = "9:16";
    if (Math.abs(numericRatio - 9 / 16) < 0.01) {
      displayRatio = "9:16";
    } else if (Math.abs(numericRatio - 4 / 5) < 0.01) {
      displayRatio = "4:5";
    } else if (Math.abs(numericRatio - 2 / 3) < 0.01) {
      displayRatio = "2:3";
    } else {
      displayRatio = `${ratioWidth}:${ratioHeight}`;
    }

    // Format date
    const updatedDate = draft.updatedAt || draft.createdAt;
    const formattedDate = updatedDate
      ? new Date(updatedDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

    // Thumbnail size for row display
    const THUMB_HEIGHT = 80;
    const thumbWidth = Math.round(THUMB_HEIGHT * (ratioWidth / ratioHeight));

    return (
      <div
        key={draft.id}
        className="profile-row"
        style={{ alignItems: "center" }}
      >
        <div
          className="label"
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
        >
          {/* Thumbnail */}
          <div
            style={{
              width: `${thumbWidth}px`,
              height: `${THUMB_HEIGHT}px`,
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {draft.preview ? (
              <img
                src={draft.preview}
                alt={frameTitle}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                loading="lazy"
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f3f4f6",
                  fontSize: "10px",
                  color: "#9ca3af",
                  fontWeight: 600,
                }}
              >
                No Preview
              </div>
            )}
            {/* Ratio badge */}
            <div
              style={{
                position: "absolute",
                bottom: "4px",
                right: "4px",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 600,
              }}
            >
              {displayRatio}
            </div>
          </div>
          {/* Info */}
          <div>
            <div
              style={{ fontWeight: 700, color: "#222", marginBottom: "4px" }}
            >
              {frameTitle}
            </div>
            <div style={{ fontSize: "13px", color: "#999" }}>
              Updated: {formattedDate}
            </div>
          </div>
        </div>
        <div
          className="value"
          style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            onClick={() => handleUseDraft(draft)}
            style={{
              padding: "8px 16px",
              background: "linear-gradient(to right, #e0b7a9, #c89585)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Gunakan
          </button>
          <button
            type="button"
            onClick={() => handleDeleteDraft(draft.id)}
            disabled={deletingId === draft.id}
            style={{
              padding: "8px 16px",
              background: "#fff",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: deletingId === draft.id ? "not-allowed" : "pointer",
              opacity: deletingId === draft.id ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {deletingId === draft.id ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="profile-page">
      <div className="profile-shell container">
        {/* Header matches Profile & Settings */}
        <div className="profile-header">
          <div
            className="profile-avatar"
            aria-hidden
            style={{
              background: profilePhoto ? `url(${profilePhoto})` : "#d9d9d9",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!profilePhoto && <span>{initials}</span>}
          </div>
          <h1 className="profile-title">My Drafts</h1>
        </div>

        <div className="profile-body">
          {/* Sidebar navigation */}
          <aside className="profile-sidebar" aria-label="Profile navigation">
            <nav>
              <Link className="nav-item" to="/profile">
                My Profile
              </Link>
              <Link className="nav-item" to="/settings">
                Settings
              </Link>
              <Link className="nav-item active" to="/drafts">
                Drafts
              </Link>
            </nav>
            <button className="nav-logout" onClick={handleLogout}>
              Logout
            </button>
          </aside>

          {/* Content */}
          <main className="profile-content">
            <h2 className="section-title">My Drafts</h2>

            <div
              style={{
                marginBottom: "20px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/create/editor"
                style={{
                  padding: "10px 20px",
                  background: "linear-gradient(to right, #e0b7a9, #c89585)",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Buat Draft Baru
              </Link>
              <button
                type="button"
                onClick={reloadDrafts}
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  background: "#fff",
                  color: "#666",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Memuat..." : "Refresh"}
              </button>
            </div>

            {errorMessage ? (
              <div
                style={{
                  padding: "12px 16px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                {errorMessage}
              </div>
            ) : null}

            {loading ? (
              <div
                style={{
                  marginTop: "80px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  color: "#666",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "3px solid #e5e7eb",
                    borderTop: "3px solid #a2665a",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: "14px" }}>Memuat draft...</span>
              </div>
            ) : sortedDrafts.length === 0 ? (
              <div
                style={{
                  marginTop: "80px",
                  padding: "60px 24px",
                  background: "linear-gradient(to bottom, #fef8f5, #fff)",
                  border: "2px dashed #e0b7a9",
                  borderRadius: "12px",
                  textAlign: "center",
                  color: "#666",
                }}
              >
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    marginBottom: "12px",
                  }}
                >
                  Belum ada draft tersimpan.
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "24px",
                    maxWidth: "400px",
                    margin: "0 auto 24px",
                  }}
                >
                  Buat frame pertama kamu di halaman Create, lalu simpan untuk
                  digunakan kembali.
                </p>
                <Link
                  to="/create/editor"
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    background: "linear-gradient(to right, #e0b7a9, #c89585)",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                >
                  Mulai Buat Frame
                </Link>
              </div>
            ) : (
              <div className="profile-details">
                {sortedDrafts.map((draft) => renderDraftRow(draft))}
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
