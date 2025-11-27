/**
 * Supabase Database Service
 * Handles database operations with Supabase PostgreSQL
 */

import { supabase, isSupabaseConfigured } from '../config/supabase.js';

// Table names
export const TABLES = {
  PROFILES: 'profiles',
  FRAMES: 'frames',
  USER_FRAMES: 'user_frames',
  MOMENTS: 'moments',
  AFFILIATES: 'affiliates',
  CONTACT_MESSAGES: 'contact_messages',
  NOTIFICATIONS: 'notifications'
};

/**
 * Generic CRUD operations
 */

/**
 * Get all records from a table
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function getAll(table, options = {}) {
  try {
    if (!isSupabaseConfigured) {
      return getFromLocalStorage(table);
    }

    let query = supabase.from(table).select('*');

    // Apply filters
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query = query.eq(key, value);
      }
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, { 
        ascending: options.ascending ?? false 
      });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Error in getAll ${table}:`, error);
    return getFromLocalStorage(table);
  }
}

/**
 * Get single record by ID
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<Object|null>}
 */
export async function getById(table, id) {
  try {
    if (!isSupabaseConfigured) {
      const records = getFromLocalStorage(table);
      return records.find(r => r.id === id) || null;
    }

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching ${table} by ID:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error in getById ${table}:`, error);
    return null;
  }
}

/**
 * Create new record
 * @param {string} table - Table name
 * @param {Object} data - Record data
 * @returns {Promise<Object>} { data, error }
 */
export async function create(table, record) {
  try {
    if (!isSupabaseConfigured) {
      return createInLocalStorage(table, record);
    }

    const { data, error } = await supabase
      .from(table)
      .insert({
        ...record,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Error creating in ${table}:`, error);
    return { data: null, error: error.message };
  }
}

/**
 * Update record
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} { data, error }
 */
export async function update(table, id, updates) {
  try {
    if (!isSupabaseConfigured) {
      return updateInLocalStorage(table, id, updates);
    }

    const { data, error } = await supabase
      .from(table)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Error updating ${table}:`, error);
    return { data: null, error: error.message };
  }
}

/**
 * Delete record
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<Object>} { success, error }
 */
export async function remove(table, id) {
  try {
    if (!isSupabaseConfigured) {
      return removeFromLocalStorage(table, id);
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Query records with filters
 * @param {string} table - Table name
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>}
 */
export async function query(table, filters = {}) {
  try {
    if (!isSupabaseConfigured) {
      const records = getFromLocalStorage(table);
      return records.filter(record => {
        return Object.entries(filters).every(([key, value]) => {
          return record[key] === value;
        });
      });
    }

    let q = supabase.from(table).select('*');

    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        q = q.in(key, value);
      } else {
        q = q.eq(key, value);
      }
    }

    const { data, error } = await q;

    if (error) {
      console.error(`Error querying ${table}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Error in query ${table}:`, error);
    return [];
  }
}

/**
 * Search records
 * @param {string} table - Table name
 * @param {string} column - Column to search
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>}
 */
export async function search(table, column, searchTerm) {
  try {
    if (!isSupabaseConfigured) {
      const records = getFromLocalStorage(table);
      return records.filter(record => {
        const value = record[column];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    }

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .ilike(column, `%${searchTerm}%`);

    if (error) {
      console.error(`Error searching ${table}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Error in search ${table}:`, error);
    return [];
  }
}

/**
 * Count records
 * @param {string} table - Table name
 * @param {Object} filters - Optional filters
 * @returns {Promise<number>}
 */
export async function count(table, filters = {}) {
  try {
    if (!isSupabaseConfigured) {
      const records = getFromLocalStorage(table);
      if (Object.keys(filters).length === 0) {
        return records.length;
      }
      return records.filter(record => {
        return Object.entries(filters).every(([key, value]) => record[key] === value);
      }).length;
    }

    let query = supabase.from(table).select('*', { count: 'exact', head: true });

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { count: total, error } = await query;

    if (error) {
      console.error(`Error counting ${table}:`, error);
      return 0;
    }

    return total || 0;
  } catch (error) {
    console.error(`Error in count ${table}:`, error);
    return 0;
  }
}

// LocalStorage helper functions
function getStorageKey(table) {
  return `fremio_${table}`;
}

function getFromLocalStorage(table) {
  try {
    const stored = localStorage.getItem(getStorageKey(table));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(table, data) {
  try {
    localStorage.setItem(getStorageKey(table), JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage:`, error);
  }
}

function createInLocalStorage(table, record) {
  const records = getFromLocalStorage(table);
  const newRecord = {
    id: `${table}_${Date.now()}`,
    ...record,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  records.push(newRecord);
  saveToLocalStorage(table, records);
  return { data: newRecord, error: null };
}

function updateInLocalStorage(table, id, updates) {
  const records = getFromLocalStorage(table);
  const index = records.findIndex(r => r.id === id);
  
  if (index === -1) {
    return { data: null, error: 'Record not found' };
  }

  records[index] = {
    ...records[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  saveToLocalStorage(table, records);
  return { data: records[index], error: null };
}

function removeFromLocalStorage(table, id) {
  const records = getFromLocalStorage(table);
  const filtered = records.filter(r => r.id !== id);
  
  if (filtered.length === records.length) {
    return { success: false, error: 'Record not found' };
  }

  saveToLocalStorage(table, filtered);
  return { success: true, error: null };
}

export default {
  TABLES,
  getAll,
  getById,
  create,
  update,
  remove,
  query,
  search,
  count
};
