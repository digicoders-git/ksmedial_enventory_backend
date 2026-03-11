const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlist } = require('../controllers/wishlistController');
const { protectUser } = require('../middleware/authMiddleware');

router.use(protectUser);

router.get('/', getWishlist);
router.post('/toggle', toggleWishlist);

module.exports = router;
