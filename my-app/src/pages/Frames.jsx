
import Testframe1 from "../assets/frames/Testframe1.png";
import Testframe2 from "../assets/frames/Testframe2.png";
import Testframe3 from "../assets/frames/Testframe3.png";

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
  {
    id: "Testframe1",
    title: "Frame 2 Foto",
    description: "2 slot foto vertikal",
    img: Testframe1,
    maxCaptures: 2
  },
  {
    id: "Testframe2", 
    title: "Frame 3 Foto",
    description: "3 slot foto vertikal",
    img: Testframe2,
    maxCaptures: 3
  },
  {
    id: "Testframe3",
    title: "Frame 4 Foto", 
    description: "4 slot foto grid",
    img: Testframe3,
    maxCaptures: 4
  },
  // FremioSeries Frames
  {
    id: "FremioSeries-blue-2",
    title: "FremioSeries Blue 2 Foto",
    description: "2 slot foto vertikal - Blue Frame",
    img: FremioSeriesBlue2,
    maxCaptures: 2
  },
  {
    id: "FremioSeries-babyblue-3",
    title: "FremioSeries Baby Blue 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesBabyblue3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-black-3",
    title: "FremioSeries Black 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesBlack3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-blue-3",
    title: "FremioSeries Blue 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesBlue3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-cream-3",
    title: "FremioSeries Cream 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesCream3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-green-3",
    title: "FremioSeries Green 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesGreen3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-maroon-3",
    title: "FremioSeries Maroon 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesMaroon3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-orange-3",
    title: "FremioSeries Orange 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesOrange3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-pink-3",
    title: "FremioSeries Pink 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesPink3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-purple-3",
    title: "FremioSeries Purple 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesPurple3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-white-3",
    title: "FremioSeries White 6 Foto",
    description: "3 foto x 2 = 6 slot photobooth klasik",
    img: FremioSeriesWhite3,
    maxCaptures: 3
  },
  {
    id: "FremioSeries-blue-4",
    title: "FremioSeries Blue 4 Foto",
    description: "4 slot foto grid 2x2",
    img: FremioSeriesBlue4,
    maxCaptures: 4
  }
];

export default function Frames() {
  const navigate = useNavigate();
  return (
    <section className="container py-12">
      {/* Filter Tabs */}
      <div className="flex gap-4 mb-8 justify-center">
        <button className="bg-white border rounded-full px-8 py-2 shadow text-lg font-medium">Creator</button>
        <button className="bg-[#e0b7a9] text-black rounded-full px-8 py-2 shadow text-lg font-medium">All frames</button>
      </div>
      {/* Title */}
      <h2 className="text-3xl font-bold text-center mb-10">
        Pilihan frame <span className="text-[#d9b9ab]">fremio</span>
      </h2>
      {/* Frames */}
        <div className="frames-wrapper">
          {frames.map((frame, idx) => (
            <div key={idx} className="frame-card">
              <img src={frame.img} alt={frame.title} />
              <div className="frame-title">{frame.title}</div>
              <div className="frame-description text-xs text-gray-600 mb-2">
                {frame.description} • Max {frame.maxCaptures} foto
              </div>
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