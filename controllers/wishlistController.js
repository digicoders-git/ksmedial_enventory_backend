const Wishlist = require('../models/Wishlist');

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private (User)
const getWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ userId: req.user._id }).populate('products');
        if (!wishlist) {
            wishlist = await Wishlist.create({ userId: req.user._id, products: [] });
        }
        res.json({ success: true, wishlist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle item in wishlist (Add/Remove)
// @route   POST /api/wishlist/toggle
// @access  Private (User)
const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        let wishlist = await Wishlist.findOne({ userId: req.user._id });

        if (!wishlist) {
            wishlist = await Wishlist.create({
                userId: req.user._id,
                products: [productId]
            });
            return res.json({ success: true, message: 'Added to wishlist', wishlist: await Wishlist.findById(wishlist._id).populate('products') });
        } else {
            const productIndex = wishlist.products.indexOf(productId);
            if (productIndex > -1) {
                wishlist.products.splice(productIndex, 1);
                await wishlist.save();
                return res.json({ success: true, message: 'Removed from wishlist', wishlist: await Wishlist.findById(wishlist._id).populate('products') });
            } else {
                wishlist.products.push(productId);
                await wishlist.save();
                return res.json({ success: true, message: 'Added to wishlist', wishlist: await Wishlist.findById(wishlist._id).populate('products') });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Clear wishlist
// @route   DELETE /api/wishlist
// @access  Private (User)
const clearWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.user._id });
        if (wishlist) {
            wishlist.products = [];
            await wishlist.save();
            return res.json({ success: true, message: 'Wishlist cleared', wishlist });
        }
        res.status(404).json({ success: false, message: 'Wishlist not found' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getWishlist,
    toggleWishlist,
    clearWishlist
};
