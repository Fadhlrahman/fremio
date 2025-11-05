import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import draftStorage from "../utils/draftStorage.js";
import { activateDraftFrame } from "../utils/draftHelpers.js";
import safeStorage from "../utils/safeStorage.js";
import frameProvider from "../utils/frameProvider.js";
import "../styles/drafts.css";

export default function Drafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const reloadDrafts = useCallback(() => {
    setLoading(true);
    try {
      const loaded = draftStorage.loadDrafts();
      setDrafts(Array.isArray(loaded) ? loaded : []);
    } catch (error) {
      console.error("⚠️ Failed to load drafts", error);
      setErrorMessage("Gagal memuat draft. Coba lagi nanti.");
      setDrafts([]);
    } finally {
      setLoading(false);
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
    
    // Navigate to Create page with draft ID
    // User will see the frame and can click "Gunakan Frame Ini" button there
    navigate("/create", { state: { draftId: draft.id } });
    
    // Set active draft in storage for Create page to load
    safeStorage.setItem("activeDraftId", draft.id);
    if (draft.signature) {
      safeStorage.setItem("activeDraftSignature", draft.signature);
    } else {
      safeStorage.removeItem("activeDraftSignature");
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (!draftId) return;
    const confirmDelete = window.confirm("Hapus draft ini?");
    if (!confirmDelete) return;

    setDeletingId(draftId);
    try {
      draftStorage.deleteDraft(draftId);
      reloadDrafts();
    } catch (error) {
      console.error("❌ Failed to delete draft", error);
      setErrorMessage("Draft tidak bisa dihapus. Coba lagi.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderDraftCard = (draft) => {
    const frameTitle = draft.title?.trim() || "Draft";
    
    // Determine ratio values (default to 9:16)
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

    // Calculate preview size to match Create page save logic
    // Create page saves with max width 640px, so we display with the same constraint
    const MAX_PREVIEW_WIDTH = 640;
    const savedCanvasWidth = Number(draft.canvasWidth) || 1080;
    const savedCanvasHeight = Number(draft.canvasHeight) || 1920;
    
    let previewWidth = savedCanvasWidth;
    let previewHeight = savedCanvasHeight;
    
    // Apply same scaling as Create page save
    if (previewWidth > MAX_PREVIEW_WIDTH) {
      const scale = MAX_PREVIEW_WIDTH / previewWidth;
      previewWidth = Math.round(previewWidth * scale);
      previewHeight = Math.round(previewHeight * scale);
    }
    
    // Scale down further for 3-column grid layout (max 150px width per card)
    const MAX_CARD_WIDTH = 150;
    if (previewWidth > MAX_CARD_WIDTH) {
      const cardScale = MAX_CARD_WIDTH / previewWidth;
      previewWidth = Math.round(previewWidth * cardScale);
      previewHeight = Math.round(previewHeight * cardScale);
    }

    const previewContainerStyle = {
      width: `${previewWidth}px`,
      height: `${previewHeight}px`,
      position: "relative",
      overflow: "hidden"
    };

    console.log("🖼️ [Draft Card]", draft.id.slice(0, 8), {
      savedAspectRatio: draft.aspectRatio,
      canvasSize: `${draft.canvasWidth}×${draft.canvasHeight}`,
      numericRatio: Number.isFinite(numericRatio) ? numericRatio.toFixed(4) : "N/A",
      displayRatio,
      previewWidth,
      previewHeight,
    });

    const cardContainerStyle = {
      width: `${previewWidth}px`,
      display: 'inline-block'
    };

    return (
      <div
        key={draft.id}
        style={cardContainerStyle}
      >
        <div className="flex flex-col gap-3 overflow-hidden rounded-lg border border-[#e0b7a9]/40 bg-white p-3 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[#e0b7a9] hover:shadow-lg">
          <div
            className="relative"
            style={previewContainerStyle}
          >
          {draft.preview ? (
            <img
              src={draft.preview}
              alt={frameTitle}
              className="transition-transform duration-300 group-hover:scale-[1.02]"
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "cover",
                display: "block"
              }}
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                console.log("📷 Draft preview image loaded", draft.id.slice(0, 8), {
                  naturalWidth,
                  naturalHeight,
                  ratio: naturalWidth && naturalHeight ? (naturalWidth / naturalHeight).toFixed(4) : "N/A",
                });
              }}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-500">
              Tidak ada preview
            </div>
          )}
          {/* Aspect ratio badge */}
          <div className="absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {displayRatio}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleUseDraft(draft)}
            className="w-full rounded-md border border-[#a2665a] bg-[#a2665a] px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#8f564d] hover:border-[#8f564d] active:scale-95"
          >
            Gunakan Frame
          </button>
          <button
            type="button"
            onClick={() => handleDeleteDraft(draft.id)}
            disabled={deletingId === draft.id}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50 hover:border-red-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingId === draft.id ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Draft Frame Kamu</h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Semua frame kustom yang kamu simpan akan muncul di sini. Lanjutkan edit atau langsung gunakan saat Take Moment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/create"
              className="inline-flex items-center justify-center rounded-md border border-[#e0b7a9] bg-white px-4 py-2 text-sm font-semibold text-[#a2665a] shadow-sm transition-all hover:bg-[#ffe8df]"
            >
              Buat draft baru
            </Link>
            <button
              type="button"
              onClick={reloadDrafts}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-20 flex flex-col items-center gap-2 text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            <span className="text-sm">Memuat draft...</span>
          </div>
        ) : sortedDrafts.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[#e0b7a9]/70 bg-white/80 px-6 py-12 text-center text-slate-600">
            <p className="text-base font-semibold">Belum ada draft tersimpan.</p>
            <p className="max-w-md text-sm">
              Buat frame pertama kamu di halaman Create, lalu simpan untuk digunakan kembali di Take Moment.
            </p>
            <Link
              to="/create"
              className="inline-flex items-center justify-center rounded-md bg-[#a2665a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#8f564d]"
            >
              Mulai buat frame pertama kamu
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid auto-rows-fr grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
            {sortedDrafts.map((draft) => renderDraftCard(draft))}
          </div>
        )}
      </div>
    </section>
  );
}
