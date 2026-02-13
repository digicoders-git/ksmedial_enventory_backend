const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Routes for Purchase Orders
router.get('/', purchaseOrderController.getAllPurchaseOrders);
router.get('/requisitions', purchaseOrderController.getRequisitions);
router.post('/create', purchaseOrderController.createPurchaseOrder);
router.get('/:id', purchaseOrderController.getPurchaseOrderById);
router.put('/:id/status', purchaseOrderController.updatePurchaseOrderStatus);
router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

module.exports = router;
