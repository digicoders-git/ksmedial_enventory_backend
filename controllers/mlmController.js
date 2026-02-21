const mongoose = require('mongoose');
const User = require('../models/User');
const Commission = require('../models/Commission');
const Withdrawal = require('../models/Withdrawal');

const getMLMStats = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // If "global-admin", we show system-wide stats
        if (userId === 'global-admin' || !userId) {
            const totalUsers = await User.countDocuments();
            const totalCommissions = await Commission.aggregate([
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);
            const totalWithdrawals = await Withdrawal.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            return res.json({
                referralCode: "ADMIN",
                totalReferrals: totalUsers - 1,
                activeReferrals: await User.countDocuments({ isActive: true }),
                totalEarnings: totalCommissions[0]?.total || 0,
                availableBalance: (totalCommissions[0]?.total || 0) - (totalWithdrawals[0]?.total || 0),
                monthlyEarnings: 0, // Simplified for now
                level1Referrals: 0,
                level2Referrals: 0,
                level3Referrals: 0,
                recentTransactions: []
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
             return res.status(404).json({ message: 'User not found' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate Level 1, 2, 3
        const level1 = await User.find({ referredBy: userId });
        const level1Ids = level1.map(u => u._id);
        const level2 = await User.find({ referredBy: { $in: level1Ids } });
        const level2Ids = level2.map(u => u._id);
        const level3 = await User.find({ referredBy: { $in: level2Ids } });

        const earnings = await Commission.find({ userId }).sort({ createdAt: -1 }).limit(10);
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        const monthlyEarnings = await Commission.aggregate([
            { $match: { userId: user._id, createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        res.json({
            referralCode: user.referralCode || `KS${user.phone?.slice(-4)}`,
            totalReferrals: level1.length + level2.length + level3.length,
            activeReferrals: level1.filter(u => u.isActive).length + level2.filter(u => u.isActive).length + level3.filter(u => u.isActive).length,
            totalEarnings: user.totalEarnings || 0,
            availableBalance: user.walletBalance || 0,
            monthlyEarnings: monthlyEarnings[0]?.total || 0,
            level1Referrals: level1.length,
            level2Referrals: level2.length,
            level3Referrals: level3.length,
            recentTransactions: earnings.map(e => ({
                id: e._id,
                description: e.description || `Commission from Level ${e.level}`,
                date: e.createdAt.toISOString().split('T')[0],
                amount: e.amount
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getReferrals = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // If global-admin or invalid ID, we could show all users or none. 
        // Showing all users for admin view.
        if (userId === 'global-admin' || !mongoose.Types.ObjectId.isValid(userId)) {
           const allUsers = await User.find().select('firstName lastName email phone isActive createdAt totalEarnings');
           return res.json(allUsers);
        }

        const level1 = await User.find({ referredBy: userId }).select('firstName lastName email phone isActive createdAt totalEarnings');
        res.json(level1);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMLMStats,
    getReferrals
};
