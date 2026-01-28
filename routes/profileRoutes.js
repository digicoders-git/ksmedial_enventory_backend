const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile, uploadAvatar } = require('../controllers/profileController');
const upload = require('../middleware/uploadMiddleware');

router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);
// Custom wrapper for upload middleware to catch errors
const uploadMiddleware = (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) {
            console.error('Multer Error Raw:', err);
            const msg = err instanceof Error ? err.message : err;
            return res.status(500).json({ success: false, message: `Upload failed: ${msg}` });
        }
        next();
    });
};

router.post('/upload-avatar', protect, uploadMiddleware, uploadAvatar);

module.exports = router;
