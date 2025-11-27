/**
 * Supabase Auth Service
 * Handles user authentication with Supabase
 */

import { supabase, isSupabaseConfigured } from '../config/supabase.js';

// LocalStorage keys
const USER_STORAGE_KEY = 'fremio_user';
const USERS_STORAGE_KEY = 'fremio_all_users';

/**
 * Sign up with email and password
 * @param {string} email 
 * @param {string} password 
 * @param {Object} userData - Additional user data (name, phone, etc.)
 * @returns {Promise<Object>} { user, error }
 */
export async function signUp(email, password, userData = {}) {
  try {
    if (!isSupabaseConfigured) {
      // LocalStorage mode
      return signUpLocalStorage(email, password, userData);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name || '',
          phone: userData.phone || '',
          role: 'user'
        }
      }
    });

    if (error) {
      return { user: null, error: error.message };
    }

    // Create profile in profiles table
    if (data.user) {
      await createUserProfile(data.user.id, {
        email,
        name: userData.name || '',
        phone: userData.phone || '',
        role: 'user',
        status: 'active'
      });
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign in with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} { user, error }
 */
export async function signIn(email, password) {
  try {
    if (!isSupabaseConfigured) {
      // LocalStorage mode
      return signInLocalStorage(email, password);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign out current user
 * @returns {Promise<Object>} { error }
 */
export async function signOut() {
  try {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: error.message };
  }
}

/**
 * Get current user
 * @returns {Promise<Object|null>} Current user or null
 */
export async function getCurrentUser() {
  try {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Get current session
 * @returns {Promise<Object|null>} Current session or null
 */
export async function getSession() {
  try {
    if (!isSupabaseConfigured) {
      const user = await getCurrentUser();
      return user ? { user } : null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

/**
 * Reset password
 * @param {string} email 
 * @returns {Promise<Object>} { error }
 */
export async function resetPassword(email) {
  try {
    if (!isSupabaseConfigured) {
      return { error: 'Password reset requires cloud configuration' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    return { error: error?.message || null };
  } catch (error) {
    console.error('Reset password error:', error);
    return { error: error.message };
  }
}

/**
 * Update password
 * @param {string} newPassword 
 * @returns {Promise<Object>} { error }
 */
export async function updatePassword(newPassword) {
  try {
    if (!isSupabaseConfigured) {
      return { error: 'Password update requires cloud configuration' };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return { error: error?.message || null };
  } catch (error) {
    console.error('Update password error:', error);
    return { error: error.message };
  }
}

/**
 * Update user profile
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} { user, error }
 */
export async function updateProfile(updates) {
  try {
    if (!isSupabaseConfigured) {
      // LocalStorage mode
      const user = await getCurrentUser();
      if (!user) return { user: null, error: 'No user logged in' };
      
      const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      return { user: updatedUser, error: null };
    }

    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) {
      return { user: null, error: error.message };
    }

    // Also update profile table
    const user = data.user;
    if (user) {
      await updateUserProfile(user.id, updates);
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Update profile error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured) {
    // For localStorage mode, just call callback with current user
    const user = localStorage.getItem(USER_STORAGE_KEY);
    callback(user ? JSON.parse(user) : null);
    return () => {}; // No-op unsubscribe
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(session?.user || null, event);
    }
  );

  return () => subscription.unsubscribe();
}

/**
 * Create user profile in database
 * @param {string} userId 
 * @param {Object} profileData 
 */
async function createUserProfile(userId, profileData) {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating profile:', error);
    }
  } catch (error) {
    console.error('Error creating profile:', error);
  }
}

/**
 * Update user profile in database
 * @param {string} userId 
 * @param {Object} updates 
 */
async function updateUserProfile(userId, updates) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
    }
  } catch (error) {
    console.error('Error updating profile:', error);
  }
}

/**
 * Get user profile from database
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(userId) {
  try {
    if (!isSupabaseConfigured) {
      const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
      return users.find(u => u.id === userId) || null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// LocalStorage helper functions
function signUpLocalStorage(email, password, userData) {
  const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return { user: null, error: 'User already exists' };
  }

  const newUser = {
    id: `user_${Date.now()}`,
    uid: `user_${Date.now()}`,
    email,
    password: btoa(password), // Simple encoding (not secure, just for demo)
    name: userData.name || '',
    displayName: userData.name || '',
    phone: userData.phone || '',
    role: users.length === 0 ? 'admin' : 'user', // First user is admin
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  
  // Set as current user (without password)
  const { password: _, ...userWithoutPassword } = newUser;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithoutPassword));

  return { user: userWithoutPassword, error: null };
}

function signInLocalStorage(email, password) {
  const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
  const user = users.find(u => u.email === email && u.password === btoa(password));

  if (!user) {
    return { user: null, error: 'Invalid email or password' };
  }

  if (user.status === 'banned') {
    return { user: null, error: 'Your account has been banned' };
  }

  // Set as current user (without password)
  const { password: _, ...userWithoutPassword } = user;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithoutPassword));

  return { user: userWithoutPassword, error: null };
}

export default {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getSession,
  resetPassword,
  updatePassword,
  updateProfile,
  onAuthStateChange,
  getUserProfile
};
