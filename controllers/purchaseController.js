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
                 product.quantity = (product.quantity || 0) + Number(item.quantity); // Fix: use quantity, not stock
                 // Optional: Update buyPrice/sellPrice if changed?
                 // product.purchasePrice = item.purchasePrice; 
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
        const pageSize = Number(req.query.pageSize) || 10;
        const page = Number(req.query.pageNumber) || 1;
        
        const query = { shopId: req.shop._id };
        
        if (req.query.keyword) {
            query.invoiceNumber = { $regex: req.query.keyword, $options: 'i' };
        }
        
        if (req.query.supplierId) {
            query.supplierId = req.query.supplierId;
        }

        if (req.query.status && req.query.status !== 'All') {
            query.status = req.query.status;
        }

        // Date filtering
        if (req.query.startDate || req.query.endDate) {
            query.purchaseDate = {};
            if (req.query.startDate) query.purchaseDate.$gte = new Date(req.query.startDate);
            if (req.query.endDate) query.purchaseDate.$lte = new Date(req.query.endDate);
        }

        const count = await Purchase.countDocuments(query);
        const purchases = await Purchase.find(query)
            .populate('supplierId', 'name gstNumber address phone')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        // Calculate Stats for all time (for the shop)
        const allPurchases = await Purchase.find({ shopId: req.shop._id });
        const totalPurchasesAmount = allPurchases
            .filter(p => p.status === 'Received')
            .reduce((acc, curr) => acc + curr.grandTotal, 0);
        
        const unpaidInvoices = allPurchases.filter(p => p.paymentStatus === 'Pending');
        const pendingAmount = unpaidInvoices.reduce((acc, curr) => acc + curr.grandTotal, 0);

        res.json({ 
            success: true, 
            purchases, 
            page, 
            pages: Math.ceil(count / pageSize), 
            total: count,
            stats: {
                totalPurchasesAmount,
                pendingAmount,
                unpaidCount: unpaidInvoices.length,
                totalInvoices: allPurchases.length
            }
        });
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
            .populate('supplierId', 'name email phone gstNumber address')
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
