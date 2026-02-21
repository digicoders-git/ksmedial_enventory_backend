const express = require('express');
const router = express.Router();
const { getMLMStats, getReferrals } = require('../controllers/mlmController');

router.get('/stats', getMLMStats);
router.get('/referrals/:userId', getReferrals);
router.get('/dashboard/:userId', getMLMStats);

module.exports = router;
