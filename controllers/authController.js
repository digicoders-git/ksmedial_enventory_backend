const User = require('../models/User');
const Shop = require('../models/Shop');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activityController');
const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs');

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

// @desc    Send OTP to phone
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Logic for sending OTP (Fixed to 1234 as requested)
        res.json({
            success: true,
            message: 'OTP sent successfully to ' + phone,
            otp: "1234" // For testing/fixed as requested
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP and Log in/Register
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { phone, otp, referralCode } = req.body;

        if (otp !== "1234") {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        let user = await User.findOne({ phone });

        if (!user) {
            // Register new user if they don't exist
            let referredBy = null;
            if (referralCode) {
                const referrer = await User.findOne({ referralCode });
                if (referrer) {
                    referredBy = referrer._id;
                }
            }

            // Generate a unique referral code for the new user
            const newReferralCode = `KS${phone.slice(-4)}${Math.floor(100 + Math.random() * 900)}`;

            user = await User.create({
                phone,
                referralCode: newReferralCode,
                referredBy,
                firstName: 'User', // Placeholder
                lastName: phone.slice(-4)
            });
        }

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
            message: 'OTP Verified successfully'
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token (Keep old login for backward compatibility or remove if strictly OTP)
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

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                user: {
                    _id: user._id,
                    name: user.firstName + ' ' + user.lastName,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    image: user.image,
                    referralCode: user.referralCode,
                    walletBalance: user.walletBalance,
                    totalEarnings: user.totalEarnings,
                    isActive: user.isActive,
                    createdAt: user.createdAt
                }
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.email = req.body.email || user.email;

            // Handle Profile Image Upload
            if (req.file) {
                const result = await uploadToCloudinary(req.file.path);
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                user.image = result.secure_url;
            }

            const updatedUser = await user.save();

            res.json({
                success: true,
                user: {
                    _id: updatedUser._id,
                    name: updatedUser.firstName + ' ' + updatedUser.lastName,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    image: updatedUser.image,
                    referralCode: updatedUser.referralCode,
                    walletBalance: updatedUser.walletBalance
                },
                message: 'Profile updated successfully'
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
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
    loginUser,
    getUserProfile,
    updateUserProfile,
    sendOTP,
    verifyOTP
};
