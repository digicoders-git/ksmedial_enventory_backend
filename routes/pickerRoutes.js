const express = require('express');
const router = express.Router();
const { getPickers, addPicker, togglePickerStatus } = require('../controllers/pickerController');

router.get('/', getPickers);
router.post('/', addPicker);
router.put('/:id/status', togglePickerStatus);

module.exports = router;
