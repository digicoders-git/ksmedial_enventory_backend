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
    bulkUpdateOrderStatus,
    getPrescriptionRequests,
    approvePrescriptionRequest,
    uploadAdminPrescription
} = require('../controllers/orderController');
const { protect, protectUser, protectAdminOrShop } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ==========================================
// USER ROUTES (User Token)
// ==========================================
router.post('/place', protectUser, upload.single('prescriptionImage'), placeOrder);
router.get('/my-orders', protectUser, getMyOrders);
router.get('/my-orders/:id', protectUser, getMyOrderById);
router.get('/track/:identifier', protectUser, trackOrder);
router.put('/my-orders/:id/cancel', protectUser, cancelMyOrder);

// ==========================================
// ADMIN / SHOP ROUTES (Dual Token Support)
// ==========================================
router.get('/', protectAdminOrShop, getOrders);
router.post('/seed', protect, createTestOrders);
router.put('/bulk-status', protectAdminOrShop, bulkUpdateOrderStatus);
router.get('/:id', protectAdminOrShop, getOrderById);
router.put('/:id/status', protectAdminOrShop, upload.single('dispatchProof'), updateOrderStatus);

// Prescription Request Routes (Now accessible by both Admin and Shop)
router.get('/prescription/requests', protectAdminOrShop, getPrescriptionRequests);
router.put('/prescription/requests/:id/approve', protectAdminOrShop, approvePrescriptionRequest);
router.put('/prescription/requests/:id/upload', protectAdminOrShop, upload.single('prescriptionImage'), uploadAdminPrescription);

module.exports = router;
