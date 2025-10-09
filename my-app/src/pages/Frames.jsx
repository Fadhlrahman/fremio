import Testframe1 from "../assets/Testframe1.png";
import Testframe2 from "../assets/Testframe2.png";
import Testframe3 from "../assets/Testframe3.png";
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
                onClick={() => {
                  console.log(`🎯 Selecting frame: ${frame.id}`);
                  
                  // Set frame menggunakan frameProvider
                  if (frameProvider.setFrame(frame.id)) {
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
