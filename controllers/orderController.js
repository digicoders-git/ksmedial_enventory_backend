const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Shop = require('../models/Shop');
const PrescriptionRequest = require('../models/PrescriptionRequest');
const Prescription = require('../models/Prescription');
const Offer = require('../models/Offer');
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
            .populate('userId', 'firstName lastName email phone')
            .populate('items.product', 'name image sellingPrice');

        const formattedOrders = orders.map(order => {
            const orderObj = order.toObject();
            if (orderObj.userId) {
                orderObj.userId.name = (orderObj.userId.firstName || orderObj.userId.lastName)
                    ? `${orderObj.userId.firstName || ''} ${orderObj.userId.lastName || ''}`.trim()
                    : orderObj.userId.phone;
            }
            return orderObj;
        });

        res.json({ success: true, count: orders.length, orders: formattedOrders });
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
            .populate('userId', 'firstName lastName email phone')
            .populate('items.product', 'name image sellingPrice category');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const orderObj = order.toObject();
        if (orderObj.userId) {
            orderObj.userId.name = (orderObj.userId.firstName || orderObj.userId.lastName)
                ? `${orderObj.userId.firstName || ''} ${orderObj.userId.lastName || ''}`.trim()
                : orderObj.userId.phone;
        }

        res.json({ success: true, order: orderObj });
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

        const query = mongoose.Types.ObjectId.isValid(identifier)
            ? { $or: [{ _id: identifier }, { orderNumber: identifier }], userId: req.user._id }
            : { orderNumber: identifier, userId: req.user._id };

        const order = await Order.findOne(query)
            .populate('items.product', 'name image');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const isConfirmed = ['confirmed', 'shipped', 'delivered', 'Picking', 'Packing', 'Quality Check', 'Scanned For Shipping', 'On Hold', 'Billing'].includes(order.status);
        const isProcessing = ['shipped', 'delivered', 'Picking', 'Packing', 'Quality Check', 'Scanned For Shipping', 'Billing'].includes(order.status);
        const isShipped = ['shipped', 'delivered', 'Scanned For Shipping'].includes(order.status);
        const isDelivered = order.status === 'delivered';

        const statusTimeline = [
            { step: 'Order Placed', done: true, time: order.createdAt },
            { step: 'Confirmed', done: isConfirmed, time: isConfirmed ? (order.status === 'confirmed' ? order.updatedAt : order.createdAt) : null },
            { step: 'Processing', done: isProcessing, time: isProcessing ? order.updatedAt : null },
            { step: 'Shipped', done: isShipped, time: isShipped ? order.updatedAt : null },
            { step: 'Delivered', done: isDelivered, time: isDelivered ? order.updatedAt : null }
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
                expectedHandover: order.expectedHandover || new Date(new Date(order.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000),
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

        if (typeof items === 'string') items = JSON.parse(items);
        if (typeof shippingAddress === 'string') shippingAddress = JSON.parse(shippingAddress);

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in order' });
        }
        if (!shippingAddress) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }

        if (!shippingAddress.name || shippingAddress.name.includes('undefined')) {
            const userName = (req.user.firstName || req.user.lastName)
                ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
                : req.user.phone;
            shippingAddress.name = userName;
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
            const newItem = {
                product: product._id,
                productName: product.name,
                productPrice: price,
                quantity: item.quantity,
                supplierSkuId: product.sku || product.skuId || product.SKU || product.barcode || '',
                skuId: product.sku || product.skuId || product.SKU || product.barcode || '',
                pack: product.packing || product.packSize || '',
            };
            orderItems.push(newItem);

            // Prescription check: ONLY use the explicit isPrescriptionRequired flag on the product
            // Also check if item-level flag is sent by consumer app
            if (
                product.isPrescriptionRequired === true ||
                item.isPrescriptionRequired === true ||
                item.isPrescriptionRequired === 'true'
            ) {
                prescriptionRequired = true;
                productsRequiringPrescription.push(product.name);
            }
        }

        // --- Offer/Coupon Logic ---
        let discount = 0;
        let finalTotal = subtotal;

        if (offerCode) {
            const offer = await Offer.findOne({ code: offerCode, isActive: true });
            if (!offer) {
                return res.status(400).json({ success: false, message: 'Invalid or expired offer code' });
            }
            if (subtotal < offer.minOrderAmount) {
                return res.status(400).json({ success: false, message: `Minimum order amount for this offer is ₹${offer.minOrderAmount}` });
            }
            if (offer.discountType === 'percentage') {
                discount = (subtotal * offer.discountValue) / 100;
                if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) {
                    discount = offer.maxDiscountAmount;
                }
            } else {
                discount = offer.discountValue;
            }
            finalTotal = subtotal - discount;
            if (finalTotal < 0) finalTotal = 0;
        }

        // --- Handle File Upload to Cloudinary ---
        let prescriptionImageUrl = req.body.prescriptionImage || req.body.prescriptionImageUrl || req.body.prescription;
        
        // SUPPORT: If frontend explicitly says this is a prescription order
        const explicitlyRequested = req.body.requestPrescription === true || 
                                     req.body.requestPrescription === 'true' ||
                                     req.body.isPrescriptionOrder === true ||
                                     req.body.isPrescriptionOrder === 'true';
        
        // Support any files from multer regardless of name
        const anyFileUpload = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        // If user sent a file, mark as prescription flow regardless of upload success
        const userSentFile = !!anyFileUpload;
        
        if (anyFileUpload) {
            try {
                const result = await uploadToCloudinary(anyFileUpload.path, 'prescriptions');
                prescriptionImageUrl = result?.secure_url || prescriptionImageUrl;
            } catch (uploadErr) {
                console.error('Cloudinary upload error:', uploadErr);
            } finally {
                if (fs.existsSync(anyFileUpload.path)) fs.unlinkSync(anyFileUpload.path);
            }
        }

        // --- Prescription Required Flow ---
        // Goes to PrescriptionRequest if: product needs Rx, OR user uploaded a file, OR explicitly requested
        if (prescriptionRequired || userSentFile || prescriptionImageUrl || explicitlyRequested) {
            const request = await PrescriptionRequest.create({
                userId: req.user._id,
                items: orderItems,
                shippingAddress,
                paymentMethod,
                subtotal,
                discount,
                offerCode,
                total: finalTotal,
                status: 'pending',
                shopId: firstShopId,
                prescriptionImage: prescriptionImageUrl || undefined
            });

            try {
                const Notification = require('../models/Notification');
                await Notification.create({
                    type: 'info',
                    title: 'Prescription Verification Pending',
                    message: prescriptionImageUrl 
                        ? `Your prescription is under review. Your order will be confirmed once verified.`
                        : `Your order requires a prescription which has been requested. It will be confirmed once the prescription is provided and verified.`,
                    userId: req.user._id
                });
            } catch (err) { console.error('Notification Error:', err); }

            return res.status(201).json({
                success: true,
                isPrescriptionRequest: true,
                message: prescriptionImageUrl 
                    ? 'Your prescription has been received. Your order will be confirmed once verified by our team.'
                    : 'Your order requires a prescription verification. Once verified/provided by our admin, your order will be confirmed.',
                requestId: request._id,
                hasPrescription: !!(prescriptionImageUrl || userSentFile)
            });
        }

        // --- FINAL SAFETY GATE ---
        if (prescriptionRequired || userSentFile || prescriptionImageUrl || explicitlyRequested) {
            return res.status(201).json({
                success: true,
                isPrescriptionRequest: true,
                message: 'Processing as prescription request...',
                requestId: 'RETRY-SAFETY'
            });
        }

        // --- Normal Order Flow (no prescription needed) ---
        const orderNumber = `KS4-${Date.now()}`;

        const order = await Order.create({
            userId: req.user._id,
            orderNumber,
            items: orderItems,
            subtotal,
            discount,
            total: finalTotal,
            shippingAddress,
            paymentMethod,
            paymentStatus: (razorpayPaymentId) ? 'paid' : 'pending',
            offerCode,
            notes,
            razorpayOrderId,
            razorpayPaymentId,
            orderType: 'KS4',
            shopId: firstShopId,
            prescriptionPending: false,
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
        // Exclude orders that are pending prescription approval
        const orders = await Order.find({ prescriptionPending: { $ne: true } })
            .sort({ createdAt: -1 })
            .populate('userId', 'firstName lastName email phone')
            .populate('items.product', 'name sku');

        const formattedOrders = orders.map(order => {
            const orderObj = order.toObject();
            if (orderObj.userId) {
                orderObj.userId.name = (orderObj.userId.firstName || orderObj.userId.lastName)
                    ? `${orderObj.userId.firstName || ''} ${orderObj.userId.lastName || ''}`.trim()
                    : orderObj.userId.phone || 'Unknown User';
            }
            return orderObj;
        });

        res.json({ success: true, orders: formattedOrders });
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
            .populate('userId', 'firstName lastName email phone')
            .populate('items.product');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const orderObj = order.toObject();
        if (orderObj.userId) {
            orderObj.userId.name = (orderObj.userId.firstName || orderObj.userId.lastName)
                ? `${orderObj.userId.firstName || ''} ${orderObj.userId.lastName || ''}`.trim()
                : orderObj.userId.phone || 'Unknown User';
        }

        res.json({ success: true, order: orderObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Shop Token)
const updateOrderStatus = async (req, res) => {
    try {
        const { status, problemDescription, trackingId, trackingUrl, expectedHandover, paymentStatus } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (status !== undefined) order.status = status;
        if (problemDescription !== undefined) order.problemDescription = problemDescription;
        if (trackingId !== undefined) order.trackingId = trackingId;
        if (trackingUrl !== undefined) order.trackingUrl = trackingUrl;
        if (expectedHandover !== undefined) order.expectedHandover = expectedHandover;
        if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;

        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.path, 'dispatch_proofs');
                order.dispatchProof = result.secure_url;
            } finally {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            }
        } else if (req.body.dispatchProof && !req.body.dispatchProof.startsWith('data:image')) {
            order.dispatchProof = req.body.dispatchProof;
        }

        await order.save();
        res.json({ success: true, message: 'Order updated successfully', order });
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
        if (!shopId) {
            const shop = await Shop.findOne();
            if (shop) {
                shopId = shop._id;
            } else {
                const newShop = await Shop.create({
                    shopName: 'Test Shop', ownerName: 'Test Owner', contactNumber: '9999999999',
                    address: 'Test Address', city: 'Test City', state: 'Test State',
                    pincode: '000000', username: 'testshop', password: 'password123', email: 'testshop@example.com'
                });
                shopId = newShop._id;
            }
        }

        let user = await User.findOne({ role: 'user' });
        if (!user) user = await User.findOne();
        if (!user) {
            user = await User.create({
                name: 'Test Customer', email: `customer${Date.now()}@test.com`,
                password: 'password123', phone: '9876543210', role: 'user'
            });
        }

        let products = await Product.find({ shopId }).limit(5);
        if (products.length === 0) products = await Product.find().limit(5);
        if (products.length === 0) {
            const dummyProduct = await Product.create({
                name: 'Test Medicine Paracetamol', sku: `TEST-PARA-${Date.now()}`,
                description: 'Test', purchasePrice: 100, sellingPrice: 150, quantity: 100,
                category: 'Medicine', shopId
            });
            products = [dummyProduct];
        }

        const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'Picking', 'On Hold', 'Packing', 'Problem Queue', 'Picklist Generated', 'Quality Check', 'Scanned For Shipping', 'Unallocated', 'Billing'];
        const paymentMethods = ['COD', 'Online', 'Wallet'];
        const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai'];

        const orders = [];
        for (let i = 0; i < 5; i++) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const qty = Math.floor(Math.random() * 5) + 1;
            const price = randomProduct.sellingPrice || 100;
            const subtotal = price * qty;
            const uniqueSuffix = `${Date.now()}-${i}`;
            orders.push({
                orderNumber: `ORD-${uniqueSuffix}`,
                userId: user._id,
                items: [{ product: randomProduct._id, productName: randomProduct.name, productPrice: price, quantity: qty }],
                subtotal, total: subtotal,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                shippingAddress: {
                    name: user.name, phone: user.phone || '9999999999', email: user.email,
                    addressLine1: '123 Test Street', city: cities[Math.floor(Math.random() * cities.length)],
                    state: 'Maharashtra', pincode: '400001', country: 'India'
                },
                shopId, orderType: 'KS4',
                expectedHandover: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 3) + 1))
            });
        }

        await Order.insertMany(orders);
        res.status(201).json({ success: true, message: '5 Test Orders Created Successfully', count: 5 });
    } catch (error) {
        console.error('Seed Error:', error);
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
        res.json({ success: true, message: 'Order cancelled successfully', order });
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
        const result = await Order.updateMany({ _id: { $in: orderIds } }, { $set: updateData });
        res.json({ success: true, message: `${result.modifiedCount} orders updated successfully`, count: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all prescription requests (Admin)
// @route   GET /api/orders/prescription/requests
// @access  Private (Admin)
const getPrescriptionRequests = async (req, res) => {
    try {
        // Both admin and shop can see pending requests
        const query = { status: 'pending' };
        if (req.shop) query.shopId = req.shop._id;

        const requests = await PrescriptionRequest.find(query)
            .populate('userId', 'firstName lastName phone email')
            .sort({ createdAt: -1 });

        const formattedRequests = requests.map(r => {
            const user = r.userId ? r.userId.toObject() : null;
            if (user) {
                user.name = (user.firstName || user.lastName)
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : user.phone;
            }
            return { ...r.toObject(), userId: user };
        });

        res.json({ success: true, requests: formattedRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve prescription request and create order
// @route   PUT /api/orders/prescription/requests/:id/approve
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

        let order = null;

        // Legacy: if a pre-created order was linked (old behavior), just confirm it
        if (request.orderId) {
            order = await Order.findById(request.orderId);
            if (order) {
                order.status = 'confirmed';
                order.prescriptionPending = false;
                await order.save();
            }
        }

        // New flow: No pre-created order → create the order NOW on admin approval
        if (!order) {
            const orderNumber = `KS4-${Date.now()}`;
            order = await Order.create({
                userId: request.userId._id || request.userId,
                orderNumber,
                items: request.items,
                subtotal: request.subtotal,
                discount: request.discount || 0,
                offerCode: request.offerCode,
                total: request.total,
                shippingAddress: request.shippingAddress,
                paymentMethod: request.paymentMethod,
                status: 'confirmed',
                orderType: 'KS4',
                shopId: request.shopId,
                prescriptionPending: false,
                prescriptionImage: request.prescriptionImage ? { url: request.prescriptionImage } : undefined,
                expectedHandover: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            });
        }

        request.status = 'approved';
        request.orderId = order._id;
        request.adminActionBy = req.admin ? req.admin._id : (req.user ? req.user._id : null);
        await request.save();

        // --- Notify User ---
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                type: 'success',
                title: 'Prescription Approved!',
                message: `Your prescription has been verified. Order #${order.orderNumber} has been confirmed and is now being processed.`,
                userId: request.userId._id || request.userId
            });
        } catch (err) { console.error('Notification Error:', err); }

        // --- Permanent Verification ---
        await Prescription.findOneAndUpdate(
            { phone: request.userId.phone },
            {
                patient: request.shippingAddress.name || 'User',
                age: 0,
                phone: request.userId.phone,
                status: 'Verified',
                image: request.prescriptionImage || 'https://res.cloudinary.com/drwss54l2/image/upload/v1773429820/inventory_panel_profiles/mnrirlvh2byyvowecmqa.png',
                shop: request.shopId || order._id
            },
            { upsert: true }
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

// @desc    Reject prescription request
// @route   PUT /api/orders/prescription/requests/:id/reject
// @access  Private (Admin)
const rejectPrescriptionRequest = async (req, res) => {
    try {
        const { rejectionReason } = req.body;
        const request = await PrescriptionRequest.findById(req.params.id).populate('userId');
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
        }

        request.status = 'rejected';
        request.rejectionReason = rejectionReason || 'Rejected by admin';
        request.adminActionBy = req.admin ? req.admin._id : (req.user ? req.user._id : null);
        await request.save();

        // Notify user
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                type: 'error',
                title: 'Prescription Request Rejected',
                message: rejectionReason
                    ? `Your prescription request was rejected. Reason: ${rejectionReason}`
                    : 'Your prescription request was rejected by our team. Please contact support.',
                userId: request.userId._id || request.userId
            });
        } catch (err) { console.error('Notification Error:', err); }

        res.json({ success: true, message: 'Prescription request rejected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Upload prescription by admin/doctor for a pending request
// @route   PUT /api/orders/prescription/requests/:id/upload
// @access  Private (Admin)
const uploadAdminPrescription = async (req, res) => {
    try {
        let prescriptionImage = req.body.prescriptionImage;

        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.path, 'prescriptions');
                prescriptionImage = result.secure_url;
            } finally {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            }
        }

        if (!prescriptionImage) {
            return res.status(400).json({ success: false, message: 'Please provide prescription image' });
        }

        const request = await PrescriptionRequest.findById(req.params.id).populate('userId');
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
        }

        // 1. Update the image in the request
        request.prescriptionImage = prescriptionImage;

        // 2. Check for legacy linked order
        let order = null;
        if (request.orderId) {
            order = await Order.findById(request.orderId);
            if (order) {
                order.status = 'confirmed';
                order.prescriptionPending = false;
                order.prescriptionImage = { url: prescriptionImage };
                await order.save();
            }
        }

        // New flow: If no linked order, create it now
        if (!order) {
            const orderNumber = `KS4-${Date.now()}`;
            order = await Order.create({
                userId: request.userId._id || request.userId,
                orderNumber,
                items: request.items,
                subtotal: request.subtotal,
                discount: request.discount || 0,
                offerCode: request.offerCode,
                total: request.total,
                shippingAddress: request.shippingAddress,
                paymentMethod: request.paymentMethod,
                status: 'confirmed',
                orderType: 'KS4',
                shopId: request.shopId,
                prescriptionPending: false,
                prescriptionImage: { url: prescriptionImage },
                expectedHandover: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            });
        }

        request.status = 'approved';
        request.orderId = order._id;
        request.adminActionBy = req.admin ? req.admin._id : (req.user ? req.user._id : null);
        await request.save();

        // 3. Permanent verification for user
        await Prescription.findOneAndUpdate(
            { phone: request.userId.phone },
            {
                patient: request.shippingAddress.name || 'User',
                age: 0,
                phone: request.userId.phone,
                status: 'Verified',
                image: prescriptionImage,
                shop: request.shopId || order._id
            },
            { upsert: true }
        );

        res.json({
            success: true,
            message: 'Doctor prescription uploaded and order confirmed successfully',
            orderId: order._id,
            request
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Request prescription from admin/doctor (User does NOT have prescription)
// @route   POST /api/orders/request-prescription
// @access  Private (User Token)
const requestPrescription = async (req, res) => {
    try {
        let { items, shippingAddress, paymentMethod = 'COD', offerCode, notes } = req.body;

        if (typeof items === 'string') items = JSON.parse(items);
        if (typeof shippingAddress === 'string') shippingAddress = JSON.parse(shippingAddress);

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in request' });
        }
        if (!shippingAddress) {
            return res.status(400).json({ success: false, message: 'Shipping address is required' });
        }

        if (!shippingAddress.name || shippingAddress.name.includes('undefined')) {
            const userName = (req.user.firstName || req.user.lastName)
                ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
                : req.user.phone;
            shippingAddress.name = userName;
        }

        let subtotal = 0;
        const orderItems = [];
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
            orderItems.push({ product: product._id, productName: product.name, productPrice: price, quantity: item.quantity });
            if (product.isPrescriptionRequired === true || product.isPrescriptionRequired === 'true') {
                productsRequiringPrescription.push(product.name);
            }
        }

        if (productsRequiringPrescription.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'None of the products in your cart require a prescription. Please use the normal order flow.'
            });
        }

        let discount = 0;
        let finalTotal = subtotal;
        if (offerCode) {
            const offer = await Offer.findOne({ code: offerCode, isActive: true });
            if (offer && subtotal >= offer.minOrderAmount) {
                if (offer.discountType === 'percentage') {
                    discount = (subtotal * offer.discountValue) / 100;
                    if (offer.maxDiscountAmount && discount > offer.maxDiscountAmount) discount = offer.maxDiscountAmount;
                } else {
                    discount = offer.discountValue;
                }
                finalTotal = subtotal - discount;
                if (finalTotal < 0) finalTotal = 0;
            }
        }

        // Create ONLY a PrescriptionRequest (NO order yet)
        const request = await PrescriptionRequest.create({
            userId: req.user._id,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            discount,
            offerCode,
            total: finalTotal,
            status: 'pending',
            shopId: firstShopId
        });

        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                type: 'info',
                title: 'Prescription Requested',
                message: 'Your prescription request has been sent to our doctor/admin. Once provided, your order will be placed automatically.',
                userId: req.user._id
            });
        } catch (err) { console.error('Notification Error:', err); }

        res.status(200).json({
            success: true,
            isPrescriptionRequest: true,
            hasPrescription: false,
            message: 'Your prescription request has been sent to our admin/doctor. Once they provide the prescription, your order will be placed and confirmed automatically.',
            requestId: request._id,
            productsRequiringPrescription
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get my prescription requests (User)
// @route   GET /api/orders/my-prescription-requests
// @access  Private (User Token)
const getMyPrescriptionRequests = async (req, res) => {
    try {
        const requests = await PrescriptionRequest.find({ userId: req.user._id })
            .populate('orderId', 'orderNumber status')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: requests.length,
            requests: requests.map(r => ({
                _id: r._id,
                items: r.items,
                status: r.status,
                prescriptionImage: r.prescriptionImage || null,
                orderId: r.orderId ? r.orderId._id : null,
                orderNumber: r.orderId ? r.orderId.orderNumber : null,
                orderStatus: r.orderId ? r.orderId.status : null,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            }))
        });
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
    requestPrescription,
    getMyPrescriptionRequests,
    // Admin / Shop facing
    getOrders,
    getOrderById,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    createTestOrders,
    getPrescriptionRequests,
    approvePrescriptionRequest,
    uploadAdminPrescription,
    rejectPrescriptionRequest
};
