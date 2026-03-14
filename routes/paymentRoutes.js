const express = require('express');
const router = express.Router();
const {
    getRazorpayKey,
    createOrder,
    verifyPayment,
    getPaymentDetails
} = require('../controllers/paymentController');

// All Public Routes (No Token Required)
router.get('/key', getRazorpayKey);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/:paymentId', getPaymentDetails);

module.exports = router;
