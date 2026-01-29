const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getRoles,
    createRole,
    getRoleById,
    updateRole,
    deleteRole
} = require('../controllers/roleController');

router.route('/')
    .get(protect, getRoles)
    .post(protect, createRole);

router.route('/:id')
    .get(protect, getRoleById)
    .put(protect, updateRole)
    .delete(protect, deleteRole);

module.exports = router;
