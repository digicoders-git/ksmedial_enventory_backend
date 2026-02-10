const express = require('express');
const router = express.Router();
const { 
    createSaleReturn, 
    getSaleReturns, 
    getSaleReturnById,
    clearSaleReturns
} = require('../controllers/saleReturnController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getSaleReturns)
    .post(createSaleReturn);

router.delete('/clear', clearSaleReturns);

router.route('/:id')
    .get(getSaleReturnById);

module.exports = router;
