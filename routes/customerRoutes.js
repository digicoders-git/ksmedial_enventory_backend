const express = require('express');
const router = express.Router();
const {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    clearAllCustomers
} = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getCustomers)
    .post(createCustomer);

router.delete('/clear-all', clearAllCustomers);


router.route('/:id')
    .put(updateCustomer)
    .delete(deleteCustomer);

module.exports = router;
