const express = require('express');
const router = express.Router();
const { createGRN, getGRNs, getGRNById } = require('../controllers/grnController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createGRN)
    .get(protect, getGRNs);

router.route('/:id')
    .get(protect, getGRNById);

module.exports = router;
