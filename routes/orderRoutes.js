const express = require('express');
const router = express.Router();
const { 
    getOrders, 
    getOrderById, 
    updateOrderStatus, 
    createTestOrders,
    cancelMyOrder 
} = require('../controllers/orderController');
const { protect, protectUser } = require('../middleware/authMiddleware');

router.get('/', protect, getOrders);
router.post('/seed', protect, createTestOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, updateOrderStatus);

// User Side Cancellation
router.put('/my-orders/:id/cancel', protectUser, cancelMyOrder);

module.exports = router;
