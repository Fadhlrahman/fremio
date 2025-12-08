import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE) || 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = parseInt(process.env.MAX_VIDEO_SIZE) || 50 * 1024 * 1024; // 50MB

// Memory storage for direct upload to Firebase Storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|webm|mov/;

  const extname = path.extname(file.originalname || '').toLowerCase();
  const mimetype = file.mimetype;

  if (file.fieldname === "image") {
    // Allow if mimetype is valid image, even without extension
    const isValidMimetype = mimetype && mimetype.startsWith("image/");
    const isValidExt = extname ? allowedImageTypes.test(extname.slice(1)) : true;

    if (isValidMimetype && isValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed"));
    }
  } else if (file.fieldname === "video") {
    const isValidVideo =
      allowedVideoTypes.test(extname.slice(1)) && mimetype.startsWith("video/");

    if (isValidVideo) {
      cb(null, true);
    } else {
      cb(new Error("Only video files (mp4, webm, mov) are allowed"));
    }
  } else {
    cb(new Error("Unexpected field"));
  }
};

// Image upload middleware
export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
}).single("image");

// Video upload middleware
export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
  },
}).single("video");

// Multiple images upload
export const uploadImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
}).array("images", 10);

// Handle multer errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

export default { uploadImage, uploadVideo, uploadImages, handleUploadError };
