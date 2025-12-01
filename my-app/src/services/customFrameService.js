/**
 * Custom Frame Service - SIMPLIFIED
 * Sekarang langsung redirect ke frameService.js
 */

// Re-export semua dari frameService
export * from './frameService.js';
export { default } from './frameService.js';

// Legacy - kept for backwards compatibility check
import { isSupabaseConfigured as supabaseCheck } from '../config/supabase';
export const isSupabaseConfigured = supabaseCheck;
