/**
 * Package Service
 * For fetching package data from backend API
 */

import { getBackendURL } from "../config/backend";

const API_URL = getBackendURL();

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.token || null;
  } catch {
    return null;
  }
};

/**
 * Get all packages
 * @param {boolean} activeOnly - Only return active packages
 * @returns {Promise<Array>} Array of packages
 */
export const getAllPackages = async (activeOnly = false) => {
  try {
    const url = `${API_URL}/api/admin/packages${activeOnly ? "?activeOnly=true" : ""}`;
    const token = getAuthToken();

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      // If 401/403, return empty array instead of throwing
      if (response.status === 401 || response.status === 403) {
        console.warn("Not authorized to fetch packages");
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching packages:", error);
    return []; // Return empty array instead of throwing
  }
};

/**
 * Get package stats for dashboard
 * @returns {Promise<Object>} Package statistics
 */
export const getPackageStats = async () => {
  try {
    const packages = await getAllPackages();
    const activePackages = packages.filter((p) => p.is_active);

    return {
      totalPackages: packages.length,
      activePackages: activePackages.length,
      inactivePackages: packages.length - activePackages.length,
    };
  } catch (error) {
    console.error("Error fetching package stats:", error);
    return {
      totalPackages: 0,
      activePackages: 0,
      inactivePackages: 0,
    };
  }
};

export default {
  getAllPackages,
  getPackageStats,
};
