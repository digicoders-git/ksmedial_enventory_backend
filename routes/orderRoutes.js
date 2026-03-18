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
    uploadAdminPrescription,
    requestPrescription,
    getMyPrescriptionRequests,
    rejectPrescriptionRequest
} = require('../controllers/orderController');
const { protect, protectUser, protectAdminOrShop } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// ==========================================
// USER ROUTES (User Token)
// ==========================================
// Use upload.any() temporarily to see what the consumer app is sending, 
// or at least capture the image regardless of field name.
router.post('/place', protectUser, upload.any(), placeOrder);
router.post('/request-prescription', protectUser, requestPrescription);
router.get('/my-prescription-requests', protectUser, getMyPrescriptionRequests);
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

// Prescription Request Routes (Now accessible by both Admin and Shop)
router.get('/prescription/requests', protectAdminOrShop, getPrescriptionRequests);
router.put('/prescription/requests/:id/approve', protectAdminOrShop, approvePrescriptionRequest);
router.put('/prescription/requests/:id/reject', protectAdminOrShop, rejectPrescriptionRequest);
router.put('/prescription/requests/:id/upload', protectAdminOrShop, upload.single('prescriptionImage'), uploadAdminPrescription);

router.get('/:id', protectAdminOrShop, getOrderById);
router.put('/:id/status', protectAdminOrShop, upload.single('dispatchProof'), updateOrderStatus);

module.exports = router;
