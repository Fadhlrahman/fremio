import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import { getAllCustomFrames } from "../services/customFrameService";
import { trackFrameView } from "../services/analyticsService";

export default function Frames() {
  const navigate = useNavigate();
  const [customFrames, setCustomFrames] = useState([]);

  // Clear old frameConfig when entering Frames page
  // This ensures user always gets fresh frame selection
  useEffect(() => {
    // Clear frame-related data
    safeStorage.removeItem("frameConfig");
    safeStorage.removeItem("frameConfigTimestamp");
    safeStorage.removeItem("selectedFrame");

    // Clear captured media from previous session
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");

    // Load custom frames from admin
    try {
      const loadedCustomFrames = getAllCustomFrames();
      console.log("🎨 Loading custom frames...");
      console.log("  - Custom frames count:", loadedCustomFrames.length);
      console.log("  - Custom frames data:", loadedCustomFrames);
      setCustomFrames(loadedCustomFrames);
    } catch (error) {
      console.error("❌ Error loading custom frames:", error);
      setCustomFrames([]);
    }
  }, []);

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Title */}
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Pilihan Frame dari{" "}
          <span className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-transparent">
            Admin Fremio
          </span>
        </h2>

        {/* Custom Frames from Admin */}
        {customFrames.length > 0 ? (
          <div
            className="grid grid-cols-4 gap-4 px-2 mb-12"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1rem",
            }}
          >
            {customFrames.map((frame) => (
              <div
                key={frame.id}
                className="group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-[#e0b7a9]/40 bg-white p-3 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[#e0b7a9] hover:shadow-lg"
              >
                {/* Frame Image */}
                <div
                  className="flex items-center justify-center overflow-hidden rounded-md bg-gray-50"
                  style={{
                    height: "200px",
                    width: "100%",
                  }}
                >
                  <img
                    src={frame.imagePath || frame.thumbnailUrl}
                    alt={frame.name}
                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                    style={{
                      height: "100%",
                      width: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                {/* Frame Title */}
                <div className="text-center">
                  <h4
                    className="font-bold text-slate-900 truncate"
                    style={{ fontSize: "12px" }}
                  >
                    {frame.name}
                  </h4>
                  <p
                    className="mt-1 text-slate-500"
                    style={{ fontSize: "10px" }}
                  >
                    {frame.maxCaptures} captures
                  </p>
                </div>

                {/* Lihat Frame Button */}
                <div className="flex justify-center w-full">
                  <button
                    className="group/btn relative overflow-hidden rounded-md border-2 border-slate-300 bg-white font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:shadow-md active:scale-95"
                    style={{ fontSize: "11px", padding: "8px 16px" }}
                    onClick={async () => {
                      // Track view before navigating
                      await trackFrameView(frame.id, null, frame.name);

                      // For custom frames, we need to register them first
                      const success = await frameProvider.setCustomFrame(frame);
                      if (success !== false) {
                        navigate("/take-moment");
                      } else {
                        alert("Error: Gagal memilih frame");
                      }
                    }}
                  >
                    <span className="relative z-10">Lihat Frame</span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-100 to-transparent transition-transform duration-500 group-hover/btn:translate-x-full" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-12 p-8 bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl text-center shadow-lg">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-4">
                <svg
                  className="w-10 h-10 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              Belum Ada Frame Tersedia
            </h3>
            <p className="text-base text-slate-600 mb-2 max-w-lg mx-auto leading-relaxed">
              Frame sedang dalam proses penambahan oleh admin.
            </p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Silahkan kembali lagi nanti untuk melihat koleksi frame yang
              tersedia! 🎨
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
