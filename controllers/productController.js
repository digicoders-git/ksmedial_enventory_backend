const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const Sale = require('../models/Sale');

// @desc    Get all products for a shop
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
    try {
        const query = { shopId: req.shop._id };
        if (req.query.category) {
            query.category = { $regex: new RegExp(`^${req.query.category}$`, 'i') }; // Case-insensitive match
        }
        const products = await Product.find(query).sort({ createdAt: -1 });
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
        const { 
            name, genericName, company, batchNumber, expiryDate, 
            purchasePrice, sellingPrice, quantity, category, sku, 
            reorderLevel, packing, hsnCode, tax, unit, description,
            isPrescriptionRequired, rackLocation, image, brand, status,
            manufacturingDate
        } = req.body;

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

        const product = await Product.create({
            name, genericName, company,
            batchNumber: batchNumber || 'N/A', 
            expiryDate: expiryDate || 'N/A',
            purchasePrice: purchasePrice || 0,
            sellingPrice: sellingPrice || 0,
            quantity: quantity || 0,
            category,
            sku: sku || `SKU-${Date.now()}`,
            slug: slug,
            reorderLevel: reorderLevel || 20,
            packing, hsnCode, tax, unit, description,
            isPrescriptionRequired, rackLocation, image, brand, status,
            manufacturingDate,
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

        await Product.deleteOne({ _id: req.params.id, shopId: req.shop._id });
        res.json({ success: true, message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Adjust product stock
// @route   PUT /api/products/:id/adjust
// @access  Private
// @desc    Adjust product stock
// @route   PUT /api/products/:id/adjust
// @access  Private
const adjustStock = async (req, res) => {
    try {
        const { type, quantity, reason, note, adjusterName, adjusterEmail, adjusterMobile } = req.body;
        const product = await Product.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const qtyChange = parseInt(quantity);
        let log;

        if (type === 'add') {
             // For Stock Addition: Create Log with 'Putaway_Pending' status, DO NOT update stock yet.
            log = await InventoryLog.create({
                type: 'IN',
                reason,
                quantity: qtyChange,
                productId: product._id,
                productName: product.name,
                batchNumber: product.batchNumber,
                note,
                shopId: req.shop._id,
                adjustedByName: adjusterName || req.shop.ownerName,
                adjustedByEmail: adjusterEmail || req.shop.email,
                adjustedByMobile: adjusterMobile || req.shop.contactNumber,
                date: new Date(),
                status: 'Putaway_Pending' // New Pending Status
            });

            return res.json({ 
                success: true, 
                message: 'Stock adjustment submitted! Added to Put Away Bucket for verification.',
                log 
            });

        } else {
            // For Deduction: Update immediately
            product.quantity = Math.max(0, product.quantity - qtyChange);
            await product.save();

            // Log transaction
            log = await InventoryLog.create({
                type: 'OUT',
                reason,
                quantity: qtyChange,
                productId: product._id,
                productName: product.name,
                batchNumber: product.batchNumber,
                note,
                shopId: req.shop._id,
                adjustedByName: adjusterName || req.shop.ownerName,
                adjustedByEmail: adjusterEmail || req.shop.email,
                adjustedByMobile: adjusterMobile || req.shop.contactNumber,
                date: new Date(),
                status: 'Completed'
            });

             res.json({ success: true, product, log });
        }

       
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get pending putaway logs (Stock Adjustments)
// @route   GET /api/products/putaway/pending
// @access  Private
const getPendingPutAwayLogs = async (req, res) => {
    try {
        const logs = await InventoryLog.find({ 
            shopId: req.shop._id, 
            status: 'Putaway_Pending' 
        }).populate('productId', 'name sku batchNumber expiryDate purchasePrice packing').sort({ date: -1 });

        res.json({ success: true, logs });
    } catch (error) {
         res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Complete Put Away for a Log
// @route   PUT /api/products/putaway/complete/:id
// @access  Private
const completePutAwayLog = async (req, res) => {
    try {
        const { rackLocation } = req.body;
        const log = await InventoryLog.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (!log) {
            return res.status(404).json({ success: false, message: 'Log not found' });
        }

        if (log.status === 'Completed') {
            return res.status(400).json({ success: false, message: 'Already completed' });
        }

        const product = await Product.findOne({ _id: log.productId, shopId: req.shop._id });
        if(product) {
            product.quantity += log.quantity;
            if(rackLocation) product.rackLocation = rackLocation;
            await product.save();
        }

        log.status = 'Completed';
        if(rackLocation) log.tempLocation = rackLocation; // Store where it was put
        await log.save();

        res.json({ success: true, message: 'Stock updated successfully', product });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get inventory logs
// @route   GET /api/products/logs
// @access  Private
const getInventoryLogs = async (req, res) => {
    try {
        const logs = await InventoryLog.find({ shopId: req.shop._id })
            .sort({ date: -1 })
            .limit(50);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get inventory report statistics
// @route   GET /api/products/report
// @access  Private
const getInventoryReport = async (req, res) => {
    try {
        const products = await Product.find({ shopId: req.shop._id });

        // 1. Overview Stats
        const totalItems = products.length;
        const totalValue = products.reduce((acc, curr) => acc + (curr.quantity * curr.purchasePrice), 0);
        
        const lowStockItems = [];
        const expiryItems = [];
        const categoryMap = {};

        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        products.forEach(product => {
            // Low Stock Check
            const reorderLevel = product.reorderLevel || 10;
            if (product.quantity <= reorderLevel) {
                lowStockItems.push({
                    name: product.name,
                    stock: product.quantity,
                    min: reorderLevel,
                    supplier: product.company || 'N/A' // Using company as supplier proxy
                });
            }

            // Expiry Check
            if (product.expiryDate && product.expiryDate !== 'N/A') {
                const expDate = new Date(product.expiryDate);
                // Check if valid date
                if (!isNaN(expDate.getTime())) {
                    if (expDate <= thirtyDaysFromNow && expDate >= today) { // Expiring soon but not already expired? Or include expired? Usually expiring soon.
                        // Let's include expired items too as critical
                         expiryItems.push({
                            name: product.name,
                            batch: product.batchNumber,
                            expiry: product.expiryDate,
                            stock: product.quantity,
                            dateObj: expDate
                        });
                    } else if (expDate < today) {
                         // Already Expired
                         /* We could include these or separate them. For now adding to expiry list if logic treats them as 'alert' */
                         // Actually user request is "Expiring Soon (30 Days)", usually implies future.
                         // But expired items are also critical. Let's stick to <= 30 days (past + near future)
                         expiryItems.push({
                            name: product.name,
                            batch: product.batchNumber,
                            expiry: product.expiryDate,
                            stock: product.quantity,
                            dateObj: expDate
                        });
                    }
                }
            }

            // Category Breakdown
            const catName = product.category || 'Uncategorized';
            if (!categoryMap[catName]) {
                categoryMap[catName] = { name: catName, stock: 0, value: 0 };
            }
            categoryMap[catName].stock += product.quantity;
            categoryMap[catName].value += (product.quantity * product.purchasePrice);
        });

        // 2. Format Category Data
        const categoryData = Object.values(categoryMap).map(cat => ({
            ...cat,
            percent: totalValue > 0 ? Math.round((cat.value / totalValue) * 100) : 0
        })).sort((a, b) => b.value - a.value);

        // 3. Sort Alerts
        lowStockItems.sort((a, b) => a.stock - b.stock); // Ascending stock (most critical first)
        expiryItems.sort((a, b) => a.dateObj - b.dateObj); // Nearest expiry first

        // 4. Counts
        const lowStockCount = lowStockItems.length;
        const nearExpiryCount = expiryItems.length;

        res.json({
            success: true,
            stats: {
                totalItems,
                totalValue,
                lowStock: lowStockCount,
                nearExpiry: nearExpiryCount
            },
            categoryData,
            lowStockItems: lowStockItems.slice(0, 50), // Limit mainly for display if needed
            expiryItems: expiryItems.slice(0, 50)
        });

    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk Update Product Locations
// @route   PUT /api/products/locations/bulk
// @access  Private
const bulkUpdateLocations = async (req, res) => {
    try {
        const { updates } = req.body; // Expects array of { sku, rack, id }
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ success: false, message: 'Invalid updates format' });
        }

        const operations = updates.map(item => {
             // Prefer ID if present, else SKU. Note: SKU must be unique in shop ideally.
             const filter = item.id ? { _id: item.id } : { sku: item.sku };
             return {
                 updateOne: {
                     filter: { ...filter, shopId: req.shop._id },
                     update: { $set: { rackLocation: item.rack } }
                 }
             };
        });

        if (operations.length > 0) {
            await Product.bulkWrite(operations);
        }

        res.json({ success: true, message: `Updated ${operations.length} product locations.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteInventory = async (req, res) => {
    try {
        await Product.deleteMany({ shopId: req.shop._id });
        res.json({ success: true, message: 'Inventory cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const clearInventoryLogs = async (req, res) => {
    try {
        await InventoryLog.deleteMany({ shopId: req.shop._id });
        res.json({ success: true, message: 'Inventory logs cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Search products with pagination for Inventory Master
// @route   GET /api/products/search
// @access  Private
const searchProducts = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 25, 
            sku, 
            name, 
            batch, 
            location, 
            tags,
            nearExpiry,
            lowStock
        } = req.query;

        const query = { shopId: req.shop._id };

        if (sku) query.sku = { $regex: sku, $options: 'i' };
        if (name) query.name = { $regex: name, $options: 'i' };
        if (batch) query.batchNumber = batch; // Exact match
        if (location) query.rackLocation = { $regex: location, $options: 'i' };
        if (tags) query.$or = [
            { category: { $regex: tags, $options: 'i' } },
            { group: { $regex: tags, $options: 'i' } }
        ];

        // Fetch all matching basic criteria to perform advanced filtering in JS
        // (Due to mixed date formats or string dates)
        let products = await Product.find(query).sort({ createdAt: -1 });

        // Filter: Near Expiry (within 90 days)
        if (nearExpiry === 'true') {
            const today = new Date();
            const ninetyDaysFromNow = new Date();
            ninetyDaysFromNow.setDate(today.getDate() + 90);

            products = products.filter(p => {
                if (!p.expiryDate || p.expiryDate === 'N/A') return false;
                const exp = new Date(p.expiryDate);
                // Check if valid date and within 90 days (or already expired)
                return !isNaN(exp) && exp <= ninetyDaysFromNow;
            });
        }

        // Filter: Low Stock (less than minLevel or 10)
        if (lowStock === 'true') {
            products = products.filter(p => p.quantity <= (p.reorderLevel || 10));
        }

        const total = products.length;
        
        // Manual Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedProducts = products.slice(startIndex, endIndex);

        res.json({
            success: true,
            products: paginatedProducts,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get non-moving stock (No sales in last 30 days)
// @route   GET /api/products/non-moving
// @access  Private
const getNonMovingStock = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Find all sales in last 30 days
        const sales = await Sale.find({
            shopId: req.shop._id,
            createdAt: { $gte: thirtyDaysAgo }
        }).select('items.productId');

        // 2. Extract product IDs sold
        const soldProductIds = new Set();
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (item.productId) soldProductIds.add(item.productId.toString());
            });
        });

        // 3. Find products NOT in sold list (and have stock > 0) AND were created > 30 days ago
        const nonMovingProducts = await Product.find({
            shopId: req.shop._id,
            quantity: { $gt: 0 },
            _id: { $nin: Array.from(soldProductIds) },
            createdAt: { $lte: thirtyDaysAgo } // Strict check: Must be older than 30 days
        }).sort({ createdAt: -1 });

        res.json({ success: true, products: nonMovingProducts });

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
    adjustStock,
    getInventoryLogs,
    getPendingPutAwayLogs,
    completePutAwayLog,
    getInventoryReport,
    bulkUpdateLocations,
    deleteInventory,
    clearInventoryLogs,
    searchProducts,
    getNonMovingStock
};
