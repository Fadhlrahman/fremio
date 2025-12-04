// ============================================
// DRAFT SERVICE (VPS API)
// User Draft Management
// ============================================

import api, { API_BASE_URL } from './api';

const draftServiceVPS = {
    // Get all user's drafts
    async getAllDrafts() {
        try {
            const data = await api.get('/drafts');
            return data.drafts.map(draft => ({
                ...draft,
                thumbnailUrl: draft.thumbnail_path?.startsWith('http')
                    ? draft.thumbnail_path
                    : draft.thumbnail_path 
                        ? `${API_BASE_URL.replace('/api', '')}${draft.thumbnail_path}`
                        : null
            }));
        } catch (error) {
            console.error('Error getting drafts:', error);
            return [];
        }
    },

    // Get draft by ID
    async getDraftById(id) {
        try {
            const data = await api.get(`/drafts/${id}`);
            return {
                ...data.draft,
                thumbnailUrl: data.draft.thumbnail_path?.startsWith('http')
                    ? data.draft.thumbnail_path
                    : data.draft.thumbnail_path
                        ? `${API_BASE_URL.replace('/api', '')}${data.draft.thumbnail_path}`
                        : null
            };
        } catch (error) {
            console.error('Error getting draft:', error);
            return null;
        }
    },

    // Create new draft
    async createDraft(draftData) {
        const data = await api.post('/drafts', {
            name: draftData.name || 'Untitled',
            elements: draftData.elements || [],
            settings: draftData.settings || {},
            status: draftData.status || 'draft'
        });
        return data.draft;
    },

    // Update draft
    async updateDraft(id, updates) {
        const data = await api.put(`/drafts/${id}`, updates);
        return data.draft;
    },

    // Delete draft
    async deleteDraft(id) {
        return await api.delete(`/drafts/${id}`);
    },

    // Upload thumbnail
    async uploadThumbnail(file) {
        const formData = new FormData();
        formData.append('image', file);
        return await api.upload('/upload/thumbnail', formData);
    },

    // Upload thumbnail from data URL
    async uploadThumbnailFromDataUrl(dataUrl) {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'thumbnail.webp', { type: 'image/webp' });
        return await this.uploadThumbnail(file);
    },

    // Save draft with thumbnail
    async saveDraftWithThumbnail(id, draftData, thumbnailDataUrl) {
        // Upload thumbnail if provided
        if (thumbnailDataUrl) {
            const uploadResult = await this.uploadThumbnailFromDataUrl(thumbnailDataUrl);
            draftData.thumbnail_path = uploadResult.path;
        }
        
        // Update the draft
        if (id) {
            return await this.updateDraft(id, draftData);
        } else {
            return await this.createDraft(draftData);
        }
    },

    // Mark draft as completed
    async completeDraft(id) {
        return await this.updateDraft(id, { status: 'completed' });
    },

    // Get completed drafts
    async getCompletedDrafts() {
        const drafts = await this.getAllDrafts();
        return drafts.filter(d => d.status === 'completed');
    },

    // Get incomplete drafts
    async getIncompleteDrafts() {
        const drafts = await this.getAllDrafts();
        return drafts.filter(d => d.status === 'draft');
    },

    // Duplicate draft
    async duplicateDraft(id) {
        const original = await this.getDraftById(id);
        if (!original) throw new Error('Draft not found');
        
        return await this.createDraft({
            name: `${original.name} (Copy)`,
            elements: original.elements,
            settings: original.settings
        });
    }
};

export default draftServiceVPS;
