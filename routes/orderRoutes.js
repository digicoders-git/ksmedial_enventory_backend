const express = require('express');
const router = express.Router();
const { getOrders, getOrderById, updateOrderStatus, createTestOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getOrders);
router.post('/seed', createTestOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);

module.exports = router;
