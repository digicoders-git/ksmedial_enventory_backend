const express = require('express');
const router = express.Router();
const { 
    createSaleReturn, 
    getSaleReturns, 
    getSaleReturnById 
} = require('../controllers/saleReturnController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getSaleReturns)
    .post(protect, createSaleReturn);

router.route('/:id')
    .get(protect, getSaleReturnById);

module.exports = router;
