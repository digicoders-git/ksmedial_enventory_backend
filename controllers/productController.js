const Product = require('../models/Product');

// @desc    Get all products for a shop
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ shopId: req.shop._id }).sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, shopId: req.shop._id });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
    try {
        const { name, batchNumber, expiryDate, purchasePrice, sellingPrice, quantity, category, sku, reorderLevel } = req.body;

        const product = await Product.create({
            name,
            batchNumber,
            expiryDate,
            purchasePrice,
            sellingPrice,
            quantity,
            category,
            sku: sku || `SKU-${Date.now()}`,
            reorderLevel,
            shopId: req.shop._id
        });

        res.status(201).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
    try {
        let product = await Product.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        await product.remove();
        res.json({ success: true, message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Adjust product stock
// @route   PUT /api/products/:id/adjust
// @access  Private
const adjustStock = async (req, res) => {
    try {
        const { type, quantity, reason } = req.body;
        const product = await Product.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const qtyChange = parseInt(quantity);
        if (type === 'add') {
            product.quantity += qtyChange;
        } else {
            product.quantity = Math.max(0, product.quantity - qtyChange);
        }

        await product.save();

        // Optional: Log transaction in a separate model
        // await Transaction.create({ ... })

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock
};
