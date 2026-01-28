const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// @desc    Create new sale
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
    try {
        const {
            customer, // Object or ID, handle appropriately
            items,
            subTotal,
            tax,
            discount,
            totalAmount,
            paymentMethod,
            amountPaid
        } = req.body;

        // 1. Handle Customer
        let customerId = null;
        let customerName = 'Walk-in Customer';

        if (customer) {
            if (customer._id) {
                // Existing customer selected
                 customerId = customer._id;
                 customerName = customer.name;
            } else if (typeof customer === 'string') {
                // Check if it's an ID
                const existing = await Customer.findById(customer);
                if(existing) {
                    customerId = existing._id;
                    customerName = existing.name;
                } else {
                    // Treat as name for walk-in
                    customerName = customer;
                }
            } else if (customer.name) {
                 // New customer object passed? Or just name
                 customerName = customer.name;
            }
        }

        // 2. Process Items and Check Stock
        for (const item of items) {
             const product = await Product.findById(item.productId);
             if (!product) {
                 return res.status(404).json({ success: false, message: `Product not found: ${item.name}` });
             }
             if (product.stock < item.quantity) {
                 return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
             }
        }

        // 3. Create Sale Record
        const invoiceNumber = 'INV-' + Date.now(); // Simple generator, can be improved

        const sale = new Sale({
            invoiceNumber,
            customerId,
            customerName,
            items,
            subTotal, // Make sure model supports this or calculate
            tax,      // Model might not have these fields, verifying Sale.js content... 
                      // Sale.js only had totalAmount. I should update Sale.js or map to it.
                      // Let's stick to Sale.js schema: invoiceNumber, customerId, customerName, items, totalAmount, paymentMethod, shopId
            totalAmount, 
            paymentMethod,
            shopId: req.shop._id
        });

        const createdSale = await sale.save();

        // 4. Update Stock
        for (const item of items) {
            const product = await Product.findById(item.productId);
            product.stock = product.stock - item.quantity;
            await product.save();
        }

        res.status(201).json({ success: true, sale: createdSale });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
    try {
        const pageSize = 10;
        const page = Number(req.query.pageNumber) || 1;

        const keyword = req.query.keyword ? {
            $or: [
                { customerName: { $regex: req.query.keyword, $options: 'i' } },
                { invoiceNumber: { $regex: req.query.keyword, $options: 'i' } }
            ]
        } : {};

        const count = await Sale.countDocuments({ ...keyword, shopId: req.shop._id });
        const sales = await Sale.find({ ...keyword, shopId: req.shop._id })
            .populate('customerId', 'name phone')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ success: true, sales, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get sale by ID
// @route   GET /api/sales/:id
// @access  Private
const getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findOne({ _id: req.params.id, shopId: req.shop._id })
            .populate('customerId', 'name email phone address')
            .populate('items.productId', 'name sku');

        if (sale) {
            res.json({ success: true, sale });
        } else {
            res.status(404).json({ success: false, message: 'Sale not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createSale,
    getSales,
    getSaleById
};
