const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Private
const createPurchase = async (req, res) => {
    try {
        const {
            supplierId,
            items,
            subTotal,
            taxAmount,
            discount,
            grandTotal,
            paymentStatus,
            paymentMethod,
            notes,
            invoiceNumber
        } = req.body;

        // Verify supplier
        const supplier = await Supplier.findById(supplierId);
        if(!supplier) {
             // allow creating without supplier? for now enforce it or check setup
             // If supplierId is invalid it might fail
        }

        const purchase = new Purchase({
            supplierId,
            items,
            subTotal,
            taxAmount,
            discount,
            grandTotal,
            paymentStatus,
            paymentMethod,
            notes,
            invoiceNumber,
            shopId: req.shop._id
        });

        const createdPurchase = await purchase.save();

        // Update Product Stock and Cost Price?
        for (const item of items) {
             const product = await Product.findById(item.productId);
             if (product) {
                 product.stock = (product.stock || 0) + Number(item.quantity);
                 // Optional: Update buyPrice/sellPrice if changed?
                 // product.buyPrice = item.purchasePrice; 
                 await product.save();
             }
        }

        res.status(201).json({ success: true, purchase: createdPurchase });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
const getPurchases = async (req, res) => {
    try {
        const pageSize = 10;
        const page = Number(req.query.pageNumber) || 1;
        
        const keyword = req.query.keyword ? {
            invoiceNumber: { $regex: req.query.keyword, $options: 'i' }
        } : {};

        const count = await Purchase.countDocuments({ ...keyword, shopId: req.shop._id });
        const purchases = await Purchase.find({ ...keyword, shopId: req.shop._id })
            .populate('supplierId', 'name')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ success: true, purchases, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get purchase by ID
// @route   GET /api/purchases/:id
// @access  Private
const getPurchaseById = async (req, res) => {
    try {
        const purchase = await Purchase.findOne({ _id: req.params.id, shopId: req.shop._id })
            .populate('supplierId', 'name email phone')
            .populate('items.productId', 'name sku');

        if (purchase) {
            res.json({ success: true, purchase });
        } else {
            res.status(404).json({ success: false, message: 'Purchase not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update purchase
// @route   PUT /api/purchases/:id
// @access  Private
const updatePurchase = async (req, res) => {
    try {
        const { status, paymentStatus, notes } = req.body;
        const purchase = await Purchase.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (purchase) {
            purchase.status = status || purchase.status;
            purchase.paymentStatus = paymentStatus || purchase.paymentStatus;
            purchase.notes = notes || purchase.notes;

            const updatedPurchase = await purchase.save();
            res.json({ success: true, purchase: updatedPurchase });
        } else {
            res.status(404).json({ success: false, message: 'Purchase not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Private
const deletePurchase = async (req, res) => {
    try {
        const purchase = await Purchase.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (purchase) {
            await purchase.remove();
            res.json({ success: true, message: 'Purchase removed' });
        } else {
            res.status(404).json({ success: false, message: 'Purchase not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase
};
