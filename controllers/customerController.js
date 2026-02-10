const Customer = require('../models/Customer');

// @desc    Get all customers with search and pagination
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 10;
        const page = Number(req.query.pageNumber) || 1;
        const keyword = req.query.keyword ? {
            $or: [
                { name: { $regex: req.query.keyword, $options: 'i' } },
                { phone: { $regex: req.query.keyword, $options: 'i' } },
                { address: { $regex: req.query.keyword, $options: 'i' } } // Assuming address/location is searchable
            ]
        } : {};

        const count = await Customer.countDocuments({ ...keyword, shopId: req.shop._id });
        const customers = await Customer.find({ ...keyword, shopId: req.shop._id })
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            success: true, 
            customers,
            page,
            pages: Math.ceil(count / pageSize),
            total: count
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
    try {
        const { name, phone, email, address, pendingAmount } = req.body;
        
        const customer = await Customer.create({
            name,
            phone,
            email,
            address,
            pendingAmount: pendingAmount || 0,
            shopId: req.shop._id
        });

        res.status(201).json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
    try {
        let customer = await Customer.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        await customer.deleteOne();
        res.json({ success: true, message: 'Customer removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Clear all customers
// @route   DELETE /api/customers/clear-all
// @access  Private
const clearAllCustomers = async (req, res) => {
    try {
        await Customer.deleteMany({ shopId: req.shop._id });
        res.json({ success: true, message: 'All customers cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    clearAllCustomers
};
