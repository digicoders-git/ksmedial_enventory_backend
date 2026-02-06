const express = require('express');
const router = express.Router();
const {
    createLocation,
    getLocations,
    updateLocation,
    deleteLocation,
    bulkCreateLocations
} = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getLocations)
    .post(createLocation);

router.route('/bulk')
    .post(bulkCreateLocations);

router.route('/:id')
    .put(updateLocation)
    .delete(deleteLocation);

module.exports = router;
