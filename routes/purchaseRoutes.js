const express = require('express');
const router = express.Router();
const {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase,
    processPutAway,
    processBulkPutAwayUpload,
    clearPurchases
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getPurchases)
    .post(createPurchase);

router.route('/bulk-putaway-upload')
    .post(processBulkPutAwayUpload);

router.delete('/clear', clearPurchases);

router.route('/:id')
    .get(getPurchaseById)
    .put(updatePurchase)
    .delete(deletePurchase);

router.route('/:id/putaway')
    .put(processPutAway);

module.exports = router;
