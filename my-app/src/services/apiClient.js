import axios from "axios";
import { getAuth } from "firebase/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

/**
 * Axios instance with auto token injection
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor - inject Firebase ID token
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const idToken = await user.getIdToken();
        config.headers.Authorization = `Bearer ${idToken}`;
      }
    } catch (error) {
      console.error("Failed to get auth token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handle errors
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401) {
        // Unauthorized - redirect to login
        console.error("Unauthorized access");
        window.location.href = "/login";
      } else if (status === 403) {
        // Forbidden
        console.error("Access denied:", data.message);
      } else if (status === 404) {
        console.error("Resource not found:", data.message);
      } else if (status >= 500) {
        console.error("Server error:", data.message);
      }
    } else if (error.request) {
      // Request made but no response
      console.error("Network error - no response from server");
    } else {
      console.error("Request setup error:", error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * API service methods
 */
export const api = {
  // Auth
  auth: {
    register: (data) => apiClient.post("/auth/register", data),
    getMe: () => apiClient.get("/auth/me"),
    updateProfile: (data) => apiClient.put("/auth/update-profile", data),
  },

  // Frames
  frames: {
    getAll: (params) => apiClient.get("/frames", { params }),
    getById: (id) => apiClient.get(`/frames/${id}`),
    create: (data) => apiClient.post("/frames", data),
    update: (id, data) => apiClient.put(`/frames/${id}`, data),
    delete: (id) => apiClient.delete(`/frames/${id}`),
    like: (id) => apiClient.post(`/frames/${id}/like`),
    upload: (formData) =>
      apiClient.post("/frames", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
  },

  // Drafts
  drafts: {
    getAll: (params) => apiClient.get("/drafts", { params }),
    getById: (id) => apiClient.get(`/drafts/${id}`),
    create: (data) => apiClient.post("/drafts", data),
    update: (id, data) => apiClient.put(`/drafts/${id}`, data),
    delete: (id) => apiClient.delete(`/drafts/${id}`),
  },

  // Upload
  upload: {
    image: (file, folder = "temp", generateThumbnail = false) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", folder);
      formData.append("generateThumbnail", generateThumbnail);
      return apiClient.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    images: (files, folder = "temp") => {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      formData.append("folder", folder);
      return apiClient.post("/upload/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    video: (file, folder = "temp") => {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("folder", folder);
      return apiClient.post("/upload/video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  },

  // Analytics
  analytics: {
    track: (data) => apiClient.post("/analytics/track", data),
    getFrameStats: (frameId) => apiClient.get(`/analytics/frame/${frameId}`),
    getOverview: () => apiClient.get("/analytics/overview"),
  },
};

export default apiClient;
