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
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load from local storage FIRST (fast) - show immediately
      const localDrafts = await draftStorage.loadDrafts();
      if (isMountedRef.current) {
        setDrafts(Array.isArray(localDrafts) ? localDrafts : []);
        setLoading(false); // Stop loading immediately after local drafts
      }
      
      // Load cloud drafts in background (don't block UI)
      if (user) {
        // Use Promise.race with timeout to prevent hanging
        const cloudPromise = draftService.getCloudDrafts();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloud timeout')), 3000)
        );
        
        Promise.race([cloudPromise, timeoutPromise])
          .then(cloudData => {
            if (isMountedRef.current) {
              setCloudDrafts(Array.isArray(cloudData) ? cloudData : []);
            }
          })
          .catch(() => {
            // Silently ignore cloud errors - local drafts are enough
          });
      }
    } catch (error) {
      console.error("⚠️ Failed to load drafts", error);
      if (isMountedRef.current) {
        setDrafts([]);
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

  // Share draft - optimized: skip upload if already shared
  const handleShareDraft = async (e, draft) => {
    e.stopPropagation(); // Prevent card click
    if (!draft?.id) return;
    
    try {
      // Check if draft already has a share_id (was shared before)
      if (draft.share_id) {
        // Fast path: use existing share_id
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/take-moment?share=${draft.share_id}`;
        
        setShareLink(link);
        setShareDraftTitle(draft.title || "Draft");
        setShowShareModal(true);
        setCopied(false);
        return;
      }
      
      showToast("info", "⏳ Menyiapkan link share...");
      
      // Prepare frame data
      const frameData = JSON.stringify({
        aspectRatio: draft.aspectRatio || "9:16",
        canvasBackground: draft.canvasBackground || "#f7f1ed",
        canvasWidth: draft.canvasWidth || 1080,
        canvasHeight: draft.canvasHeight || 1920,
        elements: draft.elements || []
      });
      
      // Upload to cloud and get share_id
      const result = await draftService.saveDraftToCloud({
        title: draft.title || "Shared Frame",
        frameData: frameData,
        previewUrl: draft.preview || null,
        draftId: null
      });
      
      if (!result?.draft?.share_id) {
        throw new Error("Gagal mendapatkan share ID");
      }
      
      // Save share_id back to local draft for future fast access
      const shareId = result.draft.share_id;
      try {
        await draftStorage.updateDraft(draft.id, { share_id: shareId });
      } catch (e) {
        console.warn("Could not cache share_id locally");
      }
      
      // Make it public (fire and forget - don't wait)
      draftService.updateVisibility(result.draft.id, true).catch(() => {});
      
      // Generate share link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/take-moment?share=${shareId}`;
      
      setShareLink(link);
      setShareDraftTitle(draft.title || "Draft");
      setShowShareModal(true);
      setCopied(false);
      
      showToast("success", "✅ Link siap di-share!");
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
          showToast("warning", "⚠️ Link dibuat dengan mode offline");
          return;
        }
      } catch (e) {}
      
      showToast("error", "Gagal membuat link share.");
    }
  };

  // Copy link to clipboard - improved for mobile and various browsers
  const handleCopyLink = async () => {
    if (!shareLink) {
      showToast("error", "Link tidak tersedia");
      return;
    }

    let copySuccess = false;

    try {
      // Method 1: Modern Clipboard API (preferred)
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareLink);
        copySuccess = true;
        console.log("✅ Copied using Clipboard API");
      }
    } catch (err) {
      console.warn("Clipboard API failed:", err);
    }

    // Method 2: Fallback using execCommand
    if (!copySuccess) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareLink;
        // Make it invisible but still selectable
        textArea.style.cssText = "position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;";
        document.body.appendChild(textArea);
        
        // iOS specific handling
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          const range = document.createRange();
          range.selectNodeContents(textArea);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          textArea.setSelectionRange(0, shareLink.length);
        } else {
          textArea.select();
        }
        
        copySuccess = document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log("✅ Copied using execCommand:", copySuccess);
      } catch (err) {
        console.warn("execCommand failed:", err);
      }
    }

    // Method 3: Using input element in modal (iOS Safari fallback)
    if (!copySuccess) {
      try {
        const inputElement = document.querySelector('.create-hub-share-input');
        if (inputElement) {
          inputElement.select();
          inputElement.setSelectionRange(0, 99999);
          copySuccess = document.execCommand('copy');
          console.log("✅ Copied using input element:", copySuccess);
        }
      } catch (err) {
        console.warn("Input element copy failed:", err);
      }
    }

    if (copySuccess) {
      setCopied(true);
      showToast("success", "Link berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Final fallback - show toast with manual instruction
      showToast("info", "Tekan lama pada link lalu pilih 'Salin'");
      // Select the input so user can easily copy
      const inputElement = document.querySelector('.create-hub-share-input');
      if (inputElement) {
        inputElement.select();
        inputElement.setSelectionRange(0, 99999);
      }
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
                      onClick={(e) => handleShareDraft(e, draft)}
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
