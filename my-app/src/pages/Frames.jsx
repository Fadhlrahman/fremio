
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

import { useNavigate } from "react-router-dom";
import frameProvider from '../utils/frameProvider.js';

const frames = [
  // FremioSeries Frames
  {
    id: "FremioSeries-blue-2",
    title: "Fremio Series Blue",
    description: "",
    img: FremioSeriesBlue2,
    maxCaptures: 2
  },
  {
    id: "FremioSeries-babyblue-3",
    title: "Fremio Series Baby Blue",
    description: "",
    img: FremioSeriesBabyblue3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-black-3",
    title: "Fremio Series Black",
    description: "",
    img: FremioSeriesBlack3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-blue-3",
    title: "Fremio Series Blue",
    description: "",
    img: FremioSeriesBlue3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-cream-3",
    title: "Fremio Series Cream",
    description: "",
    img: FremioSeriesCream3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-green-3",
    title: "Fremio Series Green",
    description: "",
    img: FremioSeriesGreen3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-maroon-3",
    title: "Fremio Series Maroon",
    description: "",
    img: FremioSeriesMaroon3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-orange-3",
    title: "Fremio Series Orange",
    description: "",
    img: FremioSeriesOrange3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-pink-3",
    title: "Fremio Series Pink",
    description: "",
    img: FremioSeriesPink3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-purple-3",
    title: "Fremio Series Purple",
    description: "",
    img: FremioSeriesPurple3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-white-3",
    title: "Fremio Series White",
    description: "",
    img: FremioSeriesWhite3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-blue-4",
    title: "Fremio Series Blue",
    description: "",
    img: FremioSeriesBlue4,
    maxCaptures: 4
  }
];

export default function Frames() {
  const navigate = useNavigate();
  return (
    <section className="container py-12 frames-page">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-3 mb-8 justify-center px-2">
        <button className="bg-white border rounded-full px-8 py-2 shadow text-lg font-medium">Creator</button>
        <button className="bg-[#e0b7a9] text-black rounded-full px-8 py-2 shadow text-lg font-medium">All frames</button>
      </div>
      {/* Title */}
      <h2 className="text-3xl font-bold text-center mb-10">
        Pilihan frame <span className="text-[#d9b9ab]">fremio</span>
      </h2>
      {/* Frames - horizontally scrollable */}
        <div className="frames-wrapper scroll-x">
          {frames.map((frame) => (
            <div key={frame.id} className="frame-card">
              <img src={frame.img} alt={frame.title} />
              <div className="frame-title">{frame.title}</div>
              {/* Description removed as requested; showing only title now */}
              <button
                className="bg-[#e0b7a9] text-black rounded-full px-3 py-1 mt-1 shadow font-medium text-xs"
                onClick={async () => {
                  console.log(`🎯 Selecting frame: ${frame.id}`);
                  
                  // Set frame menggunakan frameProvider (async)
                  const success = await frameProvider.setFrame(frame.id);
                  if (success !== false) {
                    console.log(`✅ Frame ${frame.id} berhasil dipilih`);
                    navigate("/take-moment");
                  } else {
                    console.error(`❌ Gagal memilih frame ${frame.id}`);
                    alert('Error: Gagal memilih frame');
                  }
                }}
              >
                Pilih Frame
              </button>
            </div>
          ))}
        </div>
    </section>
  );
}
