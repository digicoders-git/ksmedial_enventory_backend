const express = require('express');
const router = express.Router();
const {
    createSale,
    getSales,
    getSaleById,
    deleteSale,
    clearAllSales,
    getSalesReport,
    getProfitReport,
    getGroupReport
} = require('../controllers/salesController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/report')
    .get(getSalesReport);

router.route('/profit')
    .get(getProfitReport);

router.route('/groups')
    .get(getGroupReport);

router.route('/')
    .get(getSales)
    .post(createSale)
    .delete(clearAllSales);

router.route('/:id')
    .get(getSaleById)
    .delete(deleteSale);

module.exports = router;
