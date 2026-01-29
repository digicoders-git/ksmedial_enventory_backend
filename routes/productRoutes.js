const express = require('express');
const router = express.Router();
const { 
    getProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct,
    adjustStock,
    getInventoryLogs,
    getInventoryReport
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/report')
    .get(getInventoryReport);

router.route('/')
    .get(getProducts)
    .post(createProduct);

router.route('/logs')
    .get(getInventoryLogs);

router.route('/:id/adjust')
    .put(adjustStock);

router.route('/:id')
    .get(getProductById)
    .put(updateProduct)
    .delete(deleteProduct);

module.exports = router;
