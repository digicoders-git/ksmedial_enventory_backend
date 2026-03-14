const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Shop = require('../models/Shop');
const PrescriptionRequest = require('../models/PrescriptionRequest');
const Prescription = require('../models/Prescription'); // Added
const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs');

// ==========================================
// USER FACING APIS
// ==========================================

// @desc    Get logged-in user's all orders
// @route   GET /api/orders/my-orders
// @access  Private (User Token)
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('items.product', 'name image sellingPrice');

        res.json({ success: true, count: orders.length, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single order detail for logged-in user
// @route   GET /api/orders/my-orders/:id
// @access  Private (User Token)
const getMyOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
            .populate('items.product', 'name image sellingPrice category');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Track an order by ID or orderNumber (Public/User)
// @route   GET /api/orders/track/:identifier
// @access  Private (User Token)
const trackOrder = async (req, res) => {
    try {
        const { identifier } = req.params;

        // Find by orderNumber OR _id
        const query = mongoose.Types.ObjectId.isValid(identifier)
            ? { $or: [{ _id: identifier }, { orderNumber: identifier }], userId: req.user._id }
            : { orderNumber: identifier, userId: req.user._id };

        const order = await Order.findOne(query)
            .populate('items.product', 'name image');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Build timeline from status
        const statusTimeline = [
            { step: 'Order Placed', done: true, time: order.createdAt },
            { step: 'Confirmed', done: ['confirmed', 'shipped', 'delivered', 'Picking', 'Packing', 'Quality Check', 'Scanned For Shipping'].includes(order.status) },
            { step: 'Processing', done: ['shipped', 'delivered', 'Quality Check', 'Scanned For Shipping'].includes(order.status) },
            { step: 'Shipped', done: ['shipped', 'delivered', 'Scanned For Shipping'].includes(order.status) },
            { step: 'Delivered', done: order.status === 'delivered' }
        ];

        res.json({
            success: true,
            tracking: {
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                trackingId: order.trackingId || null,
                trackingUrl: order.trackingUrl || null,
                expectedHandover: order.expectedHandover || null,
                shippingAddress: order.shippingAddress,
                timeline: statusTimeline,
                items: order.items,
                total: order.total,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Place a new order
// @route   POST /api/orders/place
// @access  Private (User Token)
const placeOrder = async (req, res) => {
    try {
        let {
            items, shippingAddress, paymentMethod = 'COD',
            offerCode, notes,
            razorpayOrderId, razorpayPaymentId
        } = req.body;

        // Parse fields if they come as strings (for FormData)
        if (typeof items === 'string') items = JSON.parse(items);
        if (typeof shippingAddress === 'string') shippingAddress = JSON.parse(shippingAddress);

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in order' });
        }
        if (!shippingAddress) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }

        let subtotal = 0;
        const orderItems = [];
        let prescriptionRequired = false;
        const productsRequiringPrescription = [];
        let firstShopId = null;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
            }

            if (!firstShopId) firstShopId = product.shopId;

            const price = product.sellingPrice;
            subtotal += price * item.quantity;
            orderItems.push({
                product: product._id,
                productName: product.name,
                productPrice: price,
                quantity: item.quantity
            });

            // Check if this specific product needs a prescription
            if (product.isPrescriptionRequired) {
                prescriptionRequired = true;
                productsRequiringPrescription.push(product.name);
            }
        }

        // --- Handle File Upload to Cloudinary ---
        let prescriptionImageUrl = req.body.prescriptionImage; // Fallback to body string if provided
        if (req.file) {
            const result = await uploadToCloudinary(req.file.path, 'prescriptions');
            prescriptionImageUrl = result.secure_url;
            // Cleanup local file
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        }

        // --- Prescription Request Flow ---
        // If ANY product in the order requires a prescription, it MUST be verified by Admin
        if (prescriptionRequired) {
            const request = await PrescriptionRequest.create({
                userId: req.user._id,
                items: orderItems,
                shippingAddress,
                paymentMethod,
                subtotal,
                total: subtotal,
                status: 'pending',
                shopId: firstShopId,
                prescriptionImage: prescriptionImageUrl
            });

            return res.status(200).json({
                success: true,
                isPrescriptionRequest: true,
                message: 'Your order includes items requiring a prescription. A request has been sent to the Shop for approval.',
                requestId: request._id
            });
        }

        const orderNumber = `KS4-${Date.now()}`;

        const order = await Order.create({
            userId: req.user._id,
            orderNumber,
            items: orderItems,
            subtotal,
            total: subtotal,
            shippingAddress,
            paymentMethod,
            paymentStatus: (razorpayPaymentId) ? 'paid' : 'pending',
            offerCode,
            notes,
            razorpayOrderId,
            razorpayPaymentId,
            orderType: 'KS4',
            shopId: firstShopId,
            prescriptionImage: prescriptionImageUrl ? { url: prescriptionImageUrl } : undefined
        });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                total: order.total,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// ADMIN / SHOP FACING APIS
// ==========================================

// @desc    Get all online orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
    try {
        const shopId = req.shop._id;
        // Since Admin Panel orders might not have shopId, we might fetch all 
        // Or filter if we add shopId to them. 
        // For now, let's fetch all orders if they share the same DB.
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'name email phone')
            .populate('items.product', 'name sku');
            
        res.json({
            success: true,
            orders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email phone')
            .populate('items.product');
            
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        res.json({
            success: true,
            order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Shop Token)
const updateOrderStatus = async (req, res) => {
    try {
        const { 
            status, 
            problemDescription, 
            trackingId, 
            trackingUrl, 
            expectedHandover,
            paymentStatus
        } = req.body;

        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Update status
        if (status !== undefined) order.status = status;
        if (problemDescription !== undefined) order.problemDescription = problemDescription;
        
        // Update tracking info (user dekh sakta hai)
        if (trackingId !== undefined) order.trackingId = trackingId;
        if (trackingUrl !== undefined) order.trackingUrl = trackingUrl;
        if (expectedHandover !== undefined) order.expectedHandover = expectedHandover;
        if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;
        if (req.body.dispatchProof !== undefined) order.dispatchProof = req.body.dispatchProof;
        
        await order.save();
        
        res.json({
            success: true,
            message: 'Order updated successfully',
            order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Generate test orders for development
// @route   POST /api/orders/seed
// @access  Private
const createTestOrders = async (req, res) => {
    try {
        let shopId = req.shop ? req.shop._id : null;
        
        // Ensure Shop Exists
        if (!shopId) {
            const shop = await Shop.findOne();
            if (shop) {
                shopId = shop._id;
            } else {
                // Create dummy shop if absolutely no shop exists
                const newShop = await Shop.create({
                    shopName: 'Test Shop',
                    ownerName: 'Test Owner',
                    contactNumber: '9999999999',
                    address: 'Test Address',
                    city: 'Test City',
                    state: 'Test State',
                    pincode: '000000',
                    username: 'testshop',
                    password: 'password123', // In real app, hash this
                    email: 'testshop@example.com'
                });
                shopId = newShop._id;
            }
        }

        // Find a user or create a dummy one
        let user = await User.findOne({ role: 'user' }); // Prefer a customer role
        if (!user) user = await User.findOne(); // Fallback to any user
        
        if (!user) {
            user = await User.create({
                name: 'Test Customer',
                email: `customer${Date.now()}@test.com`,
                password: 'password123',
                phone: '9876543210',
                role: 'user'
            });
        }

        // Find some products
        let products = await Product.find({ shopId: shopId }).limit(5);
        
        // If no products for this shop, try to find ANY products or create dummy
        if (products.length === 0) {
            products = await Product.find().limit(5); // Fallback to any products
            
            if (products.length === 0) {
                // Create dummy product if none
                const dummyProduct = await Product.create({
                    name: 'Test Medicine Paracetamol',
                    sku: `TEST-PARA-${Date.now()}`, 
                    description: 'Test Description',
                    purchasePrice: 100, 
                    sellingPrice: 150,
                    quantity: 100,
                    category: 'Medicine',
                    shopId: shopId
                });
                products = [dummyProduct];
            }
        }

        const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'Picking', 'On Hold', 'Packing', 'Problem Queue', 'Picklist Generated', 'Quality Check', 'Scanned For Shipping', 'Unallocated', 'Billing'];
        const paymentMethods = ['COD', 'Online', 'Wallet'];
        const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai'];

        const orders = [];
        for (let i = 0; i < 5; i++) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const qty = Math.floor(Math.random() * 5) + 1;
            const price = randomProduct.sellingPrice || randomProduct.price || 100;
            
            const item = {
                product: randomProduct._id,
                productName: randomProduct.name,
                productPrice: price,
                quantity: qty
            };

            const subtotal = price * qty;
            
            const uniqueSuffix = `${Date.now()}-${i}`;
            orders.push({
                orderNumber: `ORD-${uniqueSuffix}`,
                userId: user._id,
                items: [item],
                subtotal: subtotal,
                total: subtotal,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                shippingAddress: {
                    name: user.name,
                    phone: user.phone || '9999999999',
                    email: user.email,
                    addressLine1: '123 Test Street, Developer Colony',
                    city: cities[Math.floor(Math.random() * cities.length)],
                    state: 'Maharashtra',
                    pincode: '400001',
                    country: 'India'
                },
                shopId: shopId,
                vendorId: `V-${uniqueSuffix}`,
                orderType: 'KS4',
                rapidOrderType: Math.random() > 0.5 ? 'Instant' : 'Standard',
                expectedHandover: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 3) + 1)) // 1-3 days later
            });
        }

        await Order.insertMany(orders);

        res.status(201).json({
            success: true,
            message: '5 Test Orders Created Successfully',
            count: 5
        });

    } catch (error) {
        console.error("Seed Error:", error);
        res.status(500).json({ success: false, message: error.message, error: error.toString() });
    }
};

// @desc    Cancel My Order (User Side)
// @route   PUT /api/orders/my-orders/:id/cancel
// @access  Private (User)
const cancelMyOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or not authorized' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Cannot cancel order with status: ${order.status}` });
        }

        order.status = 'cancelled';
        order.problemDescription = 'Cancelled by user';
        
        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk update orders status
// @route   PUT /api/orders/bulk-status
// @access  Private (Shop Token)
const bulkUpdateOrderStatus = async (req, res) => {
    try {
        const { orderIds, status, trackingUrl, expectedHandover } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide an array of order IDs' });
        }

        if (!status) {
            return res.status(400).json({ success: false, message: 'Please provide a status' });
        }

        const updateData = { status };
        if (trackingUrl) updateData.trackingUrl = trackingUrl;
        if (expectedHandover) updateData.expectedHandover = expectedHandover;

        const result = await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: updateData }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} orders updated successfully`,
            count: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all prescription requests (Admin)
// @route   GET /api/orders/prescription-requests
// @access  Private (Admin)
const getPrescriptionRequests = async (req, res) => {
    try {
        // Filter by shopId to ensure shops only see their own requests
        const requests = await PrescriptionRequest.find({ 
            status: 'pending',
            shopId: req.shop._id 
        })
            .populate('userId', 'firstName lastName phone email')
            .sort({ createdAt: -1 });

        // Fix name display for "undefined undefined"
        const formattedRequests = requests.map(req => {
            const user = req.userId ? req.userId.toObject() : null;
            if (user) {
                user.name = (user.firstName || user.lastName) 
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
                    : user.phone;
            }
            return { ...req.toObject(), userId: user };
        });

        res.json({ success: true, requests: formattedRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve prescription request and create order
// @route   PUT /api/orders/prescription-requests/:id/approve
// @access  Private (Admin)
const approvePrescriptionRequest = async (req, res) => {
    try {
        const request = await PrescriptionRequest.findById(req.params.id).populate('userId');
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
        }

        // Create the actual order
        const orderNumber = `KS4-${Date.now()}`;
        const order = await Order.create({
            userId: request.userId,
            orderNumber,
            items: request.items,
            subtotal: request.subtotal,
            total: request.total,
            shippingAddress: request.shippingAddress,
            paymentMethod: request.paymentMethod,
            status: 'pending',
            orderType: 'KS4',
            shopId: request.shopId,
            prescriptionImage: request.prescriptionImage ? { url: request.prescriptionImage } : undefined
        });

        request.status = 'approved';
        request.orderId = order._id;
        request.adminActionBy = req.user ? req.user._id : null; 
        await request.save();

        // --- Permanent Verification ---
        // Create a verified prescription entry so the user is never blocked again
        await Prescription.findOneAndUpdate(
            { phone: request.userId.phone },
            {
                patient: request.shippingAddress.name || 'User',
                age: 0,
                phone: request.userId.phone,
                status: 'Verified',
                image: 'SYSTEM_APPROVED_VIA_REQUEST',
                shop: request.shopId || (req.user ? req.user._id : order._id) // Fallback
            },
            { upsert: true }
        );

        // --- Cleanup Duplicates ---
        // Mark all other SAME user's pending requests as approved (since we've now verified them)
        const targetUserId = request.userId._id || request.userId;
        await PrescriptionRequest.updateMany(
            { userId: targetUserId, status: 'pending' },
            { $set: { status: 'approved', orderId: order._id } }
        );

        res.json({
            success: true,
            message: 'Prescription approved, user verified, and order created successfully',
            order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const uploadAdminPrescription = async (req, res) => {
    try {
        let prescriptionImage = req.body.prescriptionImage;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.path, 'prescriptions');
            prescriptionImage = result.secure_url;
            // Cleanup
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        }

        if (!prescriptionImage) {
            return res.status(400).json({ success: false, message: 'Please provide prescription image' });
        }

        const request = await PrescriptionRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.prescriptionImage = prescriptionImage;
        await request.save();

        res.json({ success: true, message: 'Prescription uploaded successfully', request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    // User facing
    getMyOrders,
    getMyOrderById,
    trackOrder,
    placeOrder,
    cancelMyOrder,
    // Admin / Shop facing
    getOrders,
    getOrderById,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    createTestOrders,
    getPrescriptionRequests,
    approvePrescriptionRequest,
    uploadAdminPrescription
};
