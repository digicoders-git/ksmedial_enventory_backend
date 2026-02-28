const User = require('../models/User');
const Shop = require('../models/Shop');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activityController');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, referralCode } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { phone }] });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email or phone' });
        }

        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (referrer) {
                referredBy = referrer._id;
            }
        }

        // Generate a unique referral code for the new user
        const newReferralCode = `KS${phone.slice(-4)}${Math.floor(100 + Math.random() * 900)}`;

        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            password, // Storing plain as per project pattern
            referralCode: newReferralCode,
            referredBy
        });

        if (user) {
            res.status(201).json({
                user: {
                    _id: user._id,
                    name: user.name,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    referralCode: user.referralCode,
                    walletBalance: user.walletBalance
                },
                token: generateToken(user._id),
                message: 'Registration successful'
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/user-login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
        }).select('+password');

        if (user && user.password === password) {
            res.json({
                user: {
                    _id: user._id,
                    name: user.firstName + ' ' + user.lastName,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    referralCode: user.referralCode,
                    walletBalance: user.walletBalance
                },
                token: generateToken(user._id),
                message: 'Login successful'
            });
        } else {
            res.status(401).json({ message: 'Invalid email/phone or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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
                    image: shop.image 
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
    loginShop,
    registerUser,
    loginUser
};
