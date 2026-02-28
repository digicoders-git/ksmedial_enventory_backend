const Sale = require('../models/Sale');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Category = require('../models/Category');
const Purchase = require('../models/Purchase');
const Offer = require('../models/Offer'); // Added

const fs = require('fs');
const path = require('path');
const Admin = require('../models/Admin');
const Slider = require('../models/Slider'); 
const Blog = require('../models/Blog'); // Added
const Enquiry = require('../models/Enquiry'); // Added
const jwt = require('jsonwebtoken');

const generateAdminToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Admin login
// @route   POST /api/admin/login
const adminLogin = async (req, res) => {
    try {
        const { adminId, password } = req.body;

        // 1. Check in Database first
        const admin = await Admin.findOne({ adminId });
        if (admin) {
            const isMatch = await admin.matchPassword(password);
            if (isMatch) {
                return res.json({
                    status: 'success',
                    message: 'Login successful',
                    admin: { adminId: admin.adminId, name: admin.name, id: admin._id },
                    token: generateAdminToken(admin._id)
                });
            }
        }


        res.status(401).json({ status: 'error', message: 'Invalid admin credentials' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// @desc    Create new admin
// @route   POST /api/admin/create
const createAdmin = async (req, res) => {
    try {
        const { name, adminId, password, role } = req.body;

        const adminExists = await Admin.findOne({ adminId });
        if (adminExists) {
            return res.status(400).json({ status: 'error', message: 'Admin ID already exists' });
        }

        const admin = await Admin.create({
            name,
            adminId,
            password,
            role: role || 'superadmin'
        });

        res.status(201).json({
            status: 'success',
            message: 'Admin created successfully',
            admin: {
                id: admin._id,
                name: admin.name,
                adminId: admin.adminId,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
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

const createAdminOrder = async (req, res) => {
    try {
        const { userId, items, shippingAddress, paymentMethod, shopId, notes } = req.body;
        
        // Calculate subtotal/total
        let subtotal = 0;
        items.forEach(item => {
            subtotal += (item.productPrice * item.quantity);
        });
        
        const orderNumber = `ORD-ADM-${Date.now()}`;
        
        const order = new Order({
            userId,
            orderNumber,
            items,
            subtotal,
            total: subtotal, // For now, ignoring discount
            shippingAddress,
            paymentMethod: paymentMethod || 'COD',
            shopId,
            notes,
            status: 'pending'
        });
        
        await order.save();
        res.status(201).json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
        const { scope } = req.query;
        let query = {};
        
        // Filters:
        // 'global': only products with no shop (Catalog)
        // 'inventory': only products belonging to a shop (Actual Stock)
        if (scope === 'global') {
            query = { $or: [{ shopId: { $exists: false } }, { shopId: null }] };
        } else if (scope === 'inventory') {
            query = { shopId: { $ne: null, $exists: true } };
        }

        const products = await Product.find(query)
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

        // Auto-generate SKU if not provided
        if (!productData.sku || productData.sku === "") {
            productData.sku = 'SKU-' + Date.now() + Math.floor(Math.random() * 1000);
        }

        // Cleanup empty IDs
        if (productData.categoryId === "") productData.categoryId = null;
        if (productData.offerId === "") productData.offerId = null;

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

        // Cleanup empty IDs
        if (productData.categoryId === "") productData.categoryId = null;
        if (productData.offerId === "") productData.offerId = null;

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

const bulkUploadAdminProduct = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = [];
        const csv = require('csv-parser');
        const fs = require('fs');

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    const productsToInsert = [];
                    for (const row of results) {
                        const name = row['Name'] || row['name'];
                        if (!name) continue;

                        let categoryId = null;
                        const catName = row['Category'] || row['category'] || row['Category Name'];
                        if (catName) {
                            const cat = await Category.findOne({ name: new RegExp('^' + catName.trim() + '$', 'i') });
                            if (cat) categoryId = cat._id;
                        }

                        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now() + Math.floor(Math.random() * 1000);

                        productsToInsert.push({
                            name: name.trim(),
                            description: row['Description'] || row['description'] || '',
                            about: row['About'] || row['about'] || '',
                            mrp: parseFloat(row['MRP'] || row['mrp']) || 0,
                            sellingPrice: parseFloat(row['Selling Price'] || row['Price'] || row['selling_price'] || row['price']) || 0,
                            purchasePrice: parseFloat(row['Purchase Price'] || row['purchase_price']) || 0,
                            stock: parseInt(row['Stock'] || row['stock']) || 0,
                            brand: row['Brand'] || row['brand'] || 'Unbranded',
                            manufacturer: row['Manufacturer'] || row['manufacturer'] || '',
                            unit: row['Unit'] || row['unit'] || 'Pcs',
                            sku: (row['SKU'] || row['sku'] || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim(),
                            categoryId: categoryId,
                            category: catName || 'General',
                            slug: slug,
                            status: 'Active'
                        });
                    }

                    if (productsToInsert.length > 0) {
                        await Product.insertMany(productsToInsert);
                    }

                    if (fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                    res.json({ status: 'success', message: `${productsToInsert.length} products uploaded successfully` });
                } catch (innerError) {
                    res.status(500).json({ message: innerError.message });
                }
            });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const downloadSampleCSV = (req, res) => {
    const csvContent = "Name,Description,MRP,Selling Price,Purchase Price,Stock,Category,Brand,Unit,Manufacturer,SKU\nSample Product,This is a description,100,80,60,50,Electronics,Samsung,Pcs,Samsung Corp,PROD001";
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sample_products.csv');
    res.status(200).send(csvContent);
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

const submitKYC = async (req, res) => {
    try {
        const kycData = req.body;
        kycData.submitDate = new Date().toLocaleDateString('en-IN');
        const kyc = await KYC.create(kycData);
        res.status(201).json({ success: true, message: 'KYC submitted successfully', data: kyc });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
    createAdmin,
    getAdminStats,
    getOrders,
    createAdminOrder,
    updateOrderStatus,
    getAdminProducts,
    createAdminProduct,
    updateAdminProduct,
    deleteAdminProduct,
    bulkUploadAdminProduct,
    downloadSampleCSV,
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
    submitKYC,
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
    },
    // Slider Management
    listSliders: async (req, res) => {
        try {
            const sliders = await Slider.find().sort({ sortOrder: 1, createdAt: -1 });
            res.json({ status: 'success', sliders });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    createSlider: async (req, res) => {
        try {
            const { title, subtitle, buttonText, linkUrl, sortOrder, isActive } = req.body;
            let imageData = {};
            
            if (req.file) {
                imageData = {
                    url: `/uploads/${req.file.filename}`
                };
            }
            
            const slider = await Slider.create({
                title, subtitle, buttonText, linkUrl, sortOrder, isActive,
                image: imageData
            });
            
            res.status(201).json({ status: 'success', slider });
        } catch (error) {
            console.error('Create Slider Error:', error);
            res.status(500).json({ message: error.message });
        }
    },
    updateSlider: async (req, res) => {
        try {
            const updateData = { ...req.body };
            
            if (req.file) {
                updateData.image = {
                    url: `/uploads/${req.file.filename}`
                };
            } else {
                // Remove image from updateData if not providing a new file 
                // to prevent overwriting existing image with empty/null
                delete updateData.image; 
            }
            
            const slider = await Slider.findByIdAndUpdate(req.params.id, updateData, { new: true });
            res.json({ status: 'success', slider });
        } catch (error) {
            console.error('Update Slider Error:', error);
            res.status(500).json({ message: error.message });
        }
    },
    deleteSlider: async (req, res) => {
        try {
            await Slider.findByIdAndDelete(req.params.id);
            res.json({ status: 'success', message: 'Slider deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    // Blog Management
    getAllBlogs: async (req, res) => {
        try {
            const blogs = await Blog.find().sort({ createdAt: -1 });
            res.json({ status: 'success', blogs });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    createBlog: async (req, res) => {
        try {
            const blogData = { ...req.body };
            
            // Handle file uploads
            if (req.files) {
                if (req.files.thumbnailImage) {
                    blogData.thumbnailImage = `/uploads/${req.files.thumbnailImage[0].filename}`;
                }
                if (req.files.coverImage) {
                    blogData.coverImage = `/uploads/${req.files.coverImage[0].filename}`;
                }
            }

            if (!blogData.slug && blogData.title) {
                blogData.slug = blogData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
            }
            const blog = await Blog.create(blogData);
            res.status(201).json({ status: 'success', blog });
        } catch (error) {
            console.error('Create Blog Error:', error);
            res.status(500).json({ message: error.message });
        }
    },
    updateBlog: async (req, res) => {
        try {
            const blogData = { ...req.body };
            
            // Handle file uploads
            if (req.files) {
                if (req.files.thumbnailImage) {
                    blogData.thumbnailImage = `/uploads/${req.files.thumbnailImage[0].filename}`;
                }
                if (req.files.coverImage) {
                    blogData.coverImage = `/uploads/${req.files.coverImage[0].filename}`;
                }
            }

            const blog = await Blog.findByIdAndUpdate(req.params.id, blogData, { new: true });
            res.json({ status: 'success', blog });
        } catch (error) {
            console.error('Update Blog Error:', error);
            res.status(500).json({ message: error.message });
        }
    },
    deleteBlog: async (req, res) => {
        try {
            await Blog.findByIdAndDelete(req.params.id);
            res.json({ status: 'success', message: 'Blog deleted' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    likeBlog: async (req, res) => {
        try {
            const blog = await Blog.findOneAndUpdate(
                { $or: [{ _id: req.params.id }, { slug: req.params.id }] },
                { $inc: { likes: 1 } },
                { new: true }
            );
            res.json({ status: 'success', likes: blog.likes });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    // Enquiry Management
    listEnquiries: async (req, res) => {
        try {
            const enquiries = await Enquiry.find().sort({ createdAt: -1 });
            res.json({ status: 'success', enquiries });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    createEnquiry: async (req, res) => {
        try {
            const enquiry = new Enquiry(req.body);
            await enquiry.save();
            res.status(201).json({ status: 'success', enquiry });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    updateEnquiry: async (req, res) => {
        try {
            const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json({ status: 'success', enquiry });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    deleteEnquiry: async (req, res) => {
        try {
            await Enquiry.findByIdAndDelete(req.params.id);
            res.json({ status: 'success', message: 'Enquiry deleted' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    changeAdminPassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const admin = await Admin.findById(req.admin._id);

            if (!admin) {
                return res.status(404).json({ status: 'error', message: 'Admin not found' });
            }

            const isMatch = await admin.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({ status: 'error', message: 'Invalid current password' });
            }

            admin.password = newPassword;
            await admin.save();

            res.json({ status: 'success', message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }
};
