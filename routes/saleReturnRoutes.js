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

router.use(protect);

router.route('/')
    .get(getSaleReturns)
    .post(createSaleReturn);

router.delete('/clear', clearSaleReturns);

router.route('/:id')
    .get(getSaleReturnById);

router.put('/:id/putaway', completePutAway);

module.exports = router;
