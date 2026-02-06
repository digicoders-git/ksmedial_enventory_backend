const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getInventoryReport,
    getSalesReport,
    getProfitReport,
    getGroupReport,
    getInventoryAnalysis
} = require('../controllers/reportController');

// All routes are protected
router.use(protect);

// @route   GET /api/reports/inventory
router.get('/inventory', getInventoryReport);

// @route   GET /api/reports/sales
router.get('/sales', getSalesReport);

// @route   GET /api/reports/profit
router.get('/profit', getProfitReport);

// @route   GET /api/reports/groups
router.get('/groups', getGroupReport);

// @route   GET /api/reports/analysis
router.get('/analysis', getInventoryAnalysis);

module.exports = router;
