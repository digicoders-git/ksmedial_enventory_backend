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
        let customers = await Customer.find({ ...keyword, shopId: req.shop._id })
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .lean(); // Use lean for performance and to add dynamic fields

        // Dynamic Calculation: Fetch stats for each customer to ensure they are "Proper"
        const Sale = require('../models/Sale');
        const SaleReturn = require('../models/SaleReturn');
        const populatedCustomers = await Promise.all(customers.map(async (cust) => {
            const [customerSales, customerReturns] = await Promise.all([
                Sale.find({ customerId: cust._id, status: { $ne: 'Cancelled' } }),
                SaleReturn.find({ customerId: cust._id })
            ]);

            const saleUnits = customerSales.reduce((acc, sale) => {
                return acc + sale.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            }, 0);

            const returnUnits = customerReturns.reduce((acc, ret) => {
                return acc + ret.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            }, 0);

            const totalRevenue = customerSales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
            const totalReturned = customerReturns.reduce((acc, ret) => acc + (ret.totalAmount || 0), 0);
            
            // Calculate pending balance: Total Amount - Amount Paid
            const totalDue = customerSales.reduce((acc, sale) => {
                const amountPaid = sale.amountPaid || (sale.status === 'Paid' ? sale.totalAmount : 0);
                return acc + (sale.totalAmount - amountPaid);
            }, 0);

            return {
                ...cust,
                totalOrders: Math.max(0, saleUnits - returnUnits),
                totalSpent: Math.max(0, totalRevenue - totalReturned),
                pendingAmount: (cust.pendingAmount || 0) + totalDue
            };
        }));

        // Global Stats for the top cards
        const allSales = await Sale.find({ shopId: req.shop._id, status: { $ne: 'Cancelled' } });
        const allCustomers = await Customer.find({ shopId: req.shop._id });
        
        const globalPendingFromSales = allSales.reduce((acc, sale) => {
            const amountPaid = sale.amountPaid || (sale.status === 'Paid' ? sale.totalAmount : 0);
            return acc + (sale.totalAmount - amountPaid);
        }, 0);
        
        const globalOpeningBalance = allCustomers.reduce((acc, c) => acc + (c.pendingAmount || 0), 0);
        const totalReceivables = globalPendingFromSales + globalOpeningBalance;

        res.json({
            success: true, 
            customers: populatedCustomers,
            page,
            pages: Math.ceil(count / pageSize),
            total: count,
            summary: {
                totalReceivables
            }
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
