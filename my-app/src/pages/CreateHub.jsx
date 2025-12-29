import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Share2, Check, Copy, Cloud, CloudOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import draftStorage from "../utils/draftStorage.js";
import draftService from "../services/draftService.js";
import userStorage from "../utils/userStorage.js";
import { generateShareLink } from "../services/frameShareService.js";
import "./CreateHub.css";

export default function CreateHub() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [cloudDrafts, setCloudDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareDraftTitle, setShareDraftTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const isMountedRef = useRef(true);

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

  // Delete draft
  const handleDeleteDraft = async (e, draftId) => {
    e.stopPropagation(); // Prevent card click
    if (!draftId) return;
    
    const confirmDelete = window.confirm("Hapus draft ini?");
    if (!confirmDelete) return;

    setDeletingId(draftId);
    try {
      await draftStorage.deleteDraft(draftId);
      await reloadDrafts();
    } catch (error) {
      console.error("❌ Failed to delete draft", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Render draft thumbnail
  const renderDraftThumbnail = (draft) => {
    // Draft dapat menyimpan preview di berbagai field
    const previewImage = draft.preview || draft.thumbnail || draft.previewImage;
    
    if (previewImage) {
      return (
        <img 
          src={previewImage} 
          alt={draft.title || "Draft"} 
          className="create-hub-draft-image"
        />
      );
    }
    
    // Fallback placeholder
    return (
      <div className="create-hub-draft-placeholder">
        <span>No Preview</span>
      </div>
    );
  };

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
          
          {loading ? (
            <div className="create-hub-loading">
              <div className="create-hub-spinner"></div>
              <span>Memuat draft...</span>
            </div>
          ) : sortedDrafts.length === 0 ? (
            <div className="create-hub-empty">
              <p>Belum ada draft. Buat frame baru untuk memulai!</p>
            </div>
          ) : (
            <div className="create-hub-drafts-grid">
              {sortedDrafts.map((draft, index) => (
                <div 
                  key={draft.id || index} 
                  className="create-hub-draft-card"
                  onClick={() => handleOpenDraft(draft)}
                >
                  <div className="create-hub-draft-thumbnail">
                    {renderDraftThumbnail(draft)}
                    
                    {/* Delete button only */}
                    <div className="create-hub-draft-actions">
                      <button
                        className="create-hub-draft-delete"
                        onClick={(e) => handleDeleteDraft(e, draft.id)}
                        disabled={deletingId === draft.id}
                        title="Hapus draft"
                      >
                        {deletingId === draft.id ? "..." : "×"}
                      </button>
                    </div>
                  </div>
                  
                  {/* Draft info with share button below title */}
                  <div className="create-hub-draft-info">
                    <span className="create-hub-draft-name">
                      {draft.title?.trim() || `Draft - ${index + 1}`}
                    </span>
                    <button
                      className="create-hub-draft-share-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleShareDraft(e, draft);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleShareDraft(e, draft);
                      }}
                      title="Bagikan frame"
                    >
                      <Share2 size={14} />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            <h3 className="create-hub-modal-title">Bagikan Frame</h3>
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
