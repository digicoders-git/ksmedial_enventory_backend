const Notification = require('../models/Notification');
const Product = require('../models/Product');
const asyncHandler = require('express-async-handler');

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    const shopId = req.shop && req.shop._id ? req.shop._id : null;
    const userId = req.user && req.user._id ? req.user._id : null;
    
    if (shopId) {
        // Check for Critical Low Stock
        const lowStockProducts = await Product.find({ 
            shopId,
            $expr: { $lte: ["$quantity", "$reorderLevel"] } 
        }).limit(5);

        for (const prod of lowStockProducts) {
            const title = 'Critical Low Stock';
            const message = `${prod.name} (Batch ${prod.batchNumber}) is below threshold (${prod.quantity} units left).`;
            const exists = await Notification.findOne({ title, message, shopId });
            
            if (!exists) {
                await Notification.create({
                    type: 'critical',
                    title,
                    message,
                    shopId
                });
            }
        }

        // Check for Expiry
        const products = await Product.find({ shopId, expiryDate: { $ne: 'N/A' } });
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        for (const prod of products) {
            const expDate = new Date(prod.expiryDate);
            if (!isNaN(expDate.getTime()) && expDate <= thirtyDaysFromNow && expDate >= new Date()) {
                const title = 'Expiry Alert';
                const message = `${prod.name} is expiring soon (Date: ${expDate.toLocaleDateString()}).`;
                const exists = await Notification.findOne({ title, message, shopId });

                if (!exists) {
                    await Notification.create({
                        type: 'warning',
                        title,
                        message,
                        shopId
                    });
                }
            }
        }
    }

    // Query Logic:
    // 1. If shopId exists: Show notifications for that shop OR global public
    // 2. If userId exists: Show notifications for that user OR global public
    // 3. Fallback: Show only global public
    const query = { 
        $or: [
            { isPublic: true },
            { shopId: null, userId: null } // Old global style
        ]
    };

    if (shopId) {
        query.$or.push({ shopId });
    }
    
    if (userId) {
        query.$or.push({ userId });
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    res.json(notifications);
});

// @desc    Create a notification
// @route   POST /api/notifications
// @access  Private
const createNotification = asyncHandler(async (req, res) => {
    const { type, title, message, isPublic, userId: targetUserId } = req.body;
    const shopId = isPublic || targetUserId ? null : req.shop?._id;

    const notification = await Notification.create({
        type,
        title,
        message,
        shopId,
        userId: targetUserId || null,
        isPublic: isPublic || false
    });

    res.status(201).json(notification);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
        notification.read = true;
        const updatedNotification = await notification.save();
        res.json(updatedNotification);
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Mark ALL notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    const shopId = req.shop?._id;
    const userId = req.user?._id;
    
    let query = { read: false };
    if (shopId) {
        query.shopId = shopId;
    } else if (userId) {
        query.userId = userId;
    }

    await Notification.updateMany(query, { read: true });
    res.json({ message: 'All notifications marked as read' });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
        await notification.deleteOne();
        res.json({ message: 'Notification removed' });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications
// @access  Private
const clearAllNotifications = asyncHandler(async (req, res) => {
    const shopId = req.shop?._id;
    const userId = req.user?._id;
    
    let query = {};
    if (shopId) {
        query.shopId = shopId;
    } else if (userId) {
        query.userId = userId;
    }

    await Notification.deleteMany(query);
    res.json({ message: 'All notifications cleared' });
});

module.exports = {
    getNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
};
