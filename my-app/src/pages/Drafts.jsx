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
    setActivatingId(draft.id);
    try {
      console.log('🎯 DRAFTS: handleUseDraft started');
      console.log('  - Draft ID:', draft.id);
      console.log('  - Draft title:', draft.title);
      
      const frameConfig = activateDraftFrame(draft);
      
      if (!frameConfig) {
        throw new Error('Failed to build frame config from draft');
      }
      
      console.log('🎯 DRAFTS: activateDraftFrame returned:');
      console.log('  - Frame ID:', frameConfig.id);
      console.log('  - Slots count:', frameConfig.slots?.length);
      console.log('  - Max captures:', frameConfig.maxCaptures);
      console.log('  - Has frameImage:', !!frameConfig.frameImage);
      
      const setFrameSuccess = await frameProvider.setFrame(frameConfig.id, {
        config: frameConfig,
        isCustom: true,
      });
      
      if (!setFrameSuccess) {
        throw new Error('frameProvider.setFrame returned false');
      }
      
      console.log('🎯 DRAFTS: frameProvider.setFrame completed');
      console.log('  - Current frame:', frameProvider.getCurrentFrameName());
      console.log('  - Current config:', frameProvider.getCurrentConfig());
      
      // Verify storage
      const storedFrameId = safeStorage.getItem('selectedFrame');
      const storedConfig = safeStorage.getJSON('frameConfig');
      console.log('🎯 DRAFTS: Storage verification:');
      console.log('  - selectedFrame in storage:', storedFrameId);
      console.log('  - frameConfig in storage:', storedConfig?.id);
      
      if (!storedFrameId || !storedConfig) {
        throw new Error('Frame config not properly saved to storage');
      }
      
      console.log('🎯 DRAFTS: Navigating to /take-moment...');
      navigate("/take-moment");
    } catch (error) {
      console.error("❌ DRAFTS: Failed to activate draft", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        draft: draft?.id
      });
      setErrorMessage(`Tidak bisa mengaktifkan draft: ${error.message}`);
    } finally {
      setActivatingId(null);
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

    // Build shared style objects
    const BASE_HEIGHT = 500;
    let previewHeight = BASE_HEIGHT;
    let previewWidth = Math.round((previewHeight * ratioWidth) / ratioHeight);
    const MAX_WIDTH = 380;

    if (previewWidth > MAX_WIDTH) {
      previewWidth = MAX_WIDTH;
      previewHeight = Math.round((previewWidth * ratioHeight) / ratioWidth);
    }

    const previewContainerStyle = {
      width: `${previewWidth}px`,
      height: `${previewHeight}px`,
      background: draft.canvasBackground || "#f8fafc",
      borderRadius: "16px",
      overflow: "hidden",
      position: "relative",
      boxShadow: "inset 0 0 0 1px rgba(17,24,39,0.06)",
      transition: "transform 0.3s ease",
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    };

    console.log("🖼️ [Draft Card]", draft.id.slice(0, 8), {
      savedAspectRatio: draft.aspectRatio,
      canvasSize: `${draft.canvasWidth}×${draft.canvasHeight}`,
      numericRatio: Number.isFinite(numericRatio) ? numericRatio.toFixed(4) : "N/A",
      displayRatio,
      previewWidth,
      previewHeight,
    });

    return (
      <div
        key={draft.id}
        className="group relative flex w-full max-w-[420px] flex-col gap-3 overflow-hidden rounded-lg border border-[#e0b7a9]/40 bg-white p-4 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[#e0b7a9] hover:shadow-lg"
        style={{ alignSelf: "stretch" }}
      >
        <div
          className="relative w-full"
          style={previewContainerStyle}
        >
          {draft.preview ? (
            <img
              src={draft.preview}
              alt={frameTitle}
              className="transition-transform duration-300 group-hover:scale-[1.02]"
              style={{ height: "100%", width: "auto", maxWidth: "100%", objectFit: "contain" }}
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

        <div className="flex w-full flex-col items-center gap-2 text-center">
          <button
            type="button"
            onClick={() => handleUseDraft(draft)}
            disabled={activatingId === draft.id || deletingId === draft.id}
            className="inline-flex min-w-[140px] items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-black shadow-sm transition-all hover:border-slate-400 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activatingId === draft.id ? "Menyiapkan..." : "Gunakan Frame"}
          </button>
          <Link
            to="/create"
            state={{ draftId: draft.id }}
            onClick={() => {
              safeStorage.setItem("activeDraftId", draft.id);
              if (draft.signature) {
                safeStorage.setItem("activeDraftSignature", draft.signature);
              } else {
                safeStorage.removeItem("activeDraftSignature");
              }
            }}
            className="inline-flex min-w-[140px] items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-black shadow-sm transition-all hover:border-slate-400 hover:shadow-md active:scale-95"
          >
            Lihat Frame
          </Link>
          <button
            type="button"
            onClick={() => handleDeleteDraft(draft.id)}
            disabled={deletingId === draft.id || activatingId === draft.id}
            className="inline-flex min-w-[140px] items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-black shadow-sm transition-all hover:border-slate-400 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingId === draft.id ? "Menghapus..." : "Hapus"}
          </button>
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
          <div
            className="mt-10 flex flex-wrap gap-8 px-2 justify-center"
          >
            {sortedDrafts.map((draft) => renderDraftCard(draft))}
          </div>
        )}
      </div>
    </section>
  );
}
