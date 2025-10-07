import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadFrameConfig } from '../utils/frameConfigLoader';
import FramePreview from '../components/FramePreview';

export default function EditPhoto() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [frameConfig, setFrameConfig] = useState(null);
  const [activeToggle, setActiveToggle] = useState('filter');

  // Load photos and frame config on mount
  useEffect(() => {
    // Load photos from localStorage
    const savedPhotos = localStorage.getItem('capturedPhotos');
    if (savedPhotos) {
      try {
        setPhotos(JSON.parse(savedPhotos));
      } catch (e) {
        setPhotos([]);
      }
    }
    // Load selected frame config
    const selectedFrameId = localStorage.getItem('selectedFrame') || 'blue-vertical-3slot';
    loadFrameConfig(selectedFrameId).then(cfg => setFrameConfig(cfg));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f1eb] to-[#e8ddd4] p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">fremio</h1>
        <nav className="flex gap-8">
          <button onClick={() => navigate('/')} className="text-base text-gray-700 hover:underline bg-none border-none cursor-pointer">Home</button>
          <button onClick={() => navigate('/frames')} className="text-base text-gray-700 hover:underline bg-none border-none cursor-pointer">Frames</button>
          <span className="text-base text-gray-700 font-medium">My Profile</span>
        </nav>
      </div>
      {/* Main Layout */}
      <div className="grid grid-cols-[250px_1fr_250px] gap-8 max-w-6xl mx-auto">
        {/* Left Panel - Toggle Tools */}
        <div className="bg-white rounded-2xl p-6 h-fit">
          <h3 className="text-center mb-6 text-lg font-semibold text-gray-800">Toggle Tools</h3>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setActiveToggle('filter')}
              className={`rounded-xl px-4 py-3 text-base font-medium flex items-center gap-2 transition ${activeToggle === 'filter' ? 'bg-orange-200 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              <span className="text-xl">🎨</span> Filter
            </button>
            <button
              onClick={() => setActiveToggle('adjust')}
              className={`rounded-xl px-4 py-3 text-base font-medium flex items-center gap-2 transition ${activeToggle === 'adjust' ? 'bg-orange-200 text-white' : 'bg-gray-100 text-gray-800'}`}
            >
              <span className="text-xl">⚙️</span> Adjust
            </button>
          </div>
        </div>
        {/* Center Panel - Preview */}
        <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-gray-100 to-blue-100 rounded-2xl shadow-lg p-8">
          <h3 className="mb-6 text-xl font-semibold text-gray-800">Preview</h3>
          {frameConfig ? (
            <FramePreview photos={photos} frameConfig={frameConfig} />
          ) : (
            <div className="text-center text-gray-500">Frame config not loaded</div>
          )}
          {/* Save & Print Buttons */}
          <div className="flex gap-6 justify-center mt-8">
            <button className="border-2 border-orange-300 text-orange-400 rounded-full px-8 py-2 font-semibold bg-white hover:bg-orange-200 hover:text-white transition">Save</button>
            <button className="bg-orange-300 text-white rounded-full px-8 py-2 font-semibold hover:bg-orange-400 transition">Print</button>
          </div>
        </div>
        {/* Right Panel - Filter/Adjust */}
        <div className="bg-white rounded-2xl p-6 h-fit">
          <h3 className="text-center mb-6 text-lg font-semibold text-gray-800">{activeToggle === 'filter' ? 'Filter' : 'Adjustment'}</h3>
          {activeToggle === 'filter' ? (
            <div className="flex flex-col gap-4 text-center text-gray-500">
              <div className="p-6">Filter options will be displayed here</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-center text-gray-500">
              <div className="p-6">Adjustment controls will be displayed here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}