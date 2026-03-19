const express = require('express');
const router = express.Router();
const {
    getBatchesByProduct,
    getBatchById,
    deductBatchQuantity,
    createOrUpdateBatch
} = require('../controllers/batchController');
const { protect, protectAdminOrShop } = require('../middleware/authMiddleware');

// Get batches for a product
router.get('/product/:productId', protectAdminOrShop, getBatchesByProduct);

// Get single batch
router.get('/:id', protectAdminOrShop, getBatchById);

// Deduct batch quantity
router.put('/:id/deduct', protectAdminOrShop, deductBatchQuantity);

// Create or update batch
router.post('/', protectAdminOrShop, createOrUpdateBatch);

module.exports = router;
