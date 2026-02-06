const express = require('express');
const router = express.Router();
const {
    createEntry,
    getEntries,
    getEntry,
    validateEntry,
    updateGRNStatus
} = require('../controllers/physicalReceivingController');

router.route('/')
    .post(createEntry)
    .get(getEntries);

router.route('/:id')
    .get(getEntry);

router.route('/:id/validate')
    .put(validateEntry);

router.route('/:id/grn-status')
    .put(updateGRNStatus);

module.exports = router;
