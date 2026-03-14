const User = require('../models/User');

// @desc    Get all addresses of logged-in user
// @route   GET /api/address
// @access  Private (User Token)
const getAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('addresses');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, count: user.addresses.length, addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add a new address
// @route   POST /api/address
// @access  Private (User Token)
const addAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { label, fullName, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault } = req.body;

        // If new address is marked as default, unset others
        if (isDefault) {
            user.addresses.forEach(addr => { addr.isDefault = false; });
        }

        // If no addresses yet, make first one default automatically
        const makeDefault = isDefault || user.addresses.length === 0;

        user.addresses.push({
            label: label || 'Home',
            fullName,
            phone,
            addressLine1,
            addressLine2,
            city,
            state,
            pincode,
            country: country || 'India',
            isDefault: makeDefault
        });

        await user.save();

        const newAddress = user.addresses[user.addresses.length - 1];
        res.status(201).json({ success: true, message: 'Address added successfully', address: newAddress });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update an address
// @route   PUT /api/address/:id
// @access  Private (User Token)
const updateAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const address = user.addresses.id(req.params.id);
        if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

        const { label, fullName, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault } = req.body;

        // If this address is being set as default, unset others
        if (isDefault) {
            user.addresses.forEach(addr => { addr.isDefault = false; });
        }

        // Update fields
        if (label !== undefined) address.label = label;
        if (fullName !== undefined) address.fullName = fullName;
        if (phone !== undefined) address.phone = phone;
        if (addressLine1 !== undefined) address.addressLine1 = addressLine1;
        if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
        if (city !== undefined) address.city = city;
        if (state !== undefined) address.state = state;
        if (pincode !== undefined) address.pincode = pincode;
        if (country !== undefined) address.country = country;
        if (isDefault !== undefined) address.isDefault = isDefault;

        await user.save();

        res.json({ success: true, message: 'Address updated successfully', address });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete an address
// @route   DELETE /api/address/:id
// @access  Private (User Token)
const deleteAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const address = user.addresses.id(req.params.id);
        if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

        const wasDefault = address.isDefault;
        address.deleteOne();

        // If deleted address was default, set first remaining as default
        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();

        res.json({ success: true, message: 'Address deleted successfully', addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Set an address as default
// @route   PUT /api/address/:id/default
// @access  Private (User Token)
const setDefaultAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const address = user.addresses.id(req.params.id);
        if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

        // Unset all, then set selected
        user.addresses.forEach(addr => { addr.isDefault = false; });
        address.isDefault = true;

        await user.save();

        res.json({ success: true, message: 'Default address updated', addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
