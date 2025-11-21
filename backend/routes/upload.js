import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  uploadImage,
  uploadVideo,
  uploadImages,
  handleUploadError,
} from "../middleware/upload.js";
import storageService from "../services/storageService.js";

const router = express.Router();

/**
 * POST /api/upload/image
 * Upload single image
 */
router.post(
  "/image",
  verifyToken,
  uploadImage,
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const { folder = "temp", generateThumbnail = false } = req.body;
      const userId = req.user.uid;
      const timestamp = Date.now();
      const basePath = `users/${userId}/${folder}/${timestamp}`;

      let imageUrl, thumbnailUrl;

      if (generateThumbnail === "true") {
        const result = await storageService.uploadImageWithThumbnail(
          req.file.buffer,
          basePath
        );
        imageUrl = result.imageUrl;
        thumbnailUrl = result.thumbnailUrl;
      } else {
        imageUrl = await storageService.uploadImage(
          req.file.buffer,
          `${basePath}.jpg`,
          {
            maxWidth: 1920,
            quality: 85,
          }
        );
      }

      res.json({
        success: true,
        message: "Image uploaded successfully",
        imageUrl,
        thumbnailUrl: thumbnailUrl || null,
      });
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload image",
      });
    }
  }
);

/**
 * POST /api/upload/images
 * Upload multiple images
 */
router.post(
  "/images",
  verifyToken,
  uploadImages,
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No image files provided",
        });
      }

      const { folder = "temp" } = req.body;
      const userId = req.user.uid;
      const uploadedImages = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const timestamp = Date.now();
        const path = `users/${userId}/${folder}/${timestamp}-${i}.jpg`;

        const imageUrl = await storageService.uploadImage(file.buffer, path, {
          maxWidth: 1920,
          quality: 85,
        });

        uploadedImages.push({
          url: imageUrl,
          originalName: file.originalname,
          size: file.size,
        });
      }

      res.json({
        success: true,
        message: `${uploadedImages.length} images uploaded successfully`,
        images: uploadedImages,
      });
    } catch (error) {
      console.error("Upload images error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload images",
      });
    }
  }
);

/**
 * POST /api/upload/video
 * Upload video
 */
router.post(
  "/video",
  verifyToken,
  uploadVideo,
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No video file provided",
        });
      }

      const { folder = "temp" } = req.body;
      const userId = req.user.uid;
      const timestamp = Date.now();
      const ext = req.file.mimetype.split("/")[1];
      const path = `users/${userId}/${folder}/${timestamp}.${ext}`;

      const videoUrl = await storageService.uploadFile(req.file.buffer, path, {
        contentType: req.file.mimetype,
        public: true,
      });

      res.json({
        success: true,
        message: "Video uploaded successfully",
        videoUrl,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (error) {
      console.error("Upload video error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload video",
      });
    }
  }
);

export default router;
