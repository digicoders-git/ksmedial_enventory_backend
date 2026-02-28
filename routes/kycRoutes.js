const express = require('express');
const router = express.Router();
const { 
    getAllKYC, 
    getKYCById, 
    approveKYC, 
    rejectKYC, 
    getKYCStats,
    submitKYC 
} = require('../controllers/adminController');

router.get('/all', getAllKYC);
router.post('/submit', submitKYC);
router.get('/stats', getKYCStats);
router.get('/:id', getKYCById);
router.post('/approve/:id', approveKYC);
router.post('/reject/:id', rejectKYC);

module.exports = router;
