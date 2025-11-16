// FremioSeries Imports
import FremioSeriesBlue2 from "../assets/frames/FremioSeries/FremioSeries-2/FremioSeries-blue-2.png";
import FremioSeriesBabyblue3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-babyblue-3.png";
import FremioSeriesBlack3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-black-3.png";
import FremioSeriesBlue3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-blue-3.png";
import FremioSeriesCream3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-cream-3.png";
import FremioSeriesGreen3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-green-3.png";
import FremioSeriesMaroon3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-maroon-3.png";
import FremioSeriesOrange3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-orange-3.png";
import FremioSeriesPink3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-pink-3.png";
import FremioSeriesPurple3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-purple-3.png";
import FremioSeriesWhite3 from "../assets/frames/FremioSeries/FremioSeries-3/FremioSeries-white-3.png";
import FremioSeriesBlue4 from "../assets/frames/FremioSeries/FremioSeries-4/FremioSeries-blue-4.png";
import SalPriadi from "../assets/frames/InspiredBy/Sal Priadi.png";
import InspiredBy7Des from "../assets/frames/InspiredBy/7 Des.png";
import InspiredByAbbeyRoad from "../assets/frames/InspiredBy/Abbey Road.png";
import InspiredByLagipulaHidupAkanBerakhir from "../assets/frames/InspiredBy/Lagipula Hidup Akan Berakhir.png";
import InspiredByMembangunDanMenghancurkan from "../assets/frames/InspiredBy/Membangun & Menghancurkan.png";
import InspiredByMenariDenganBayangan from "../assets/frames/InspiredBy/Menari dengan Bayangan.png";
import InspiredByPSILOVEYOU from "../assets/frames/InspiredBy/PS. I LOVE YOU.png";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import frameProvider from "../utils/frameProvider.js";
import safeStorage from "../utils/safeStorage.js";
import { getAllCustomFrames } from "../services/customFrameService";

const frames = [
  // FremioSeries Frames
  {
    id: "FremioSeries-babyblue-3",
    title: "Fremio Series Baby Blue",
    description: "",
    img: FremioSeriesBabyblue3,
    maxCaptures: 3,
  },
  {
    id: "FremioSeries-black-3",
    title: "Fremio Series Black",
    description: "",
    img: FremioSeriesBlack3,
    maxCaptures: 3,
  },
  {
    id: "FremioSeries-cream-3",
    title: "Fremio Series Cream",
    description: "",
    img: FremioSeriesCream3,
    maxCaptures: 3,
  },
  {
    id: "FremioSeries-orange-3",
    title: "Fremio Series Orange",
    description: "",
    img: FremioSeriesOrange3,
    maxCaptures: 3,
  },
  {
    id: "FremioSeries-pink-3",
    title: "Fremio Series Pink",
    description: "",
    img: FremioSeriesPink3,
    maxCaptures: 3,
  },
  {
    id: "FremioSeries-purple-3",
    title: "Fremio Series Purple",
    description: "",
    img: FremioSeriesPurple3,
    maxCaptures: 3,
  },
  {
    id: "FremioSeries-white-3",
    title: "Fremio Series White",
    description: "",
    img: FremioSeriesWhite3,
    maxCaptures: 3,
  },
  {
    id: "FremioSeries-blue-4",
    title: "Fremio Series Blue",
    description: "",
    img: FremioSeriesBlue4,
    maxCaptures: 4,
  },
  {
    id: "SalPriadi",
    title: "Sal Priadi",
    description: "",
    img: SalPriadi,
    maxCaptures: 3,
  },
  {
    id: "InspiredBy-7Des",
    title: "Inspired By 7 Des",
    description: "",
    img: InspiredBy7Des,
    maxCaptures: 4,
  },
  {
    id: "InspiredBy-AbbeyRoad",
    title: "Inspired By Abbey Road",
    description: "",
    img: InspiredByAbbeyRoad,
    maxCaptures: 3,
  },
  {
    id: "InspiredBy-LagipulaHidupAkanBerakhir",
    title: "Inspired By Lagipula Hidup Akan Berakhir",
    description: "",
    img: InspiredByLagipulaHidupAkanBerakhir,
    maxCaptures: 3,
  },
  {
    id: "InspiredBy-MembangunDanMenghancurkan",
    title: "Inspired By Membangun & Menghancurkan",
    description: "",
    img: InspiredByMembangunDanMenghancurkan,
    maxCaptures: 3,
  },
  {
    id: "InspiredBy-MenariDenganBayangan",
    title: "Inspired By Menari dengan Bayangan",
    description: "",
    img: InspiredByMenariDenganBayangan,
    maxCaptures: 3,
  },
  {
    id: "InspiredBy-PSILOVEYOU",
    title: "Inspired By PS. I LOVE YOU",
    description: "",
    img: InspiredByPSILOVEYOU,
    maxCaptures: 3,
  },
];

