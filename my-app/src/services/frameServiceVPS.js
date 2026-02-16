// ============================================
// FRAME SERVICE (VPS API)
// Frame Management for VPS Backend
// ============================================

import api, { API_BASE_URL } from './api';
import { getUploadsBaseUrl } from '../config/backend';

const frameServiceVPS = {
    // Get all frames (public)
    async getAllFrames() {
        try {
            const data = await api.get('/frames', false);
            // Add full URL to image paths
            return data.frames.map(frame => ({
                ...frame,
                imageUrl: frame.image_path?.startsWith('http') 
                    ? frame.image_path 
                    : `${getUploadsBaseUrl()}${frame.image_path}`
            }));
        } catch (error) {
            console.error('Error getting frames:', error);
            return [];
        }
    },

    // Get frame by ID
    async getFrameById(id) {
        try {
            const data = await api.get(`/frames/${id}`, false);
            const frame = data.frame;
            return {
                ...frame,
                imageUrl: frame.image_path?.startsWith('http') 
                    ? frame.image_path 
                    : `${getUploadsBaseUrl()}${frame.image_path}`
            };
        } catch (error) {
            console.error('Error getting frame:', error);
            return null;
        }
    },

    // Create frame (Admin only)
    async createFrame(frameData) {
        return await api.post('/frames', frameData);
    },

    // Update frame (Admin only)
    async updateFrame(id, frameData) {
        return await api.put(`/frames/${id}`, frameData);
    },

    // Delete frame (Admin only)
    async deleteFrame(id) {
        return await api.delete(`/frames/${id}`);
    },

    // Upload frame image (Admin only)
    async uploadFrameImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        return await api.upload('/upload/frame', formData);
    },

    // Create frame with image upload (Admin)
    async createFrameWithImage(name, description, category, imageFile, slots = [], maxCaptures = 1) {
        // First upload the image
        const uploadResult = await this.uploadFrameImage(imageFile);
        
        // Then create the frame
        const frameData = {
            id: `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            category,
            image_path: uploadResult.path,
            slots,
            max_captures: maxCaptures
        };

        const result = await this.createFrame(frameData);
        
        return {
            ...result.frame,
            imageUrl: `${getUploadsBaseUrl()}${uploadResult.path}`
        };
    },

    // Increment download count
    async incrementDownload(id) {
        try {
            await api.post(`/frames/${id}/download`, {}, false);
        } catch (error) {
            console.error('Error incrementing download:', error);
        }
    },

    // Get frames by category
    async getFramesByCategory(category) {
        const frames = await this.getAllFrames();
        return frames.filter(f => f.category === category);
    },

    // Search frames
    async searchFrames(query) {
        const frames = await this.getAllFrames();
        const lowerQuery = query.toLowerCase();
        return frames.filter(f => 
            f.name.toLowerCase().includes(lowerQuery) ||
            f.description?.toLowerCase().includes(lowerQuery)
        );
    }
};

export default frameServiceVPS;
