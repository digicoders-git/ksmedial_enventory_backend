const express = require('express');
const router = express.Router();
const { 
    getGroups, 
    createGroup, 
    updateGroup, 
    deleteGroup 
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getGroups)
    .post(createGroup);

router.route('/:id')
    .put(updateGroup)
    .delete(deleteGroup);

module.exports = router;
