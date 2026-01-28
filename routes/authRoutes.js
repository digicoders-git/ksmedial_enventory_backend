const express = require('express');
const router = express.Router();
const { loginShop } = require('../controllers/authController');

router.post('/login', loginShop);

module.exports = router;
