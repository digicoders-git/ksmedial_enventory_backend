const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User'); // Import User model for dummy user assignment
const Shop = require('../models/Shop'); // Import Shop model

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
// @access  Private
const updateOrderStatus = async (req, res) => {
    try {
        const { status, problemDescription } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        order.status = status;
        if (problemDescription !== undefined) {
            order.problemDescription = problemDescription;
        }
        
        await order.save();
        
        res.json({
            success: true,
            message: 'Order status updated successfully',
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

module.exports = {
    getOrders,
    getOrderById,
    updateOrderStatus,
    createTestOrders
};
