const express = require('express');
const router = express.Router();
const { 
    getAllKYC, 
    getKYCById, 
    approveKYC, 
    rejectKYC, 
    getKYCStats 
} = require('../controllers/adminController');

router.get('/all', getAllKYC);
router.get('/stats', getKYCStats);
router.get('/:id', getKYCById);
router.post('/approve/:id', approveKYC);
router.post('/reject/:id', rejectKYC);

module.exports = router;
