const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cartController');
const { protectUser } = require('../middleware/authMiddleware');

router.use(protectUser);

router.route('/')
    .get(getCart)
    .post(addToCart)
    .delete(clearCart);

router.route('/:productId')
    .put(updateCartItem)
    .delete(removeFromCart);

module.exports = router;
