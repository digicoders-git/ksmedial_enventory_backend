const express = require('express');
const router = express.Router();
const { loginShop, registerUser, loginUser } = require('../controllers/authController');

router.post('/login', loginShop);
router.post('/register', registerUser);
router.post('/user-login', loginUser);

module.exports = router;
