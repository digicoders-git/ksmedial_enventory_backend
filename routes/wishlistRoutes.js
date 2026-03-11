const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlist, clearWishlist } = require('../controllers/wishlistController');
const { protectUser } = require('../middleware/authMiddleware');

router.use(protectUser);

router.route('/')
    .get(getWishlist)
    .delete(clearWishlist);

router.post('/toggle', toggleWishlist);

module.exports = router;
