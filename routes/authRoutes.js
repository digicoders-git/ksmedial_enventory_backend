const express = require('express');
const router = express.Router();
const { loginShop, registerUser, loginUser, getUserProfile, updateUserProfile, sendOTP, verifyOTP } = require('../controllers/authController');
const { protectUser } = require('../middleware/authMiddleware');

router.post('/login', loginShop);
router.post('/register', registerUser);
router.post('/user-login', loginUser);

router.route('/profile')
    .get(protectUser, getUserProfile)
    .put(protectUser, updateUserProfile);

// OTP Routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

module.exports = router;
