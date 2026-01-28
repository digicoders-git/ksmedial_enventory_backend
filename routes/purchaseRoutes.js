const express = require('express');
const router = express.Router();
const {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getPurchases)
    .post(createPurchase);

router.route('/:id')
    .get(getPurchaseById)
    .put(updatePurchase)
    .delete(deletePurchase);

module.exports = router;
