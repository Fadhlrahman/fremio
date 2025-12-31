import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Share2, Check, Copy } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import draftStorage from "../utils/draftStorage.js";
import draftService from "../services/draftService.js";
import userStorage from "../utils/userStorage.js";
import { generateShareLink } from "../services/frameShareService.js";
import {
  createDraftGroup,
  loadDraftGroups,
  toggleDraftInGroup,
} from "../utils/draftGroupStorage.js";
import "./CreateHub.css";

export default function CreateHub() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [cloudDrafts, setCloudDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareDraftTitle, setShareDraftTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const isMountedRef = useRef(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState(() => new Set());

  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState({ type: "all" });
  const [addingToGroupId, setAddingToGroupId] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync authenticated user to storage so utilities like getCurrentUserId work reliably
  useEffect(() => {
    if (user?.email) {
      try {
        const payload = JSON.stringify(user);
        localStorage.setItem("fremio_user", payload);
        sessionStorage.setItem("fremio_user_cache", payload);
        console.log("🔐 [CreateHub] Synced user to storage:", user.email);
      } catch (err) {
        console.warn("⚠️ [CreateHub] Failed to sync user to storage", err);
      }
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    setGroups(loadDraftGroups(user.email));
  }, [user?.email]);

  // Clean up guest keys and migrate global activeDraft to user-scoped
  useEffect(() => {
    if (!user?.email) return;
    
    try {
      // Remove guest-prefixed keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("guest:")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      if (keysToRemove.length > 0) {
        console.log(`🧹 [CreateHub] Removed ${keysToRemove.length} guest keys`);
      }
      
      // Migrate global activeDraftId to user-scoped
      const globalActiveDraftId = localStorage.getItem("activeDraftId");
      if (globalActiveDraftId) {
        userStorage.setItem("activeDraftId", globalActiveDraftId);
        localStorage.removeItem("activeDraftId");
        console.log("🔄 [CreateHub] Migrated global activeDraftId to user storage");
      }
    } catch (err) {
      console.warn("⚠️ [CreateHub] Failed to clean up storage:", err);
    }
  }, [user?.email]);

  const reloadDrafts = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    // Wait for user authentication before loading drafts
    if (!user?.email) {
      console.log("⏳ [CreateHub] Waiting for user auth before loading drafts...");
      setLoading(false);
      return;
    }
    
    console.log("📂 [CreateHub] Loading drafts for user:", user.email);

    // Show cached summaries immediately to avoid long spinner
    try {
      const cached = draftStorage.getCachedDraftSummaries
        ? draftStorage.getCachedDraftSummaries(user.email)
        : [];
      if (Array.isArray(cached) && cached.length > 0 && isMountedRef.current) {
        setDrafts(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
    } catch {
      setLoading(true);
    }

    try {
      // Load local drafts fast (summaries) so the list renders quickly
      const localDrafts = draftStorage.loadDraftSummaries
        ? await draftStorage.loadDraftSummaries()
        : await draftStorage.loadDrafts();
      if (isMountedRef.current) {
        setDrafts(Array.isArray(localDrafts) ? localDrafts : []);
        console.log(`✅ [CreateHub] Loaded ${localDrafts?.length || 0} local drafts`);
      }

      // Load from cloud in the background (do not block initial render)
      if (user) {
        void (async () => {
          try {
            const cloudData = await draftService.getCloudDrafts();
            if (isMountedRef.current) {
              setCloudDrafts(Array.isArray(cloudData) ? cloudData : []);
            }
          } catch (cloudError) {
            console.log("☁️ Cloud drafts not available:", cloudError.message);
          }
        })();
      }
    } catch (error) {
      console.error("⚠️ Failed to load drafts", error);
      if (isMountedRef.current) {
        setDrafts([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

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

  const activeGroup = useMemo(() => {
    if (activeTab?.type !== "group") return null;
    return groups.find((g) => g?.id === activeTab?.groupId) || null;
  }, [activeTab, groups]);

  const groupDraftIdSet = useMemo(() => {
    const ids = activeGroup?.draftIds;
    return new Set(Array.isArray(ids) ? ids : []);
  }, [activeGroup]);

  const selectionGroup = useMemo(() => {
    if (!addingToGroupId) return null;
    return groups.find((g) => g?.id === addingToGroupId) || null;
  }, [addingToGroupId, groups]);

  const selectionGroupDraftIdSet = useMemo(() => {
    const ids = selectionGroup?.draftIds;
    return new Set(Array.isArray(ids) ? ids : []);
  }, [selectionGroup]);


  // Navigate to editor for new frame
  const handleCreateNew = () => {
    // Clear any active draft
    userStorage.removeItem("activeDraftId");
    userStorage.removeItem("activeDraftSignature");
    navigate("/create/editor");
  };

  // Navigate to editor with existing draft
  const handleOpenDraft = (draft) => {
    if (!draft) return;
    
    // Set active draft in storage for editor to load
    userStorage.setItem("activeDraftId", draft.id);
    if (draft.signature) {
      userStorage.setItem("activeDraftSignature", draft.signature);
    } else {
      userStorage.removeItem("activeDraftSignature");
    }
    
    navigate("/create/editor", { state: { draftId: draft.id } });
  };

  // Share draft - upload ke VPS PostgreSQL lalu generate link
  const handleShareDraft = async (e, draft) => {
    e.stopPropagation(); // Prevent card click
    if (!draft?.id) return;
    
    setIsGeneratingLink(true);
    
    try {

      // Ensure we have the full draft (summaries may not include elements)
      let fullDraft = draft;
      if (!Array.isArray(fullDraft?.elements)) {
        fullDraft = await draftStorage.getDraftById(draft.id, user?.email);
      }
      if (!fullDraft) {
        throw new Error("Draft tidak ditemukan");
      }
      
      // Step 1: Upload draft to VPS PostgreSQL
      // CRITICAL: Include ALL data needed for EditPhoto to render properly
      // This includes canvasWidth/Height for coordinate conversion and ALL elements
      console.log("📤 [SHARE] Draft data being shared:", {
        title: fullDraft.title,
        elementsCount: fullDraft.elements?.length,
        elementTypes: fullDraft.elements?.map(el => el.type),
        hasBackground: fullDraft.elements?.some(el => el.type === 'background-photo'),
        hasOverlay: fullDraft.elements?.some(el => el.type === 'upload'),
        canvasWidth: fullDraft.canvasWidth,
        canvasHeight: fullDraft.canvasHeight,
      });
      
      const frameData = JSON.stringify({
        aspectRatio: fullDraft.aspectRatio || "9:16",
        canvasBackground: fullDraft.canvasBackground || "#f7f1ed",
        canvasWidth: fullDraft.canvasWidth || 1080,
        canvasHeight: fullDraft.canvasHeight || 1920,
        elements: fullDraft.elements || []
      });
      
      const result = await draftService.saveDraftToCloud({
        title: fullDraft.title || "Shared Frame",
        frameData: frameData,
        previewUrl: fullDraft.preview || null,
        draftId: null // Always create new for sharing
      });
      
      if (!result?.draft?.share_id) {
        throw new Error("Gagal mendapatkan share ID");
      }
      
      // Step 2: Make it public
      await draftService.updateVisibility(result.draft.id, true);
      
      // Step 3: Generate share link with share_id
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/take-moment?share=${result.draft.share_id}`;
      
      setShareLink(link);
      setShareDraftTitle(fullDraft.title || "Draft");
      setShowShareModal(true);
      setCopied(false);
      setIsGeneratingLink(false);
      
      showToast("success", "✅ Link siap di-share ke teman!");
    } catch (error) {
      console.error("Error generating share link:", error);
      
      // Fallback: use embedded data if cloud fails
      try {
        const link = generateShareLink(draft);
        if (link) {
          setShareLink(link);
          setShareDraftTitle(draft.title || "Draft");
          setShowShareModal(true);
          setCopied(false);
          setIsGeneratingLink(false);
          showToast("warning", "⚠️ Link dibuat dengan mode offline");
          return;
        }
      } catch (e) {}
      
      setIsGeneratingLink(false);
      showToast("error", "Gagal membuat link share. Pastikan sudah login.");
    }
  };

  const handleCreateGroup = () => {
    if (!user?.email) {
      showToast("error", "Login diperlukan");
      return;
    }
    const group = createDraftGroup(user.email);
    const next = loadDraftGroups(user.email);
    setGroups(next);
    setActiveTab({ type: "group", groupId: group.id });
    setAddingToGroupId(null);
  };

  const handleToggleDraftInGroup = (groupId, draftId) => {
    if (!user?.email || !groupId || !draftId) return;
    const next = toggleDraftInGroup(user.email, groupId, draftId);
    setGroups(next);
  };

  const handleStartAddFramesToGroup = () => {
    if (!user?.email || !activeGroup?.id) return;
    setAddingToGroupId(activeGroup.id);
    setActiveTab({ type: "all" });
  };

  const handleShareGroup = async () => {
    if (!activeGroup?.id) return;

    setIsGeneratingLink(true);
    try {
      const groupDrafts = sortedDrafts.filter((d) => groupDraftIdSet.has(d?.id));
      if (groupDrafts.length === 0) {
        showToast("info", "Pilih minimal 1 frame untuk group ini");
        setIsGeneratingLink(false);
        return;
      }

      // Upload each draft to VPS drafts table (public share) and collect share_ids
      const sharedFrames = [];
      for (const draft of groupDrafts) {
        let fullDraft = draft;
        if (!Array.isArray(fullDraft?.elements)) {
          fullDraft = await draftStorage.getDraftById(draft.id, user?.email);
        }
        if (!fullDraft) continue;

        const frameData = JSON.stringify({
          aspectRatio: fullDraft.aspectRatio || "9:16",
          canvasBackground: fullDraft.canvasBackground || "#f7f1ed",
          canvasWidth: fullDraft.canvasWidth || 1080,
          canvasHeight: fullDraft.canvasHeight || 1920,
          elements: fullDraft.elements || [],
        });

        const result = await draftService.saveDraftToCloud({
          title: fullDraft.title || "Shared Frame",
          frameData,
          previewUrl: fullDraft.thumbnail || fullDraft.preview || null,
          draftId: null,
        });

        const shareId = result?.draft?.share_id;
        if (!shareId) continue;

        sharedFrames.push({
          shareId,
          title: fullDraft.title || "Draft",
          description: fullDraft.description || "",
          thumbnail: fullDraft.thumbnail || fullDraft.preview || null,
        });
      }

      if (sharedFrames.length === 0) {
        throw new Error("Gagal membuat share untuk frame di group");
      }

      // Create group share on backend (public)
      const response = await fetch("/api/groups/public-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeGroup.name || "Group Frames",
          frames: sharedFrames,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Gagal membuat link group");
      }
      const data = await response.json();
      const groupShareId = data?.group?.share_id;
      if (!groupShareId) throw new Error("Gagal mendapatkan group share ID");

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/g/${groupShareId}`;
      setShareLink(link);
      setShareDraftTitle(activeGroup.name || "Group Frames");
      setShowShareModal(true);
      setCopied(false);
      showToast("success", "✅ Link group siap di-share!");
    } catch (error) {
      console.error("Error generating group share link:", error);
      showToast("error", error?.message || "Gagal membuat link group");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        // Fallback for HTTP or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = shareLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      showToast("success", "Link berhasil disalin!");
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Final fallback - prompt user to copy manually
      showToast("info", "Tekan lama pada link untuk menyalin");
    }
  };

  // Render draft thumbnail
  const renderDraftThumbnail = (draft) => {
    // Draft dapat menyimpan preview di berbagai field
    const previewImage =
      draft.thumbnail ||
      draft.preview ||
      draft.thumbnailUrl ||
      draft.thumbnail_path ||
      draft.previewImage;
    
    if (previewImage) {
      return (
        <img
          src={previewImage}
          alt={draft.title || "Draft"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: "4px",
          }}
        />
      );
    }
    
    // Fallback placeholder
    return (
      <div
        style={{
          position: "absolute",
          inset: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
        }}
      >
        <span style={{ fontSize: "12px" }}>Gambar tidak tersedia</span>
      </div>
    );
  };

  function DraftCard({ draft, index, mode }) {
    const description = draft?.description || "";
    const maxLength = 50;
    const shouldTruncate = description.length > maxLength;
    const isExpanded = expandedDescriptions.has(draft?.id);
    const displayDescription = isExpanded
      ? description
      : description.slice(0, maxLength);

    return (
      <div
        className="frame-card"
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "8px",
          backgroundColor: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          border: "2px solid transparent",
          cursor: "pointer",
          transition:
            "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
          position: "relative",
        }}
        onClick={() => {
          if (mode === "select") {
            handleToggleDraftInGroup(addingToGroupId, draft.id);
            return;
          }
          handleOpenDraft(draft);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
          e.currentTarget.style.borderColor = "#e0a899";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
          e.currentTarget.style.borderColor = "transparent";
        }}
      >
        {mode === "all" && (
          <button
            type="button"
            onClick={(e) => handleShareDraft(e, draft)}
            onTouchEnd={(e) => handleShareDraft(e, draft)}
            title="Bagikan frame"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "linear-gradient(to right, #e0b7a9, #d4a99a)",
              color: "white",
              border: "none",
              width: "32px",
              height: "28px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
              boxShadow: "0 10px 22px rgba(224, 183, 169, 0.25)",
            }}
          >
            <Share2 size={14} />
          </button>
        )}

        {mode === "select" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleDraftInGroup(addingToGroupId, draft.id);
            }}
            title={
              selectionGroupDraftIdSet.has(draft.id)
                ? "Remove from group"
                : "Add to group"
            }
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              background: selectionGroupDraftIdSet.has(draft.id)
                ? "linear-gradient(to right, #e0b7a9, #d4a99a)"
                : "rgba(255, 255, 255, 0.95)",
              color: selectionGroupDraftIdSet.has(draft.id) ? "white" : "#1e293b",
              border: selectionGroupDraftIdSet.has(draft.id)
                ? "none"
                : "1px solid rgba(224, 183, 169, 0.6)",
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
              boxShadow: "0 10px 22px rgba(224, 183, 169, 0.18)",
            }}
          >
            {selectionGroupDraftIdSet.has(draft.id) ? <Check size={16} /> : "+"}
          </button>
        )}

        {/* Image Container - 9:16 aspect ratio */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            backgroundColor: "#f9fafb",
            aspectRatio: "9/16",
            width: "100%",
            padding: "12px",
            boxSizing: "border-box",
          }}
        >
          {renderDraftThumbnail(draft)}
        </div>

        {/* Name */}
        <div
          style={{
            padding: "8px 8px 4px 8px",
            textAlign: "center",
            fontSize:
              draft?.title && String(draft.title).length > 25 ? "10px" : "12px",
            fontWeight: 600,
            color: "#1e293b",
            lineHeight: "1.3",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto",
            minHeight: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {draft?.title?.trim() || `Draft - ${index + 1}`}
        </div>

        {/* Description */}
        {description && (
          <div
            style={{
              padding: "0 8px 8px 8px",
              textAlign: "center",
              fontSize: "10px",
              color: "#64748b",
              lineHeight: "1.4",
            }}
          >
            <span>
              {displayDescription}
              {shouldTruncate && !isExpanded && "..."}
            </span>
            {shouldTruncate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedDescriptions((prev) => {
                    const next = new Set(prev);
                    if (isExpanded) next.delete(draft.id);
                    else next.add(draft.id);
                    return next;
                  });
                }}
                style={{
                  display: "inline",
                  marginLeft: "4px",
                  padding: 0,
                  border: "none",
                  background: "none",
                  color: "#c89585",
                  fontSize: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isExpanded ? "Sembunyikan" : "Selengkapnya"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="anchor create-hub-wrap">
      <div className="container">
        {/* Create New Frame Card */}
        <div className="create-hub-section">
          <h2 className="create-hub-title">Create your frame</h2>
          
          <div className="create-hub-create-card" onClick={handleCreateNew}>
            <div className="create-hub-create-icon">
              <Plus size={48} strokeWidth={1} />
            </div>
          </div>
        </div>

        {/* Drafts Section */}
        <div className="create-hub-section">
          <h2 className="create-hub-title">Drafts</h2>

          {/* Tabs: All Frames + Groups */}
          <div className="create-hub-tabs">
            <button
              type="button"
              className={
                activeTab.type === "all"
                  ? "create-hub-tab create-hub-tab--active"
                  : "create-hub-tab"
              }
              onClick={() => {
                setActiveTab({ type: "all" });
                setAddingToGroupId(null);
              }}
            >
              All Frames
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={
                  activeTab.type === "group" && activeTab.groupId === g.id
                    ? "create-hub-tab create-hub-tab--active"
                    : "create-hub-tab"
                }
                onClick={() => {
                  setActiveTab({ type: "group", groupId: g.id });
                  setAddingToGroupId(null);
                }}
              >
                {g.name || "Group"}
              </button>
            ))}
            <button
              type="button"
              className="create-hub-tab create-hub-tab--add"
              onClick={handleCreateGroup}
              title="Tambah group"
            >
              <Plus size={18} strokeWidth={2} />
            </button>
          </div>

          {activeTab.type === "group" && activeGroup && (
            <div className="create-hub-group-share">
              <h3 className="create-hub-group-share-title">Share Group Link</h3>
              <div className="create-hub-group-share-actions">
                <button
                  type="button"
                  className="create-hub-group-share-btn"
                  onClick={handleShareGroup}
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  className="create-hub-group-add-btn"
                  onClick={handleStartAddFramesToGroup}
                >
                  <Plus size={16} />
                  <span>Add Frame</span>
                </button>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="create-hub-loading">
              <div className="create-hub-spinner"></div>
              <span>Memuat draft...</span>
            </div>
          ) : sortedDrafts.length === 0 ? (
            <div className="create-hub-empty">
              <p>Belum ada draft. Buat frame baru untuk memulai!</p>
            </div>
          ) : (() => {
            const isSelectingForGroup = activeTab.type === "all" && !!addingToGroupId;
            const visibleDrafts =
              activeTab.type === "group"
                ? sortedDrafts.filter((d) => groupDraftIdSet.has(d?.id))
                : sortedDrafts;

            if (activeTab.type === "group" && visibleDrafts.length === 0) {
              return (
                <div className="create-hub-empty">
                  <p>Belum ada frame di group ini.</p>
                </div>
              );
            }

            return (
              <div className="frames-grid">
                {visibleDrafts.map((draft, index) => (
                  <DraftCard
                    key={draft.id || index}
                    draft={draft}
                    index={index}
                    mode={isSelectingForGroup ? "select" : "all"}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Fullscreen Loading Overlay for Share */}
      {isGeneratingLink && (
        <div className="create-hub-fullscreen-loading">
          <div className="create-hub-fullscreen-loading-content">
            <div className="create-hub-fullscreen-spinner"></div>
            <p>Menyiapkan link share...</p>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="create-hub-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="create-hub-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="create-hub-modal-title">Bagikan</h3>
            <p className="create-hub-modal-desc">
              Orang lain dapat menggunakan frame ini dengan link berikut:
            </p>
            
            <div className="create-hub-share-link-container">
              <input 
                type="text" 
                className="create-hub-share-input" 
                value={shareLink} 
                readOnly 
              />
              <button 
                className={`create-hub-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
            
            <button 
              className="create-hub-modal-close"
              onClick={() => setShowShareModal(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
