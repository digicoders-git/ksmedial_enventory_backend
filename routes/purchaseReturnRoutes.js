const express = require('express');
const router = express.Router();
const {
    createPurchaseReturn,
    getPurchaseReturns,
    getPurchaseReturnById,
    updatePurchaseReturn,
    deletePurchaseReturn,
    clearAllPurchaseReturns
} = require('../controllers/purchaseReturnController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/clear-all')
    .delete(clearAllPurchaseReturns);

router.route('/')
    .get(getPurchaseReturns)
    .post(createPurchaseReturn);

router.route('/:id')
    .get(getPurchaseReturnById)
    .put(updatePurchaseReturn)
    .delete(deletePurchaseReturn);

module.exports = router;
