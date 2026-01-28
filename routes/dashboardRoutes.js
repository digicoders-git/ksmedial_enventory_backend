const express = require('express');
const router = express.Router();
const { getDashboardStats, getGlobalSearch } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/search', protect, getGlobalSearch);

module.exports = router;
