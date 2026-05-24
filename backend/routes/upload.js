const express = require('express');
const router = express.Router();
const {
  uploadSingleImage,
  uploadMultipleImages,
  uploadMiddleware,
  uploadMultipleMiddleware
} = require('../controllers/uploadController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Admin only - Single image upload
router.post('/', authMiddleware, adminMiddleware, uploadMiddleware, uploadSingleImage);

// Admin only - Multiple images upload
router.post('/multiple', authMiddleware, adminMiddleware, uploadMultipleMiddleware, uploadMultipleImages);

module.exports = router;