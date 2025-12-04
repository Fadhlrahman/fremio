// ============================================
// AUTH SERVICE (VPS API)
// Authentication & User Management
// ============================================

import api from './api';

const authService = {
    // Register new user
    async register(email, password, displayName = '') {
        const data = await api.post('/auth/register', {
            email,
            password,
            displayName
        }, false);
        
        if (data.token) {
            api.setToken(data.token);
            this.setCurrentUser(data.user);
        }
        
        return data;
    },

    // Login user
    async login(email, password) {
        const data = await api.post('/auth/login', {
            email,
            password
        }, false);
        
        if (data.token) {
            api.setToken(data.token);
            this.setCurrentUser(data.user);
        }
        
        return data;
    },

    // Logout user
    async logout() {
        try {
            await api.post('/auth/logout', {});
        } catch (error) {
            console.log('Logout API error (non-critical):', error);
        } finally {
            api.removeToken();
            this.clearCurrentUser();
        }
    },

    // Get current user from API
    async getCurrentUser() {
        try {
            const token = api.getToken();
            if (!token) return null;
            
            const data = await api.get('/auth/me');
            this.setCurrentUser(data.user);
            return data.user;
        } catch (error) {
            console.error('Get current user error:', error);
            api.removeToken();
            this.clearCurrentUser();
            return null;
        }
    },

    // Get current user from localStorage (cached)
    getCachedUser() {
        const cached = localStorage.getItem('current_user');
        return cached ? JSON.parse(cached) : null;
    },

    // Set current user to localStorage
    setCurrentUser(user) {
        localStorage.setItem('current_user', JSON.stringify(user));
    },

    // Clear current user from localStorage
    clearCurrentUser() {
        localStorage.removeItem('current_user');
    },

    // Check if user is logged in
    isLoggedIn() {
        return !!api.getToken();
    },

    // Check if user is admin
    isAdmin() {
        const user = this.getCachedUser();
        return user?.role === 'admin';
    },

    // Update user profile
    async updateProfile(updates) {
        const data = await api.put('/auth/profile', updates);
        if (data.user) {
            this.setCurrentUser(data.user);
        }
        return data;
    },

    // Change password
    async changePassword(currentPassword, newPassword) {
        return await api.post('/auth/change-password', {
            currentPassword,
            newPassword
        });
    },

    // Forgot password (send reset email)
    async forgotPassword(email) {
        return await api.post('/auth/forgot-password', { email }, false);
    },

    // Reset password with token
    async resetPassword(token, newPassword) {
        return await api.post('/auth/reset-password', {
            token,
            newPassword
        }, false);
    }
};

export default authService;
