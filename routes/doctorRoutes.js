const express = require('express');
const router = express.Router();
const {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor
} = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getDoctors)
    .post(createDoctor);

router.route('/:id')
    .get(getDoctorById)
    .put(updateDoctor)
    .delete(deleteDoctor);

module.exports = router;
