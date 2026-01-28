const Shop = require('../models/Shop');

// @desc    Change Password
// @route   PUT /api/security/password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const shop = await Shop.findById(req.shop._id);

        if (shop && shop.password === currentPassword) {
            shop.password = newPassword;
            await shop.save();
            res.json({ success: true, message: 'Password updated successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid current password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle 2FA
// @route   PUT /api/security/2fa
// @access  Private
const toggle2FA = async (req, res) => {
    try {
        const shop = await Shop.findById(req.shop._id);
        
        if (shop) {
            shop.twoFactorEnabled = !shop.twoFactorEnabled;
            await shop.save();
            
            res.json({ 
                success: true, 
                message: shop.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled',
                enabled: shop.twoFactorEnabled 
            });
        } else {
            res.status(404).json({ success: false, message: 'Shop not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Security Settings (2FA status, etc)
// @route   GET /api/security
// @access  Private
const getSecuritySettings = async (req, res) => {
    try {
        const shop = await Shop.findById(req.shop._id).select('twoFactorEnabled');
        if(shop) {
             res.json({
                success: true,
                twoFactorEnabled: shop.twoFactorEnabled || false,
                // Mock sessions for now as per requirement
                sessions: [
                    {
                        device: 'Windows PC - Chrome',
                        location: 'Mumbai, IN', // Static for now
                        ip: '192.168.1.1',
                        status: 'Online Now',
                        isCurrent: true,
                        type: 'desktop'
                    }
                ]
            });
        } else {
             res.status(404).json({ success: false, message: 'Shop not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    changePassword,
    toggle2FA,
    getSecuritySettings
};
