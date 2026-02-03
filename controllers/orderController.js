const Order = require('../models/Order');
const Product = require('../models/Product');

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
            .populate('userId', 'name email phone');
            
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

module.exports = {
    getOrders,
    getOrderById,
    updateOrderStatus
};
