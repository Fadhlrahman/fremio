// ============================================
// UNIFIED USER SERVICE
// Admin user management - VPS or localStorage
// ============================================

import { isVPSMode, VPS_API_URL } from '../config/backend';

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  KREATOR: 'kreator',
  USER: 'user'
};

// VPS User Client
class VPSUserClient {
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

  async getAllUsers() {
    try {
      const data = await this.request('/users');
      return data.users || [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getUserById(id) {
    try {
      return await this.request(`/users/${id}`);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async updateUserRole(userId, newRole) {
    try {
      const data = await this.request(`/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateUserStatus(userId, isActive) {
    try {
      const data = await this.request(`/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive })
      });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteUser(userId) {
    try {
      const data = await this.request(`/users/${userId}`, {
        method: 'DELETE'
      });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async banUser(userId, reason = '') {
    return await this.updateUserStatus(userId, false);
  }

  async unbanUser(userId) {
    return await this.updateUserStatus(userId, true);
  }
}

// LocalStorage User Client
class LocalStorageUserClient {
  constructor() {
    this.storageKey = 'fremio_all_users';
  }

  getUsers() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveUsers(users) {
    localStorage.setItem(this.storageKey, JSON.stringify(users));
  }

  async getAllUsers() {
    return this.getUsers();
  }

  async getUserById(id) {
    const users = this.getUsers();
    return users.find(u => u.id === id || u.uid === id) || null;
  }

  async updateUserRole(userId, newRole) {
    if (!Object.values(USER_ROLES).includes(newRole)) {
      return { success: false, message: 'Invalid role' };
    }
    
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId || u.uid === userId);
    if (index === -1) return { success: false, message: 'User not found' };

    users[index].role = newRole;
    users[index].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    return { success: true, message: `User role updated to ${newRole}` };
  }

  async banUser(userId, reason = '') {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId || u.uid === userId);
    if (index === -1) return { success: false, message: 'User not found' };

    users[index].status = 'banned';
    users[index].banReason = reason;
    users[index].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    return { success: true, message: 'User banned successfully' };
  }

  async unbanUser(userId) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId || u.uid === userId);
    if (index === -1) return { success: false, message: 'User not found' };

    users[index].status = 'active';
    users[index].banReason = null;
    users[index].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    return { success: true, message: 'User unbanned successfully' };
  }

  async deleteUser(userId) {
    const users = this.getUsers();
    const filtered = users.filter(u => u.id !== userId && u.uid !== userId);
    this.saveUsers(filtered);
    return { success: true, message: 'User deleted successfully' };
  }

  saveUserToStorage(userData) {
    const users = this.getUsers();
    const existingIndex = users.findIndex(
      u => u.email === userData.email || u.id === userData.id
    );

    const userToSave = {
      id: userData.id || userData.uid || `user_${Date.now()}`,
      uid: userData.uid,
      email: userData.email,
      name: userData.name || userData.displayName || '',
      displayName: userData.displayName || userData.name || '',
      role: userData.role || USER_ROLES.USER,
      status: userData.status || 'active',
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      users[existingIndex] = { ...users[existingIndex], ...userToSave };
    } else {
      users.push(userToSave);
    }

    this.saveUsers(users);
    return userToSave;
  }
}

// Create clients
const vpsClient = new VPSUserClient();
const localClient = new LocalStorageUserClient();

// Unified user service
const unifiedUserService = {
  USER_ROLES,

  // Get all users (admin)
  async getAllUsers() {
    if (isVPSMode()) {
      return await vpsClient.getAllUsers();
    }
    return await localClient.getAllUsers();
  },

  // Get user by ID
  async getUserById(userId) {
    if (isVPSMode()) {
      return await vpsClient.getUserById(userId);
    }
    return await localClient.getUserById(userId);
  },

  // Update user role
  async updateUserRole(userId, newRole, adminId = null) {
    if (isVPSMode()) {
      return await vpsClient.updateUserRole(userId, newRole);
    }
    return await localClient.updateUserRole(userId, newRole);
  },

  // Ban user
  async banUser(userId, adminId = null, reason = '') {
    if (isVPSMode()) {
      return await vpsClient.banUser(userId, reason);
    }
    return await localClient.banUser(userId, reason);
  },

  // Unban user
  async unbanUser(userId, adminId = null) {
    if (isVPSMode()) {
      return await vpsClient.unbanUser(userId);
    }
    return await localClient.unbanUser(userId);
  },

  // Delete user
  async deleteUser(userId, adminId = null) {
    if (isVPSMode()) {
      return await vpsClient.deleteUser(userId);
    }
    return await localClient.deleteUser(userId);
  },

  // Save user to storage (registration/login)
  saveUserToStorage(userData) {
    return localClient.saveUserToStorage(userData);
  },

  // Get users by role
  async getUsersByRole(role) {
    const users = await this.getAllUsers();
    return users.filter(u => u.role === role);
  },

  // Get users by status
  async getUsersByStatus(status) {
    const users = await this.getAllUsers();
    return users.filter(u => u.status === status);
  },

  // Check mode
  isVPSMode() {
    return isVPSMode();
  }
};

export default unifiedUserService;
export { VPSUserClient, LocalStorageUserClient };

// Named exports for compatibility
export const getAllUsers = unifiedUserService.getAllUsers.bind(unifiedUserService);
export const getUserById = unifiedUserService.getUserById.bind(unifiedUserService);
export const updateUserRole = unifiedUserService.updateUserRole.bind(unifiedUserService);
export const banUser = unifiedUserService.banUser.bind(unifiedUserService);
export const unbanUser = unifiedUserService.unbanUser.bind(unifiedUserService);
export const deleteUser = unifiedUserService.deleteUser.bind(unifiedUserService);
export const saveUserToStorage = unifiedUserService.saveUserToStorage.bind(unifiedUserService);
export const getUsersByRole = unifiedUserService.getUsersByRole.bind(unifiedUserService);
export const getUsersByStatus = unifiedUserService.getUsersByStatus.bind(unifiedUserService);
