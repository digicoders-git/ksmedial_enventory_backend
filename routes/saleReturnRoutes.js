const express = require('express');
const router = express.Router();
const { 
    createSaleReturn, 
    getSaleReturns, 
    getSaleReturnById,
    clearSaleReturns,
    completePutAway
} = require('../controllers/saleReturnController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

// Multer wrapper for invoice file upload (same as purchaseReturnRoutes)
const uploadInvoice = (req, res, next) => {
    upload.single('invoiceFile')(req, res, (err) => {
        if (err) {
            console.error('Multer Error in Sale Return:', err);
            return res.status(500).json({ 
                success: false, 
                message: `File upload error: ${err.message || err}` 
            });
        }
        next();
    });
};

router.route('/')
    .get(getSaleReturns)
    .post(uploadInvoice, createSaleReturn);

router.delete('/clear', clearSaleReturns);

router.route('/:id')
    .get(getSaleReturnById);

router.put('/:id/putaway', completePutAway);

module.exports = router;
