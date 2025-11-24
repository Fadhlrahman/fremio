/**
 * Frame Service - Scalable frame management system
 * Supports thousands of frames with lazy loading, caching, and pagination
 */

import { db } from '../config/firebase.js';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  startAfter
} from 'firebase/firestore';

class FrameService {
  constructor() {
    this.cache = new Map();
    this.apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.itemsPerPage = 20;
    this.categories = new Map();
    this.preloadedFrames = new Set([
      'FremioSeries-blue-2', 'FremioSeries-babyblue-3', 'FremioSeries-black-3',
      'FremioSeries-blue-3', 'FremioSeries-cream-3', 'FremioSeries-green-3',
      'FremioSeries-maroon-3', 'FremioSeries-orange-3', 'FremioSeries-pink-3',
      'FremioSeries-purple-3', 'FremioSeries-white-3', 'FremioSeries-blue-4'
    ]); // Most common frames
    this.lastVisible = null; // For pagination
  }

  /**
   * Get frames with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Items per page
   * @param {string} options.category - Frame category filter
   * @param {string} options.search - Search query
   * @param {string} options.sortBy - Sort field (name, popularity, date)
   * @param {string} options.sortOrder - Sort order (asc, desc)
   * @returns {Promise<Object>} Paginated frame data
   */
  // Get frames from Firestore with optional category, search, and pagination
  async getFrames(options = {}) {
    const {
      page = 1,
      limit = this.itemsPerPage,
      category = null,
      search = null,
      sortBy = 'popularity',
      sortOrder = 'desc'
    } = options;

    const cacheKey = this.generateCacheKey('frames', options);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const framesCol = collection(db, 'frames');
      let q = query(framesCol);
      if (category) {
        q = query(q, where('category', '==', category));
      }
      if (search) {
        // Firestore doesn't support full text search, so we filter after fetch
      }
      q = query(q, orderBy(sortBy, sortOrder === 'desc' ? 'desc' : 'asc'), fsLimit(limit));

      const snapshot = await getDocs(q);
      const frames = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        frames.push({ id: docSnap.id, ...data });
      });

      // Simple search filter (client-side)
      let filteredFrames = frames;
      if (search) {
        filteredFrames = frames.filter(f =>
          f.name?.toLowerCase().includes(search.toLowerCase()) ||
          f.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Pagination info (Firestore pagination is cursor-based, not page-based)
      const pagination = {
        page,
        limit,
        total: frames.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: page > 1
      };

      const result = {
        frames: filteredFrames,
        pagination,
        filters: { category, search }
      };
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('❌ Error fetching frames from Firestore:', error);
      return this.getFallbackFrames();
    }
  }

  /**
   * Get single frame configuration by ID
   * @param {string} frameId - Frame identifier
   * @returns {Promise<Object>} Frame configuration
   */
  // Get single frame by ID from Firestore
  async getFrameById(frameId) {
    const cacheKey = `frame_${frameId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    try {
      const frameRef = doc(db, 'frames', frameId);
      const docSnap = await getDoc(frameRef);
      if (docSnap.exists()) {
        const frame = { id: docSnap.id, ...docSnap.data() };
        this.cache.set(cacheKey, frame);
        return frame;
      }
      // Fallback to preloaded frame if not found
      if (this.preloadedFrames.has(frameId)) {
        const frame = await this.getPreloadedFrame(frameId);
        this.cache.set(cacheKey, frame);
        return frame;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error fetching frame ${frameId} from Firestore:`, error);
      return null;
    }
  }

  // Add new frame to Firestore (admin only)
  async addFrame(frameData) {
    try {
      const framesCol = collection(db, 'frames');
      const docRef = await addDoc(framesCol, frameData);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding frame to Firestore:', error);
      throw error;
    }
  }

  // Update frame in Firestore (admin only)
  async updateFrame(frameId, frameData) {
    try {
      const frameRef = doc(db, 'frames', frameId);
      await updateDoc(frameRef, frameData);
      return true;
    } catch (error) {
      console.error('❌ Error updating frame in Firestore:', error);
      throw error;
    }
  }

  // Delete frame from Firestore (admin only)
  async deleteFrame(frameId) {
    try {
      const frameRef = doc(db, 'frames', frameId);
      await deleteDoc(frameRef);
      return true;
    } catch (error) {
      console.error('❌ Error deleting frame from Firestore:', error);
      throw error;
    }
  }

  /**
   * Get frame categories for filtering
   * @returns {Promise<Array>} Available categories
   */
  async getCategories() {
    if (this.categories.size > 0) {
      return Array.from(this.categories.values());
    }

    try {
      // For development, return mock categories
      const categories = [
        { id: 'portrait', name: 'Portrait', count: 450 },
        { id: 'landscape', name: 'Landscape', count: 320 },
        { id: 'square', name: 'Square', count: 280 },
        { id: 'collage', name: 'Collage', count: 890 },
        { id: 'vintage', name: 'Vintage', count: 150 },
        { id: 'modern', name: 'Modern', count: 200 },
        { id: 'seasonal', name: 'Seasonal', count: 180 },
        { id: 'event', name: 'Event', count: 320 }
      ];

      categories.forEach(cat => this.categories.set(cat.id, cat));
      return categories;
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Search frames with autocomplete suggestions
   * @param {string} query - Search query
   * @param {number} limit - Max suggestions
   * @returns {Promise<Array>} Search suggestions
   */
  async searchFrames(query, limit = 10) {
    if (!query || query.length < 2) return [];

    const cacheKey = `search_${query}_${limit}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Mock search results
      const suggestions = [
        { id: 'wedding_classic', name: 'Wedding Classic', category: 'event' },
        { id: 'birthday_fun', name: 'Birthday Fun', category: 'event' },
        { id: 'vintage_polaroid', name: 'Vintage Polaroid', category: 'vintage' },
        { id: 'modern_grid', name: 'Modern Grid', category: 'modern' }
      ].filter(frame => 
        frame.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);

      this.cache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('❌ Error searching frames:', error);
      return [];
    }
  }

  /**
   * Preload popular frames for better performance
   */
  async preloadPopularFrames() {
    try {
      const popularFrames = [
        'FremioSeries-blue-2',
        'FremioSeries-blue-3',
        'FremioSeries-blue-4'
      ];
      
      const promises = popularFrames.map(frameId => 
        this.getFrameById(frameId)
      );

      await Promise.all(promises);
      console.log('✅ Popular frames preloaded');
    } catch (error) {
      console.error('❌ Error preloading frames:', error);
    }
  }

  /**
   * Clear cache (useful for memory management)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Frame cache cleared');
  }

  /**
   * Generate cache key from options
   */
  generateCacheKey(prefix, options) {
    const key = Object.entries(options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${prefix}_${key}`;
  }

  /**
   * Mock frames for development (will be replaced with API calls)
   */
  async getMockFrames(options) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const { page = 1, limit = 20, category = null, search = null } = options;
    
    // Generate mock frames
    const totalFrames = 2500; // Simulate thousands of frames
    const startIndex = (page - 1) * limit;
    
    const frames = [];
    for (let i = startIndex; i < Math.min(startIndex + limit, totalFrames); i++) {
      const frameId = `frame_${i + 1}`;
      const categories = ['portrait', 'landscape', 'square', 'collage', 'vintage', 'modern'];
      const randomCategory = categories[i % categories.length];
      
      // Skip if category filter doesn't match
      if (category && randomCategory !== category) continue;
      
      frames.push({
        id: frameId,
        name: `Frame ${i + 1}`,
        description: `Beautiful frame design #${i + 1}`,
        category: randomCategory,
        maxCaptures: (i % 4) + 2, // 2-5 captures
        thumbnailUrl: `/api/frames/${frameId}/thumbnail`,
        imageUrl: `/api/frames/${frameId}/image`,
        popularity: Math.floor(Math.random() * 1000),
        tags: ['photo', 'frame', randomCategory],
        createdAt: new Date(Date.now() - Math.random() * 31536000000), // Random date within last year
        slots: this.generateMockSlots((i % 4) + 2)
      });
    }

    return {
      frames,
      pagination: {
        page,
        limit,
        total: totalFrames,
        totalPages: Math.ceil(totalFrames / limit),
        hasNext: page * limit < totalFrames,
        hasPrev: page > 1
      },
      filters: {
        category,
        search
      }
    };
  }

  /**
   * Mock frame by ID for development
   */
  async getMockFrameById(frameId) {
    // Check if it's a legacy frame
    const legacyFrames = await this.getPreloadedFrame(frameId);
    if (legacyFrames) return legacyFrames;

    // Generate mock frame
    return {
      id: frameId,
      name: `Frame ${frameId}`,
      description: `Mock frame for ${frameId}`,
      category: 'modern',
      maxCaptures: 3,
      imageUrl: `/api/frames/${frameId}/image`,
      slots: this.generateMockSlots(3),
      layout: {
        aspectRatio: '9:16',
        orientation: 'portrait',
        backgroundColor: '#ffffff'
      }
    };
  }

  /**
   * Get preloaded frame configuration (legacy frames)
   */
  async getPreloadedFrame(frameId) {
    // Dynamic import for legacy frames
    try {
      const { getFrameConfig } = await import('../config/frameConfigs.js');
      return getFrameConfig(frameId);
    } catch (error) {
      console.error(`❌ Error loading preloaded frame ${frameId}:`, error);
      return null;
    }
  }

  /**
   * Generate mock slots for development
   */
  generateMockSlots(count) {
    const slots = [];
    for (let i = 0; i < count; i++) {
      slots.push({
        id: `slot_${i + 1}`,
        left: 0.1 + (i % 2) * 0.45,
        top: 0.1 + Math.floor(i / 2) * 0.4,
        width: 0.35,
        height: 0.35,
        aspectRatio: '4:5',
        zIndex: 2
      });
    }
    return slots;
  }

  /**
   * Fallback frames when API fails
   */
  getFallbackFrames() {
    return {
      frames: [
        {
          id: 'FremioSeries-blue-2',
          name: 'Fremio Series Blue 2 Foto',
          description: '2 slot foto vertikal - Blue Frame',
          category: 'portrait',
          maxCaptures: 2,
          thumbnailUrl: '/src/assets/frames/FremioSeries/FremioSeries-2/FremioSeries-blue-2.png'
        },
        {
          id: 'FremioSeries-blue-3',
          name: 'Fremio Series Blue 6 Foto',
          description: '3 foto x 2 = 6 slot photobooth klasik - Blue Frame',
          category: 'photobooth',
          maxCaptures: 3,
          thumbnailUrl: '/src/assets/frames/FremioSeries/FremioSeries-3/FremioSeries-blue-3.png'
        },
        {
          id: 'FremioSeries-blue-4',
          name: 'Fremio Series Blue 4 Foto',
          description: '4 slot foto grid 2x2 - Blue Frame',
          category: 'grid',
          maxCaptures: 4,
          thumbnailUrl: '/src/assets/frames/FremioSeries/FremioSeries-4/FremioSeries-blue-4.png'
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }
}

// Singleton instance
export const frameService = new FrameService();
export default frameService;