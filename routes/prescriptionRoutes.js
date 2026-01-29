const express = require('express');
const router = express.Router();
const { 
    getPrescriptions, 
    createPrescription, 
    updatePrescriptionStatus,
    deletePrescription
} = require('../controllers/prescriptionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getPrescriptions)
    .post(createPrescription);

router.route('/:id/status')
    .put(updatePrescriptionStatus);

router.route('/:id')
    .delete(deletePrescription);

module.exports = router;
