const express = require('express');
const router = express.Router();
const { 
    getOrders, 
    getOrderById, 
    updateOrderStatus, 
    createTestOrders,
    cancelMyOrder,
    getMyOrders,
    getMyOrderById,
    trackOrder,
    placeOrder,
    bulkUpdateOrderStatus
} = require('../controllers/orderController');
const { protect, protectUser } = require('../middleware/authMiddleware');

// ==========================================
// USER ROUTES (User Token)
// ==========================================
router.post('/place', protectUser, placeOrder);
router.get('/my-orders', protectUser, getMyOrders);
router.get('/my-orders/:id', protectUser, getMyOrderById);
router.get('/track/:identifier', protectUser, trackOrder);
router.put('/my-orders/:id/cancel', protectUser, cancelMyOrder);

// ==========================================
// ADMIN / SHOP ROUTES (Shop Token)
// ==========================================
router.get('/', protect, getOrders);
router.post('/seed', protect, createTestOrders);
router.put('/bulk-status', protect, bulkUpdateOrderStatus);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, updateOrderStatus);

module.exports = router;
