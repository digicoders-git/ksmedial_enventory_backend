const express = require('express');
const router = express.Router();
const {
    getDoctors,
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
    .put(updateDoctor)
    .delete(deleteDoctor);

module.exports = router;
