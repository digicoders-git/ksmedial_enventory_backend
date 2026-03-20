const express = require('express');
const router = express.Router();
const {
    getRazorpayKey,
    createOrder,
    verifyPayment,
    getPaymentDetails,
    generateTestData
} = require('../controllers/paymentController');

// All Public Routes (No Token Required)
router.get('/key', getRazorpayKey);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/:paymentId', getPaymentDetails);

// Test endpoint - Generate mock payment data for testing
router.post('/generate-test-data', generateTestData);

module.exports = router;
