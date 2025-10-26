// Frame configurations untuk berbagai jenis photobooth frames
// File ini menyediakan akses sinkron ke konfigurasi FremioSeries

import FremioSeriesBlue2 from './frame-configs/FremioSeries-blue-2.js';
import FremioSeriesBabyblue3 from './frame-configs/FremioSeries-babyblue-3.js';
import FremioSeriesBlack3 from './frame-configs/FremioSeries-black-3.js';
import FremioSeriesBlue3 from './frame-configs/FremioSeries-blue-3.js';
import FremioSeriesCream3 from './frame-configs/FremioSeries-cream-3.js';
import FremioSeriesGreen3 from './frame-configs/FremioSeries-green-3.js';
import FremioSeriesMaroon3 from './frame-configs/FremioSeries-maroon-3.js';
import FremioSeriesOrange3 from './frame-configs/FremioSeries-orange-3.js';
import FremioSeriesPink3 from './frame-configs/FremioSeries-pink-3.js';
import FremioSeriesPurple3 from './frame-configs/FremioSeries-purple-3.js';
import FremioSeriesWhite3 from './frame-configs/FremioSeries-white-3.js';
import FremioSeriesBlue4 from './frame-configs/FremioSeries-blue-4.js';
import SalPriadi from './frame-configs/SalPriadi.js';
import InspiredBy7Des from './frame-configs/InspiredBy-7Des.js';
import InspiredByAbbeyRoad from './frame-configs/InspiredBy-AbbeyRoad.js';
import InspiredByLagipulaHidupAkanBerakhir from './frame-configs/InspiredBy-LagipulaHidupAkanBerakhir.js';
import InspiredByMembangunDanMenghancurkan from './frame-configs/InspiredBy-MembangunDanMenghancurkan.js';
import InspiredByMenariDenganBayangan from './frame-configs/InspiredBy-MenariDenganBayangan.js';
import InspiredByPSILOVEYOU from './frame-configs/InspiredBy-PSILOVEYOU.js';

export const FRAME_CONFIGS = {
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
  'FremioSeries-blue-4': FremioSeriesBlue4,
  'SalPriadi': SalPriadi,
  'InspiredBy-7Des': InspiredBy7Des,
  'InspiredBy-AbbeyRoad': InspiredByAbbeyRoad,
  'InspiredBy-LagipulaHidupAkanBerakhir': InspiredByLagipulaHidupAkanBerakhir,
  'InspiredBy-MembangunDanMenghancurkan': InspiredByMembangunDanMenghancurkan,
  'InspiredBy-MenariDenganBayangan': InspiredByMenariDenganBayangan,
  'InspiredBy-PSILOVEYOU': InspiredByPSILOVEYOU
};

// Helper function untuk mendapatkan konfigurasi frame berdasarkan nama
export const getFrameConfig = (frameName) => {
  return FRAME_CONFIGS[frameName] || null;
};

// Helper function untuk mendapatkan semua frame yang tersedia
export const getAllFrames = () => {
  return Object.values(FRAME_CONFIGS);
};

// Helper function untuk validasi frame
export const isValidFrame = (frameName) => {
  return frameName && Object.prototype.hasOwnProperty.call(FRAME_CONFIGS, frameName);
};