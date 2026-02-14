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
    getInventoryReport,
    bulkUpdateLocations,
    deleteInventory,
    clearInventoryLogs,
    searchProducts,
    getPendingPutAwayLogs,
    completePutAwayLog,
    getNonMovingStock
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/non-moving', getNonMovingStock);
router.get('/search', searchProducts);

router.route('/clear-all').delete(deleteInventory);
router.route('/logs/clear').delete(clearInventoryLogs);
router.route('/locations/bulk').put(bulkUpdateLocations);

router.route('/putaway/pending').get(getPendingPutAwayLogs);
router.route('/putaway/complete/:id').put(completePutAwayLog);

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
