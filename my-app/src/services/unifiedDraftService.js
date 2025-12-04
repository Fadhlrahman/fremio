// ============================================
// UNIFIED DRAFT SERVICE
// Switches between localStorage/Firebase and VPS
// ============================================

import { isVPSMode, VPS_API_URL } from '../config/backend';

// VPS Draft Client
class VPSDraftClient {
  constructor() {
    this.baseUrl = VPS_API_URL;
  }

  getToken() {
    return localStorage.getItem('fremio_token') || localStorage.getItem('auth_token');
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  }

  async getAllDrafts() {
    try {
      const data = await this.request('/drafts');
      const drafts = Array.isArray(data) ? data : (data.drafts || []);
      return drafts.map(draft => ({
        ...draft,
        thumbnailUrl: draft.thumbnail_path?.startsWith('http')
          ? draft.thumbnail_path
          : draft.thumbnail_path
            ? `${this.baseUrl.replace('/api', '')}${draft.thumbnail_path}`
            : null
      }));
    } catch (error) {
      console.error('Error getting drafts:', error);
      return [];
    }
  }

  async getDraftById(id) {
    try {
      const data = await this.request(`/drafts/${id}`);
      const draft = data.draft || data;
      return {
        ...draft,
        thumbnailUrl: draft.thumbnail_path?.startsWith('http')
          ? draft.thumbnail_path
          : draft.thumbnail_path
            ? `${this.baseUrl.replace('/api', '')}${draft.thumbnail_path}`
            : null
      };
    } catch (error) {
      console.error('Error getting draft:', error);
      return null;
    }
  }

  async createDraft(draftData) {
    const data = await this.request('/drafts', {
      method: 'POST',
      body: JSON.stringify({
        name: draftData.name || 'Untitled',
        elements: draftData.elements || [],
        settings: draftData.settings || {},
        status: draftData.status || 'draft'
      })
    });
    return data.draft || data;
  }

  async updateDraft(id, updates) {
    const data = await this.request(`/drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return data.draft || data;
  }

  async deleteDraft(id) {
    return await this.request(`/drafts/${id}`, {
      method: 'DELETE'
    });
  }

  async uploadThumbnail(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/upload/thumbnail`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  }
}

// LocalStorage Draft Client (fallback)
class LocalStorageDraftClient {
  constructor() {
    this.storageKey = 'fremio_drafts';
  }

  getDrafts() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveDrafts(drafts) {
    localStorage.setItem(this.storageKey, JSON.stringify(drafts));
  }

  async getAllDrafts() {
    return this.getDrafts();
  }

  async getDraftById(id) {
    const drafts = this.getDrafts();
    return drafts.find(d => d.id === id) || null;
  }

  async createDraft(draftData) {
    const drafts = this.getDrafts();
    const newDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: draftData.name || 'Untitled',
      elements: draftData.elements || [],
      settings: draftData.settings || {},
      status: draftData.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    drafts.unshift(newDraft);
    this.saveDrafts(drafts);
    return newDraft;
  }

  async updateDraft(id, updates) {
    const drafts = this.getDrafts();
    const index = drafts.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Draft not found');
    
    drafts[index] = {
      ...drafts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveDrafts(drafts);
    return drafts[index];
  }

  async deleteDraft(id) {
    const drafts = this.getDrafts();
    const filtered = drafts.filter(d => d.id !== id);
    this.saveDrafts(filtered);
    return { success: true };
  }
}

// Create clients
const vpsClient = new VPSDraftClient();
const localClient = new LocalStorageDraftClient();

// Unified draft service
const unifiedDraftService = {
  // Get all drafts
  async getAllDrafts() {
    if (isVPSMode()) {
      return await vpsClient.getAllDrafts();
    }
    return await localClient.getAllDrafts();
  },

  // Get draft by ID
  async getDraftById(id) {
    if (isVPSMode()) {
      return await vpsClient.getDraftById(id);
    }
    return await localClient.getDraftById(id);
  },

  // Create draft
  async createDraft(draftData) {
    if (isVPSMode()) {
      return await vpsClient.createDraft(draftData);
    }
    return await localClient.createDraft(draftData);
  },

  // Update draft
  async updateDraft(id, updates) {
    if (isVPSMode()) {
      return await vpsClient.updateDraft(id, updates);
    }
    return await localClient.updateDraft(id, updates);
  },

  // Delete draft
  async deleteDraft(id) {
    if (isVPSMode()) {
      return await vpsClient.deleteDraft(id);
    }
    return await localClient.deleteDraft(id);
  },

  // Save draft with auto-create/update
  async saveDraft(draftData) {
    if (draftData.id) {
      return await this.updateDraft(draftData.id, draftData);
    }
    return await this.createDraft(draftData);
  },

  // Upload thumbnail (VPS only)
  async uploadThumbnail(file) {
    if (isVPSMode()) {
      return await vpsClient.uploadThumbnail(file);
    }
    // For localStorage mode, convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ thumbnailPath: reader.result });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Check mode
  isVPSMode() {
    return isVPSMode();
  }
};

export default unifiedDraftService;
export { VPSDraftClient, LocalStorageDraftClient };
