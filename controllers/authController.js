const Shop = require('../models/Shop');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activityController');

// @desc    Auth shop & get token
// @route   POST /api/auth/login
// @access  Public
const loginShop = async (req, res) => {
    try {
        const { username, password } = req.body;

        const shop = await Shop.findOne({ username });

        if (shop && shop.password === password) {
            if (shop.status === 'Inactive') {
                return res.status(403).json({ message: 'Shop is inactive. Please contact administrator.' });
            }

            // Log Login Activity
            // Construct a partial req object since 'protect' middleware hasn't run yet
            const mockReq = { ...req, shop: shop };
            logActivity(mockReq, 'Logged in', 'User logged in successfully', 'Auth');

            res.json({
                shop: {
                    _id: shop._id,
                    shopName: shop.shopName,
                    ownerName: shop.ownerName,
                    username: shop.username,
                    status: shop.status,
                    city: shop.city,
                    image: shop.image // Include image in login response
                },
                token: generateToken(shop._id),
                message: 'Login successful'
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = {
    loginShop
};
