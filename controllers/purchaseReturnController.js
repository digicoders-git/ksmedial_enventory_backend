const PurchaseReturn = require('../models/PurchaseReturn');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');

// @desc    Create new purchase return
// @route   POST /api/purchase-returns
// @access  Private
const createPurchaseReturn = async (req, res) => {
    try {
        console.log("Create Purchase Return Request Body:", req.body);
        const {
            purchaseId,
            supplierId,
            items,
            totalAmount,
            reason,
            returnNumber
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No items to return" });
        }

        const purchaseReturn = new PurchaseReturn({
            returnNumber,
            purchaseId,
            supplierId,
            items,
            totalAmount,
            reason,
            shopId: req.shop._id
        });

        const createdReturn = await purchaseReturn.save();
        console.log("Purchase Return Saved:", createdReturn);

        // Update Product Stock (Decrease quantity as it is returned)
        for (const item of items) {
            if (!item.productId) continue;
            
            const product = await Product.findById(item.productId);
            if (product) {
                const returnQty = Number(item.returnQuantity) || 0;
                product.quantity = (product.quantity || 0) - returnQty; 
                await product.save();
                console.log(`Updated stock for product ${item.productId}: -${returnQty}`);
            } else {
                console.warn(`Product not found for stock update: ${item.productId}`);
            }
        }

        res.status(201).json({ success: true, purchaseReturn: createdReturn });
    } catch (error) {
        console.error("Create Purchase Return Error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Failed to create return",
            details: error.errors ? Object.values(error.errors).map(e => e.message) : undefined
        });
    }
};

// @desc    Get all purchase returns
// @route   GET /api/purchase-returns
// @access  Private
const getPurchaseReturns = async (req, res) => {
    try {
        const pageSize = 10;
        const page = Number(req.query.pageNumber) || 1;
        
        const query = { shopId: req.shop._id };
        
        if (req.query.keyword) {
            query.returnNumber = { $regex: req.query.keyword, $options: 'i' };
        }

        const count = await PurchaseReturn.countDocuments(query);
        const returns = await PurchaseReturn.find(query)
            .populate('supplierId', 'name phone gstNumber address')
            .populate('purchaseId', 'invoiceNumber')
            .populate('items.productId', 'name batchNumber sku')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        // Get stats for all returns in the shop
        const allReturns = await PurchaseReturn.find({ shopId: req.shop._id });
        const totalReturnsAmount = allReturns.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        const pendingAdjustmentCount = allReturns.filter(r => r.status === 'Pending').length;

        res.json({ 
            success: true, 
            returns, 
            page, 
            pages: Math.ceil(count / pageSize), 
            total: count,
            stats: {
                totalReturnsAmount,
                pendingAdjustmentCount,
                totalReturns: allReturns.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get purchase return by ID
// @route   GET /api/purchase-returns/:id
// @access  Private
const getPurchaseReturnById = async (req, res) => {
    try {
        const purchaseReturn = await PurchaseReturn.findOne({ _id: req.params.id, shopId: req.shop._id })
            .populate('supplierId', 'name phone gstNumber address')
            .populate('purchaseId', 'invoiceNumber')
            .populate('items.productId', 'name');

        if (purchaseReturn) {
            res.json({ success: true, purchaseReturn });
        } else {
            res.status(404).json({ success: false, message: 'Purchase return not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update purchase return
// @route   PUT /api/purchase-returns/:id
// @access  Private
const updatePurchaseReturn = async (req, res) => {
    try {
        const { status, reason } = req.body;
        const purchaseReturn = await PurchaseReturn.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (purchaseReturn) {
            purchaseReturn.status = status || purchaseReturn.status;
            purchaseReturn.reason = reason || purchaseReturn.reason;

            const updatedReturn = await purchaseReturn.save();
            res.json({ success: true, purchaseReturn: updatedReturn });
        } else {
            res.status(404).json({ success: false, message: 'Purchase return not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete purchase return
// @route   DELETE /api/purchase-returns/:id
// @access  Private
const deletePurchaseReturn = async (req, res) => {
    try {
        const purchaseReturn = await PurchaseReturn.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (purchaseReturn) {
            // Restore stock if needed? Usually deleting a return might need restoring stock
            for (const item of purchaseReturn.items) {
                const product = await Product.findById(item.productId);
                if (product) {
                    product.quantity = (product.quantity || 0) + Number(item.returnQuantity);
                    await product.save();
                }
            }
            await PurchaseReturn.deleteOne({ _id: req.params.id });
            res.json({ success: true, message: 'Purchase return removed' });
        } else {
            res.status(404).json({ success: false, message: 'Purchase return not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const clearAllPurchaseReturns = async (req, res) => {
    try {
        const returns = await PurchaseReturn.find({ shopId: req.shop._id });
        
        // Restore stock for each return
        for (const pr of returns) {
            for (const item of pr.items) {
                const product = await Product.findById(item.productId);
                if (product) {
                    product.quantity = (product.quantity || 0) + Number(item.returnQuantity || item.quantity);
                    await product.save();
                }
            }
        }
        
        await PurchaseReturn.deleteMany({ shopId: req.shop._id });
        res.json({ success: true, message: 'All purchase returns cleared and stock restored' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createPurchaseReturn,
    getPurchaseReturns,
    getPurchaseReturnById,
    updatePurchaseReturn,
    deletePurchaseReturn,
    clearAllPurchaseReturns
};
