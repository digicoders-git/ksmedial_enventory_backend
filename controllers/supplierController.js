const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res) => {
    try {
        const keyword = req.query.keyword ? {
            $or: [
                { name: { $regex: req.query.keyword, $options: 'i' } },
                { contactPerson: { $regex: req.query.keyword, $options: 'i' } },
                { city: { $regex: req.query.keyword, $options: 'i' } }
            ]
        } : {};

        const suppliers = await Supplier.find({ shopId: req.shop._id, ...keyword });
        res.json({ success: true, suppliers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a supplier
// @route   POST /api/suppliers
// @access  Private
const createSupplier = async (req, res) => {
    try {
        const { name, contactPerson, phone, email, address, city, gstNumber, drugLicenseNumber, rating, balance, status } = req.body;
        
        const supplier = await Supplier.create({
            name,
            contactPerson,
            phone,
            email,
            address,
            city,
            gstNumber,
            drugLicenseNumber,
            rating: rating || 0,
            balance: balance || 0,
            status: status || 'Active',
            shopId: req.shop._id
        });

        res.status(201).json({ success: true, supplier });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
// @access  Private
const updateSupplier = async (req, res) => {
    try {
        let supplier = await Supplier.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, supplier });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
// @access  Private
const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        await Supplier.deleteOne({ _id: req.params.id });
        res.json({ success: true, message: 'Supplier removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier
};
