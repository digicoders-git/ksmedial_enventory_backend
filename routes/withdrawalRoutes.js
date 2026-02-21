const express = require('express');
const router = express.Router();
const { 
    getAllWithdrawals, 
    updateWithdrawalStatus, 
    getWithdrawalStats 
} = require('../controllers/adminController');

router.get('/all', getAllWithdrawals);
router.get('/stats', getWithdrawalStats);
router.post('/approve/:id', (req, res) => { req.body.status = 'approved'; updateWithdrawalStatus(req, res); });
router.post('/reject/:id', (req, res) => { req.body.status = 'rejected'; updateWithdrawalStatus(req, res); });
router.post('/complete/:id', (req, res) => { req.body.status = 'completed'; updateWithdrawalStatus(req, res); });

module.exports = router;
