const express = require('express');
const router = express.Router();
const {
    createPurchaseReturn,
    getPurchaseReturns,
    getPurchaseReturnById,
    updatePurchaseReturn,
    deletePurchaseReturn
} = require('../controllers/purchaseReturnController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getPurchaseReturns)
    .post(createPurchaseReturn);

router.route('/:id')
    .get(getPurchaseReturnById)
    .put(updatePurchaseReturn)
    .delete(deletePurchaseReturn);

module.exports = router;
