const express = require('express');
const router = express.Router();
const {
    createSale,
    getSales,
    getSaleById
} = require('../controllers/salesController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getSales)
    .post(createSale);

router.route('/:id')
    .get(getSaleById);

module.exports = router;
