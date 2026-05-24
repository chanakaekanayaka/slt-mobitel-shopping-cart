const { upload } = require('../config/cloudinary');

// @desc    Upload single image
// @route   POST /api/upload
// @access  Private/Admin
const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const imageUrl = req.file.path;
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully!',
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
};

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Private/Admin
const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const imageUrls = req.files.map(file => file.path);
    
    res.status(200).json({
      success: true,
      message: `${req.files.length} files uploaded successfully!`,
      imageUrls: imageUrls
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
};

// Export multer upload middleware
const uploadMiddleware = upload.single('image');
const uploadMultipleMiddleware = upload.array('images', 5);

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  uploadMiddleware,
  uploadMultipleMiddleware
};