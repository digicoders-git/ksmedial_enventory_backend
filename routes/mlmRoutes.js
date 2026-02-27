const express = require('express');
const router = express.Router();
const { getMLMStats, getReferrals } = require('../controllers/mlmController');

router.get('/stats', getMLMStats);
router.get('/referrals/:userId', getReferrals);
router.get('/referrals', getReferrals);
router.get('/dashboard/:userId', getMLMStats);
router.get('/dashboard', getMLMStats);

module.exports = router;
