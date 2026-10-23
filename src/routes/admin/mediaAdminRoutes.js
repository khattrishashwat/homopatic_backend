const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const mediaController = require('../../controllers/admin/mediaController');
const multer = require('../../utils/multer');

router.use(authMiddleware.requireAdmin);

// Upload generic media file to S3
router.post('/upload', multer.single('file'), mediaController.uploadMedia);

// Refresh or request presigned download URL for a protected S3 key
router.get('/presign', mediaController.getPresignedUrl);

// Stream media directly if needed
router.get('/stream', mediaController.streamMedia);

// Delete an authorized media file from S3
router.delete('/', mediaController.deleteMedia);

module.exports = router;
