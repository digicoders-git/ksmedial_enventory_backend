const express = require('express');
const router = express.Router();
const { 
    getAllWithdrawals, 
    updateWithdrawalStatus, 
    getWithdrawalStats 
} = require('../controllers/adminController');
const { requestWithdrawal } = require('../controllers/mlmController');
const { protectAdmin, protectUser } = require('../middleware/authMiddleware');

// Admin Routes
router.get('/all', protectAdmin, getAllWithdrawals);
router.get('/stats', protectAdmin, getWithdrawalStats);
router.post('/approve/:id', protectAdmin, (req, res) => { req.body.status = 'approved'; updateWithdrawalStatus(req, res); });
router.post('/reject/:id', protectAdmin, (req, res) => { req.body.status = 'rejected'; updateWithdrawalStatus(req, res); });
router.post('/complete/:id', protectAdmin, (req, res) => { req.body.status = 'completed'; updateWithdrawalStatus(req, res); });

// User Routes
router.post('/', protectUser, requestWithdrawal);

module.exports = router;