export default function Frames() {
  const navigate = useNavigate();
  const [customFrames, setCustomFrames] = useState([]);

  // Clear old frameConfig when entering Frames page
  // This ensures user always gets fresh frame selection
  useEffect(() => {
    console.log("🗑️ [Frames] Clearing old frame session to start fresh");

    // Clear frame-related data
    safeStorage.removeItem("frameConfig");
    safeStorage.removeItem("frameConfigTimestamp");
    safeStorage.removeItem("selectedFrame");

    // Clear captured media from previous session
    safeStorage.removeItem("capturedPhotos");
    safeStorage.removeItem("capturedVideos");

    // Don't clear activeDraftId - user might want to continue editing draft
    // Only clear frame-related data for fresh frame selection

    console.log(
      "✅ [Frames] Old session cleared, ready for fresh frame selection"
    );

    // Load custom frames from admin
    const loadedCustomFrames = getAllCustomFrames();
    console.log("📦 [Frames] Loaded custom frames:", loadedCustomFrames);
    setCustomFrames(loadedCustomFrames);
  }, []);

  // Mock data untuk creator frames - nanti bisa diganti dengan data real
  const creatorFrames = [
    {
      name: "Array",
      desc: "Frame A series - frame penuh detail estetik cocok untuk momen premium",
      img: FremioSeriesBlue3,
    },
    {
      name: "Arsil",
      desc: "Frame A modern - desain minimalis dengan sentuhan warna yang tenang",
      img: FremioSeriesGreen3,
    },
    {
      name: "Sani",
      desc: "Frame S modern - gaya sketchy fun bagi yang suka unik menarik",
      img: FremioSeriesMaroon3,
    },
    {
      name: "Fremio Series Blue",
      desc: "Frame dengan desain klasik dan elegan",
      img: FremioSeriesBlue2,
    },
  ];

  const getFrameAspectClass = (count) => {
    switch (count) {
      case 2:
        return "aspect-[9/16]";
      case 4:
        return "aspect-[4/5]";
      default:
        return "aspect-[9/16]";
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Title */}
        <h2 className="mb-3 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Pilihan frame favorit dari creator{" "}
          <span className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-transparent">
            fremio
          </span>
        </h2>

        {/* Creator Frames - grid layout */}
        <div className="mt-8 mb-12">
          <div
            className="grid grid-cols-4 gap-4 px-2"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1rem",
            }}
          >
            {creatorFrames.map((frame, idx) => (
              <div
                key={idx}
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
                    src={frame.img}
                    alt={frame.name}
                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                    style={{
                      height: "100%",
                      width: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                {/* Frame Info */}
                <div>
                  <h3
                    className="text-center font-bold text-slate-900 truncate"
                    style={{ fontSize: "12px" }}
                  >
                    {frame.name}
                  </h3>
                </div>

                {/* Lihat Frame Button */}
                <div className="flex justify-center w-full">
                  <button
                    className="group/btn relative overflow-hidden rounded-md border-2 border-slate-300 bg-white font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:shadow-md active:scale-95"
                    style={{ fontSize: "11px", padding: "8px 16px" }}
                    onClick={async () => {
                      const frameId = frames[idx % frames.length].id;
                      const success = await frameProvider.setFrame(frameId);
                      if (success !== false) {
                        navigate("/take-moment");
                      } else {
                        alert("Error: Gagal memilih frame");
                      }
                    }}
                  >
                    <span className="relative z-10">Lihat Frame</span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-100 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-12 flex items-center justify-center">
          <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#e0b7a9]/40 to-transparent" />
        </div>

        {/* Custom Frames from Admin - if any */}
        {customFrames.length > 0 && (
          <>
            <h3 className="mb-8 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              Custom Frames
              <span className="ml-2 inline-block rounded-full bg-gradient-to-r from-[#e0b7a9] to-[#c89585] px-3 py-1 text-sm font-semibold text-white">
                Admin Upload
              </span>
            </h3>

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
                  className="group relative flex flex-col gap-2 overflow-hidden rounded-lg border-2 border-[#e0b7a9] bg-gradient-to-br from-[#fef9f7] to-white p-3 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Custom Badge */}
                  <div className="absolute top-2 right-2 z-10 rounded-full bg-gradient-to-r from-[#e0b7a9] to-[#c89585] px-2 py-1 text-[9px] font-bold text-white shadow-md">
                    CUSTOM
                  </div>

                  {/* Frame Image */}
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-gray-50 to-gray-100"
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
                      className="group/btn relative overflow-hidden rounded-md border-2 border-[#e0b7a9] bg-gradient-to-r from-[#e0b7a9] to-[#c89585] font-semibold text-white shadow-sm transition-all hover:shadow-lg active:scale-95"
                      style={{ fontSize: "11px", padding: "8px 16px" }}
                      onClick={async () => {
                        // For custom frames, we need to register them first
                        const success = await frameProvider.setCustomFrame(
                          frame
                        );
                        if (success !== false) {
                          navigate("/take-moment");
                        } else {
                          alert("Error: Gagal memilih frame");
                        }
                      }}
                    >
                      <span className="relative z-10">Lihat Frame</span>
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover/btn:translate-x-full" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Another Divider */}
            <div className="my-12 flex items-center justify-center">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#e0b7a9]/40 to-transparent" />
            </div>
          </>
        )}

        {/* All Frames Section Title */}
        <h3 className="mb-8 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Semua Frame
        </h3>

        {/* All Frames - grid layout */}
        <div
          className="grid grid-cols-4 gap-4 px-2"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
        >
          {frames.map((frame) => (
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
                  src={frame.img}
                  alt={frame.title}
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
                  {frame.title}
                </h4>
                <p className="mt-1 text-slate-500" style={{ fontSize: "10px" }}>
                  {frame.maxCaptures} captures
                </p>
              </div>

              {/* Lihat Frame Button */}
              <div className="flex justify-center w-full">
                <button
                  className="group/btn relative overflow-hidden rounded-md border-2 border-slate-300 bg-white font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:shadow-md active:scale-95"
                  style={{ fontSize: "11px", padding: "8px 16px" }}
                  onClick={async () => {
                    const success = await frameProvider.setFrame(frame.id);
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
      </div>
    </section>
  );
}
