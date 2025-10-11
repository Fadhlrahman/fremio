
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import frameProvider from '../utils/frameProvider.js';
import { FRAME_REGISTRY, FRAME_METADATA } from '../config/frameConfigManager.js';

// Import all frame images dynamically
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

// Frame image mapping
const frameImages = {
  'FremioSeries-blue-2': FremioSeriesBlue2,
  'FremioSeries-babyblue-3': FremioSeriesBabyblue3,
  'FremioSeries-black-3': FremioSeriesBlack3,
  'FremioSeries-blue-3': FremioSeriesBlue3,
  'FremioSeries-cream-3': FremioSeriesCream3,
  'FremioSeries-green-3': FremioSeriesGreen3,
  'FremioSeries-maroon-3': FremioSeriesMaroon3,
  'FremioSeries-orange-3': FremioSeriesOrange3,
  'FremioSeries-pink-3': FremioSeriesPink3,
  'FremioSeries-purple-3': FremioSeriesPurple3,
  'FremioSeries-white-3': FremioSeriesWhite3,
  'FremioSeries-blue-4': FremioSeriesBlue4
};

export default function Frames() {
  const navigate = useNavigate();
  const [frames, setFrames] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    // Build frames array from metadata
    const framesData = FRAME_REGISTRY.map(frameId => {
      const metadata = FRAME_METADATA[frameId];
      return {
        id: frameId,
        title: metadata.name.replace('FremioSeries', 'Fremio Series'),
        description: metadata.description,
        img: frameImages[frameId],
        maxCaptures: metadata.maxCaptures,
        color: metadata.color,
        series: metadata.series
      };
    });
    setFrames(framesData);
  }, []);

  // Group frames by series for better organization
  const framesBySeries = frames.reduce((acc, frame) => {
    if (!acc[frame.series]) {
      acc[frame.series] = [];
    }
    acc[frame.series].push(frame);
    return acc;
  }, {});

  // Filter frames based on selected category
  const getFilteredFrames = () => {
    if (selectedCategory === 'all') return frames;
    return frames.filter(frame => frame.series === selectedCategory);
  };

  return (
    <section className="container py-12">
      {/* Filter Tabs */}
      <div className="flex gap-4 mb-8 justify-center">
        <button 
          className={`border rounded-full px-8 py-2 shadow text-lg font-medium ${
            selectedCategory === 'all' 
              ? 'bg-[#e0b7a9] text-black' 
              : 'bg-white text-gray-700'
          }`}
          onClick={() => setSelectedCategory('all')}
        >
          All Frames
        </button>
        <button 
          className={`border rounded-full px-8 py-2 shadow text-lg font-medium ${
            selectedCategory === 'FremioSeries-2' 
              ? 'bg-[#e0b7a9] text-black' 
              : 'bg-white text-gray-700'
          }`}
          onClick={() => setSelectedCategory('FremioSeries-2')}
        >
          4 Foto
        </button>
        <button 
          className={`border rounded-full px-8 py-2 shadow text-lg font-medium ${
            selectedCategory === 'FremioSeries-3' 
              ? 'bg-[#e0b7a9] text-black' 
              : 'bg-white text-gray-700'
          }`}
          onClick={() => setSelectedCategory('FremioSeries-3')}
        >
          6 Foto
        </button>
        <button 
          className={`border rounded-full px-8 py-2 shadow text-lg font-medium ${
            selectedCategory === 'FremioSeries-4' 
              ? 'bg-[#e0b7a9] text-black' 
              : 'bg-white text-gray-700'
          }`}
          onClick={() => setSelectedCategory('FremioSeries-4')}
        >
          8 Foto
        </button>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-center mb-10">
        Pilihan frame <span className="text-[#d9b9ab]">fremio</span>
      </h2>

      {/* Series Sections */}
      {selectedCategory === 'all' ? (
        Object.keys(framesBySeries).map(series => {
          const seriesTitle = series.replace('FremioSeries-', 'Fremio Series ');
          const isSeries3 = series === 'FremioSeries-3';
          
          return (
            <div key={series} className="mb-12">
              <h3 className="text-xl font-semibold text-center mb-6 text-gray-800">
                {seriesTitle}
              </h3>
              
              {isSeries3 ? (
                // Scrollable section for FremioSeries-3
                <div className="relative">
                  {/* Scrollable container */}
                  <div 
                    className="scrollable-frames overflow-x-auto"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
                  >
                    <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
                      {framesBySeries[series].map((frame, idx) => (
                        <div key={idx} className="frame-card flex-shrink-0" style={{ width: '200px' }}>
                          <img src={frame.img} alt={frame.title} />
                          <div className="frame-title">{frame.title}</div>
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
                  </div>
                </div>
              ) : (
                // Regular grid layout for other series
                <div className="frames-wrapper">
                  {framesBySeries[series].map((frame, idx) => (
                    <div key={idx} className="frame-card">
                      <img src={frame.img} alt={frame.title} />
                      <div className="frame-title">{frame.title}</div>
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
              )}
            </div>
          );
        })
      ) : (
        selectedCategory === 'FremioSeries-3' ? (
          // Scrollable layout for filtered FremioSeries-3 (6 foto)
          <div className="relative">
            <div 
              className="scrollable-frames overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
                {getFilteredFrames().map((frame, idx) => (
                  <div key={idx} className="frame-card flex-shrink-0" style={{ width: '200px' }}>
                    <img src={frame.img} alt={frame.title} />
                    <div className="frame-title">{frame.title}</div>
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
            </div>
          </div>
        ) : (
          // Regular grid layout for other filtered categories
          <div className="frames-wrapper">
            {getFilteredFrames().map((frame, idx) => (
              <div key={idx} className="frame-card">
                <img src={frame.img} alt={frame.title} />
                <div className="frame-title">{frame.title}</div>
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
        )
      )}
      </section>
  );
}