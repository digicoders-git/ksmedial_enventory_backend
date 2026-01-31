const ActivityLog = require('../models/ActivityLog');

// @desc    Get activity logs
// @route   GET /api/activity
// @access  Private
const getActivities = async (req, res) => {
    try {
        const pageSize = 20;
        const page = Number(req.query.pageNumber) || 1;
        
        const query = { shopId: req.shop._id };
        
        if (req.query.type && req.query.type !== 'All') {
            query.type = req.query.type;
        }

        const count = await ActivityLog.countDocuments(query);
        const activities = await ActivityLog.find(query)
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ activities, page, pages: Math.ceil(count / pageSize) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Log a new activity (Internal use or API)
// @access  Private
const logActivity = async (req, action, details, type, userOverride) => {
    try {
        const ip = (req && req.headers ? req.headers['x-forwarded-for'] : null) || 
                   (req && req.socket ? req.socket.remoteAddress : null) || 
                   '127.0.0.1';
        
        await ActivityLog.create({
            shopId: req.shop._id,
            user: userOverride || req.shop.ownerName,
            action,
            details,
            type,
            ip
        });
    } catch (error) {
        console.error('Activity Logging Failed:', error);
    }
};

module.exports = {
    getActivities,
    logActivity
};
