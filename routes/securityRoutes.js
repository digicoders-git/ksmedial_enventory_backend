const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { changePassword, toggle2FA, getSecuritySettings } = require('../controllers/securityController');

router.get('/', protect, getSecuritySettings);
router.put('/password', protect, changePassword);
router.put('/2fa', protect, toggle2FA);

module.exports = router;
