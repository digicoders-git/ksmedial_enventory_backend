const Sale = require('../models/Sale');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Category = require('../models/Category');
const Purchase = require('../models/Purchase');
const Offer = require('../models/Offer'); // Added

const fs = require('fs');
const path = require('path');

// @desc    Admin login
// @route   POST /api/admin/login
const adminLogin = async (req, res) => {
    const { adminId, password } = req.body;
    if (adminId === 'admin' && (password === 'admin123' || password === 'admin')) {
        res.json({
            status: 'success',
            message: 'Login successful',
            admin: { adminId: 'admin', name: 'KS Global Admin', id: 'global-admin' },
            token: 'global-admin-token'
        });
    } else {
        res.status(401).json({ status: 'error', message: 'Invalid admin credentials' });
    }
};

// @desc    Get global dashboard stats
// @route   GET /api/admin/stats
const getAdminStats = async (req, res) => {
    try {
        const totalSales = await Sale.countDocuments();
        const allSales = await Sale.find();
        const totalRevenue = allSales.reduce((acc, s) => acc + s.totalAmount, 0);

        const onlineOrders = await Order.find();
        const onlineRevenue = onlineOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
        const offlineRevenue = totalRevenue - onlineRevenue;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const monthSales = allSales.filter(s => s.createdAt >= startOfMonth);
        const monthRevenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);

        const totalOrdersCount = await Order.countDocuments();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayOrdersCount = await Order.countDocuments({ createdAt: { $gte: startOfToday } });

        // Put-Away Stats
        const completedPutAways = await Purchase.find({ status: 'Received' })
            .populate('supplierId', 'name')
            .populate('shopId', 'shopName')
            .sort({ updatedAt: -1 });

        const totalPutAwayValue = completedPutAways.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
        const todayPutAwayCount = completedPutAways.filter(p => new Date(p.updatedAt) >= startOfToday).length;

        const salesTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const daySales = allSales.filter(s => s.createdAt.toISOString().split('T')[0] === dateStr);
            salesTrend.push({
                date: dateStr,
                orders: daySales.length,
                revenue: daySales.reduce((acc, s) => acc + s.totalAmount, 0)
            });
        }

        const categoryStats = await Product.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        res.json({
            status: 'success',
            summaryCards: {
                totalRevenue,
                monthRevenue,
                onlineRevenue: onlineRevenue,
                offlineRevenue: offlineRevenue > 0 ? offlineRevenue : 0,
                totalOrders: totalOrdersCount,
                todayOrders: todayOrdersCount,
                totalShops: await Shop.countDocuments(), // Added
                putAwayCount: completedPutAways.length,
                todayPutAwayCount,
                totalPutAwayValue
            },
            charts: {
                salesLast7Days: salesTrend,
                productsByCategory: categoryStats.map(c => ({
                    name: c._id || 'Uncategorized',
                    totalProducts: c.count,
                    activeProducts: c.count
                }))
            },
            tables: {
                latestOrders: await Order.find().sort({ createdAt: -1 }).limit(10),
                latestProducts: await Product.find().sort({ createdAt: -1 }).limit(10),
                completedPutAways: completedPutAways.slice(0, 10),
                recentEnquiries: [],
                activeOffers: []
            },
            meta: {
                generatedAtIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Global Order Management
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('shopId', 'shopName')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Global Product Management
const getAdminProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('shopId', 'shopName')
            .populate('categoryId', 'name')
            .populate('offerId', 'title code discountType discountValue')
            .sort({ createdAt: -1 });
        res.json({ products });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createAdminProduct = async (req, res) => {
    try {
        const productData = req.body;
        
        // Handle images
        if (req.files) {
            if (req.files.mainImage) {
                productData.image = `/uploads/${req.files.mainImage[0].filename}`;
            }
            if (req.files.galleryImages) {
                productData.galleryImages = req.files.galleryImages.map(f => `/uploads/${f.filename}`);
            }
        }

        // Parse JSON fields
        ['sizes', 'colors', 'addOns'].forEach(field => {
            if (typeof productData[field] === 'string') {
                try {
                    productData[field] = JSON.parse(productData[field]);
                } catch (e) {
                    productData[field] = [];
                }
            }
        });

        const slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        productData.slug = slug;

        const product = await Product.create(productData);
        res.status(201).json({ status: 'success', product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateAdminProduct = async (req, res) => {
    try {
        const productData = req.body;
        const productId = req.params.id;

        // Handle images
        if (req.files) {
            if (req.files.mainImage) {
                productData.image = `/uploads/${req.files.mainImage[0].filename}`;
            }
            if (req.files.galleryImages) {
                const newGallery = req.files.galleryImages.map(f => `/uploads/${f.filename}`);
                productData.galleryImages = newGallery; // Overwrite or append? Usually overwrite in admin edit
            }
        }

        // Parse JSON fields
        ['sizes', 'colors', 'addOns'].forEach(field => {
            if (typeof productData[field] === 'string') {
                try {
                    productData[field] = JSON.parse(productData[field]);
                } catch (e) {
                    // keep as is if not string or already object?
                }
            }
        });

        const product = await Product.findByIdAndUpdate(productId, productData, { new: true });
        res.json({ status: 'success', product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteAdminProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ status: 'success', message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Shop Management
const getShops = async (req, res) => {
    try {
        const shops = await Shop.find().sort({ createdAt: -1 });
        res.json({ status: 'success', shops });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createShop = async (req, res) => {
    try {
        const { username } = req.body;
        const exists = await Shop.findOne({ username });
        if (exists) {
            return res.status(400).json({ message: 'Username (Shop ID) already exists' });
        }
        const shop = await Shop.create(req.body);
        res.status(201).json({ status: 'success', shop });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateShop = async (req, res) => {
    try {
        const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ status: 'success', shop });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteShop = async (req, res) => {
    try {
        await Shop.findByIdAndDelete(req.params.id);
        res.json({ status: 'success', message: 'Shop deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// KYC Management
const KYC = require('../models/KYC');
const getAllKYC = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status && status !== 'all' ? { status } : {};
        const kycList = await KYC.find(query).sort({ createdAt: -1 });
        res.json(kycList);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getKYCById = async (req, res) => {
    try {
        const kyc = await KYC.findById(req.params.id);
        res.json(kyc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const approveKYC = async (req, res) => {
    try {
        const kyc = await KYC.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        res.json({ success: true, data: kyc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const rejectKYC = async (req, res) => {
    try {
        const kyc = await KYC.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectReason: req.body.reason }, { new: true });
        res.json({ success: true, data: kyc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getKYCStats = async (req, res) => {
    try {
        const total = await KYC.countDocuments();
        const pending = await KYC.countDocuments({ status: 'pending' });
        const approved = await KYC.countDocuments({ status: 'approved' });
        const rejected = await KYC.countDocuments({ status: 'rejected' });
        res.json({ total, pending, approved, rejected });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Withdrawal Management
const Withdrawal = require('../models/Withdrawal');
const getAllWithdrawals = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status && status !== 'all' ? { status } : {};
        const withdrawals = await Withdrawal.find(query).sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateWithdrawalStatus = async (req, res) => {
    try {
        const { status, rejectReason, referenceId } = req.body;
        const update = { status };
        if (rejectReason) update.rejectReason = rejectReason;
        if (referenceId) update.referenceId = referenceId;
        
        const withdrawal = await Withdrawal.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json({ success: true, data: withdrawal });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getWithdrawalStats = async (req, res) => {
    try {
        const total = await Withdrawal.countDocuments();
        const pending = await Withdrawal.countDocuments({ status: 'pending' });
        const completed = await Withdrawal.countDocuments({ status: 'completed' });
        const totalAmount = await Withdrawal.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
        res.json({ total, pending, completed, totalAmount: totalAmount[0]?.total || 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Offer Management
const listOffers = async (req, res) => {
    try {
        const offers = await Offer.find().populate('applicableProducts', 'name image').sort({ createdAt: -1 });
        res.json({ status: 'success', offers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createOffer = async (req, res) => {
    try {
        const offer = await Offer.create(req.body);
        res.status(201).json({ status: 'success', offer });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateOffer = async (req, res) => {
    try {
        const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ status: 'success', offer });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteOffer = async (req, res) => {
    try {
        await Offer.findByIdAndDelete(req.params.id);
        res.json({ status: 'success', message: 'Offer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    adminLogin,
    getAdminStats,
    getOrders,
    updateOrderStatus,
    getAdminProducts,
    createAdminProduct,
    updateAdminProduct,
    deleteAdminProduct,
    getShops,
    createShop,
    updateShop,
    deleteShop,
    getAllKYC,
    getKYCById,
    approveKYC,
    rejectKYC,
    getKYCStats,
    getAllWithdrawals,
    updateWithdrawalStatus,
    getWithdrawalStats,
    // Offer Management
    listOffers,
    createOffer,
    updateOffer,
    deleteOffer,
    // Category Management
    getAllCategories: async (req, res) => {
        try {
            const categories = await Category.find().sort({ createdAt: -1 });
            res.json({ status: 'success', categories });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    createAdminCategory: async (req, res) => {
        try {
            const { name, description, defaultUnit, gst, isActive } = req.body;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
            const category = await Category.create({
                name,
                description,
                defaultUnit,
                gst,
                isActive,
                slug
            });
            res.status(201).json({ status: 'success', category });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    updateAdminCategory: async (req, res) => {
        try {
            const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json({ status: 'success', category });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    deleteAdminCategory: async (req, res) => {
        try {
            await Category.findByIdAndDelete(req.params.id);
            res.json({ status: 'success', message: 'Category deleted' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};
