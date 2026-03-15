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
const { protect, protectUser } = require('../middleware/authMiddleware');
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
// ADMIN / SHOP ROUTES (Shop Token)
// ==========================================
router.get('/', protect, getOrders);
router.post('/seed', protect, createTestOrders);
router.put('/bulk-status', protect, bulkUpdateOrderStatus);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, upload.single('dispatchProof'), updateOrderStatus);

// Prescription Request Routes
router.get('/prescription/requests', protect, getPrescriptionRequests);
router.put('/prescription/requests/:id/approve', protect, approvePrescriptionRequest);
router.put('/prescription/requests/:id/upload', protect, upload.single('prescriptionImage'), uploadAdminPrescription);

module.exports = router;
