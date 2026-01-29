const Shop = require('../models/Shop');
const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs');
const { logActivity } = require('./activityController');

// @desc    Get current shop profile
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        const shop = await Shop.findById(req.shop._id).select('-password');
        if (shop) {
            res.json({
                success: true,
                user: {
                    id: shop._id,
                    name: shop.ownerName, // Owner Name
                    shopName: shop.shopName, // Store Name
                    email: shop.email,
                    phone: shop.contactNumber,
                    role: 'Administrator',
                    location: `${shop.city}, ${shop.state}`,
                    address: shop.address,
                    city: shop.city,
                    state: shop.state,
                    pincode: shop.pincode,
                    joinDate: shop.createdAt,
                    bio: shop.bio || '',
                    tagline: shop.tagline || '',
                    website: shop.website || '',
                    gstin: shop.gstNumber || '',
                    dlNo: shop.licenseNumber || '',
                    avatar: shop.image || 'https://ui-avatars.com/api/?name=' + shop.ownerName + '&background=random',
                    inventorySettings: shop.inventorySettings,
                    appSettings: shop.appSettings || {
                        language: 'en-US',
                        currency: 'INR',
                        dateFormat: 'DD-MM-YYYY',
                        enableSound: true,
                        emailAlerts: true,
                        pushNotifications: true,
                        printerType: 'thermal-3inch',
                        autoPrint: true,
                        scannerMode: 'keyboard'
                    }
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'Profile not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update profile details
// @route   PUT /api/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const shop = await Shop.findById(req.shop._id);

        if (shop) {
            shop.ownerName = req.body.name || shop.ownerName; // Usually Owner Name UI field maps to this
            shop.shopName = req.body.shopName || shop.shopName;
            shop.email = req.body.email || shop.email;
            shop.contactNumber = req.body.phone || shop.contactNumber;
            shop.bio = req.body.bio || shop.bio;
            
            // Branding
            shop.tagline = req.body.tagline || shop.tagline;
            shop.website = req.body.website || shop.website;

            // Address & Location
            shop.address = req.body.address || shop.address;
            shop.city = req.body.city || shop.city;
            shop.state = req.body.state || shop.state;
            shop.pincode = req.body.pincode || shop.pincode;

            // Legal
            shop.gstNumber = req.body.gstin || shop.gstNumber;
            shop.licenseNumber = req.body.dlNo || shop.licenseNumber;

            // Inventory Settings
            if (req.body.inventorySettings) {
                shop.inventorySettings = {
                    ...shop.inventorySettings,
                    ...req.body.inventorySettings
                };
            }

            // App Settings
            if (req.body.appSettings) {
                shop.appSettings = {
                    ...shop.appSettings,
                    ...req.body.appSettings
                };
            }

            const updatedShop = await shop.save();
            logActivity(req, 'Updated profile', 'User updated settings', 'Profile');

            res.json({
                success: true,
                user: {
                    id: updatedShop._id,
                    name: updatedShop.ownerName,
                    shopName: updatedShop.shopName,
                    email: updatedShop.email,
                    phone: updatedShop.contactNumber,
                    bio: updatedShop.bio,
                    tagline: updatedShop.tagline,
                    website: updatedShop.website,
                    gstin: updatedShop.gstNumber,
                    dlNo: updatedShop.licenseNumber,
                    avatar: updatedShop.image,
                    address: updatedShop.address,
                    city: updatedShop.city,
                    state: updatedShop.state,
                    pincode: updatedShop.pincode,
                    location: `${updatedShop.city}, ${updatedShop.state}`,
                    inventorySettings: updatedShop.inventorySettings,
                    appSettings: updatedShop.appSettings
                },
                message: 'Profile updated successfully'
            });
        } else {
            res.status(404).json({ success: false, message: 'Shop not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Upload profile picture
// @route   POST /api/profile/upload-avatar
// @access  Private
const uploadAvatar = async (req, res) => {
    console.log('Upload Avatar Request:', req.file);
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        console.log('File path:', req.file.path);
        
        // --- PRODUCTION MODE: Upload to Cloudinary ---
        const result = await uploadToCloudinary(req.file.path); 
        console.log('Cloudinary Result:', result);
        
        // Delete local file
        if (fs.existsSync(req.file.path)) {
             fs.unlinkSync(req.file.path);
        }

        // Update database
        const shop = await Shop.findById(req.shop._id);
        shop.image = result.secure_url; 
        await shop.save();
        logActivity(req, 'Updated profile picture', 'User uploaded a new avatar', 'Profile');

        res.json({
            success: true,
            avatar: shop.image,
            message: 'Profile picture updated successfully'
        });
        // ---------------------------------------------------

    } catch (error) {
        // Try to delete local file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Image upload failed' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    uploadAvatar
};
