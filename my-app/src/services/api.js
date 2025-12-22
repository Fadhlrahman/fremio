// ============================================
// API BASE CLIENT
// Fremio - VPS Backend Connection
// ============================================

import { VPS_API_URL } from "../config/backend";

const API_BASE_URL = VPS_API_URL;

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Get stored token (try both keys for compatibility)
    getToken() {
        return localStorage.getItem('fremio_token') || localStorage.getItem('auth_token');
    }

    // Set token after login
    setToken(token) {
        localStorage.setItem('fremio_token', token);
        localStorage.setItem('auth_token', token); // backward compat
    }

    // Remove token on logout
    removeToken() {
        localStorage.removeItem('fremio_token');
        localStorage.removeItem('auth_token');
    }

    // Build headers
    getHeaders(includeAuth = true, isFormData = false) {
        const headers = {};
        
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        
        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    }

    // Handle response
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        const data = isJson ? await response.json() : await response.text();
        
        if (!response.ok) {
            if (response.status === 401) {
                this.removeToken();
                window.location.href = '/login';
            }
            throw new Error(data.error || data.message || 'Request failed');
        }
        
        return data;
    }

    // GET request
    async get(endpoint, includeAuth = true) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(includeAuth)
        });
        return this.handleResponse(response);
    }

    // POST request
    async post(endpoint, data, includeAuth = true) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(includeAuth),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    // PUT request
    async put(endpoint, data, includeAuth = true) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(includeAuth),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    // DELETE request
    async delete(endpoint, includeAuth = true) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(includeAuth)
        });
        return this.handleResponse(response);
    }

    // Upload file
    async upload(endpoint, formData, includeAuth = true) {
        const headers = this.getHeaders(includeAuth, true);
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData
        });
        return this.handleResponse(response);
    }
}

// Singleton instance
const api = new ApiClient();

export default api;
export { api, API_BASE_URL };
