const PurchaseReturn = require('../models/PurchaseReturn');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

// Helper to extract pack size (e.g. "1x10" -> 10)
const getPackSize = (packingStr) => {
    if (!packingStr) return 1;
    const match = packingStr.toString().match(/(\d+)$/);
    return match ? parseInt(match[0]) : 1;
};

// CREATE PURCHASE RETURN (Debit Note)
const createPurchaseReturn = async (req, res) => {
    try {
        const reqBody = req.body || {};

        const returnNumber = reqBody.returnNumber || `DN-${Date.now()}`;
        const purchaseId = reqBody.purchaseId;
        const supplierId = reqBody.supplierId;
        const itemsRaw = reqBody.items;
        const totalAmount = reqBody.totalAmount;
        const reason = reqBody.reason;

        if (!purchaseId || !supplierId) {
            return res.status(400).json({
                success: false,
                message: "Purchase ID or Supplier ID is missing from the request."
            });
        }

        let items = [];
        try {
            items = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : (itemsRaw || []);
        } catch (e) {
            return res.status(400).json({ success: false, message: "Invalid items format" });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No items provided for return." });
        }

        let invoiceFile = null;
        if (req.file) {
            invoiceFile = `/uploads/${req.file.filename}`;
        }

        const purchaseReturn = new PurchaseReturn({
            returnNumber,
            purchaseId,
            supplierId,
            items,
            totalAmount: Number(totalAmount) || 0,
            reason,
            shopId: req.shop._id,
            invoiceFile: invoiceFile
        });

        const createdReturn = await purchaseReturn.save();

        // Deduct stock for each returned item
        for (const item of items) {
            if (item.productId) {
                const product = await Product.findById(item.productId);
                if (product) {
                    const packSize = getPackSize(product.packing);
                    const returnQtyInUnits = (Number(item.returnQuantity) || 0) * packSize;
                    
                    product.quantity = (product.quantity || 0) - returnQtyInUnits;
                    await product.save();
                }
            }
        }

        res.status(201).json({ success: true, purchaseReturn: createdReturn });

    } catch (error) {
        console.error("CREATE PURCHASE RETURN ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET ALL PURCHASE RETURNS (with pagination, search, date filter, and stats)
const getPurchaseReturns = async (req, res) => {
    try {
        const pageNumber = Number(req.query.pageNumber) || 1;
        const pageSize = Number(req.query.pageSize) || 10;
        const keyword = req.query.keyword || '';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const query = { shopId: req.shop._id };

        // Date range filter
        if (startDate || endDate) {
            query.returnDate = {};
            if (startDate) query.returnDate.$gte = new Date(startDate);
            if (endDate) query.returnDate.$lte = new Date(endDate);
        }

        // We'll filter by returnNumber keyword after populate if needed
        // For now, use a regex on returnNumber if keyword is provided
        if (keyword) {
            query.$or = [
                { returnNumber: { $regex: keyword, $options: 'i' } }
            ];
        }

        const total = await PurchaseReturn.countDocuments(query);
        const pages = Math.ceil(total / pageSize) || 1;

        const returns = await PurchaseReturn.find(query)
            .populate('supplierId', 'name phone gstNumber address')
            .populate('purchaseId', 'invoiceNumber')
            .populate('items.productId', 'name batchNumber sku')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (pageNumber - 1));

        // Calculate stats
        const allReturnsForStats = await PurchaseReturn.find({ shopId: req.shop._id });
        const totalReturnsAmount = allReturnsForStats.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const pendingAdjustmentCount = allReturnsForStats.filter(r => r.status === 'Pending').length;
        const totalReturns = allReturnsForStats.length;

        res.json({
            success: true,
            returns,
            pages,
            total,
            page: pageNumber,
            stats: {
                totalReturnsAmount,
                pendingAdjustmentCount,
                totalReturns
            }
        });
    } catch (error) {
        console.error("GET PURCHASE RETURNS ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET SINGLE PURCHASE RETURN BY ID
const getPurchaseReturnById = async (req, res) => {
    try {
        const pr = await PurchaseReturn.findOne({ _id: req.params.id, shopId: req.shop._id })
            .populate('supplierId')
            .populate('purchaseId')
            .populate('items.productId');

        if (!pr) {
            return res.status(404).json({ success: false, message: 'Purchase return not found' });
        }

        res.json({ success: true, purchaseReturn: pr });
    } catch (error) {
        console.error("GET PURCHASE RETURN BY ID ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE PURCHASE RETURN (status / reason)
const updatePurchaseReturn = async (req, res) => {
    try {
        console.log("UPDATE PURCHASE RETURN CALLED:", req.params.id);
        console.log("UPDATE DATA RECEIVED:", req.body);
        
        const updateData = { ...req.body };
        
        // Handle physical file if uploaded via Multer
        if (req.file) {
            console.log("NEW FILE RECEIVED:", req.file.filename);
            updateData.invoiceFile = `/uploads/${req.file.filename}`;
        }

        const pr = await PurchaseReturn.findOneAndUpdate(
            { _id: req.params.id, shopId: req.shop._id },
            updateData,
            { new: true }
        );

        if (!pr) {
            return res.status(404).json({ success: false, message: 'Purchase return not found' });
        }

        res.json({ success: true, purchaseReturn: pr });
    } catch (error) {
        console.error("UPDATE PURCHASE RETURN ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE PURCHASE RETURN
const deletePurchaseReturn = async (req, res) => {
    try {
        const pr = await PurchaseReturn.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });

        if (!pr) {
            return res.status(404).json({ success: false, message: 'Purchase return not found' });
        }

        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error("DELETE PURCHASE RETURN ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// CLEAR ALL PURCHASE RETURNS (for this shop)
const clearAllPurchaseReturns = async (req, res) => {
    try {
        await PurchaseReturn.deleteMany({ shopId: req.shop._id });
        res.json({ success: true, message: 'All purchase returns cleared' });
    } catch (error) {
        console.error("CLEAR ALL PURCHASE RETURNS ERROR:", error.message);
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
