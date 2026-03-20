const express = require('express');
const router = express.Router();
const {
    getRazorpayKey,
    createOrder,
    verifyPayment,
    getPaymentDetails,
    generateTestData
} = require('../controllers/paymentController');
const { protectUser } = require('../middleware/authMiddleware');

// Middleware to optionally attach user if token exists (but don't block if no token)
const optionalAuth = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const jwt = require('jsonwebtoken');
            const User = require('../models/User');
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            // Token invalid but continue without user
            console.log('Optional auth failed, continuing without user');
        }
    }
    next();
};

// Public - Anyone can get key
router.get('/key', getRazorpayKey);

// Optional Auth - Token preferred but userId in body also accepted
router.post('/create-order', optionalAuth, createOrder);
router.post('/verify', optionalAuth, verifyPayment);

// Protected - Only logged-in users can see payment details
router.get('/:paymentId', protectUser, getPaymentDetails);

// Test endpoint - Generate mock payment data for testing
router.post('/generate-test-data', generateTestData);

module.exports = router;
