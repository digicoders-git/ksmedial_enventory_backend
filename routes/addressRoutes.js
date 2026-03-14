const express = require('express');
const router = express.Router();
const {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} = require('../controllers/addressController');
const { protectUser } = require('../middleware/authMiddleware');

// All routes require User Token
router.use(protectUser);

router.route('/')
    .get(getAddresses)
    .post(addAddress);

router.route('/:id')
    .put(updateAddress)
    .delete(deleteAddress);

router.put('/:id/default', setDefaultAddress);

module.exports = router;
