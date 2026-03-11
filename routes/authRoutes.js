const express = require('express');
const router = express.Router();
const { loginShop, registerUser, loginUser, getUserProfile } = require('../controllers/authController');
const { protectUser } = require('../middleware/authMiddleware');

router.post('/login', loginShop);
router.post('/register', registerUser);
router.post('/user-login', loginUser);
router.get('/profile', protectUser, getUserProfile);

module.exports = router;
