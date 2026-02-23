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
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

// Custom wrapper for upload middleware to handle errors and ensure body parsing
const uploadInvoice = (req, res, next) => {
    upload.single('invoiceFile')(req, res, (err) => {
        if (err) {
            console.error('Multer Error in Purchase Return:', err);
            return res.status(500).json({ 
                success: false, 
                message: `File upload error: ${err.message || err}` 
            });
        }
        next();
    });
};

router.route('/clear-all')
    .delete(clearAllPurchaseReturns);

router.route('/')
    .get(getPurchaseReturns)
    .post((req, res, next) => {
        console.log("POST /api/purchase-returns hit");
        next();
    }, uploadInvoice, createPurchaseReturn);

router.route('/:id')
    .get(getPurchaseReturnById)
    .put(updatePurchaseReturn)
    .delete(deletePurchaseReturn);

module.exports = router;
