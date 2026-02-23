const SaleReturn = require('../models/SaleReturn');
const Sale = require('../models/Sale');
const Product = require('../models/Product');

const getPackSize = (packingStr) => {
    if (!packingStr) return 1;
    const match = packingStr.toString().match(/(\d+)$/);
    return match ? parseInt(match[0]) : 1;
};

// @desc    Create new sale return
// @route   POST /api/sales/returns
// @access  Private
// @desc    Create new sale return
// @route   POST /api/sales/returns
// @access  Private
const createSaleReturn = async (req, res) => {
    try {
        const data = req.body || {};
        const {
            saleId,
            items,
            totalAmount,
            reason,
            status
        } = data;

        const sale = await Sale.findById(saleId);
        if (!sale) {
            return res.status(404).json({ success: false, message: 'Sale not found' });
        }

        // Generate Return Number
        const count = await SaleReturn.countDocuments({ shopId: req.shop._id });
        const returnNumber = `RET-${Date.now()}-${count + 1}`;

        const saleReturn = new SaleReturn({
            returnNumber,
            saleId,
            invoiceNumber: sale.invoiceNumber,
            customerId: sale.customerId,
            customerName: sale.customerName,
            items,
            totalAmount,
            reason,
            status: status || 'Putaway_Pending',
            shopId: req.shop._id
        });

        const createdReturn = await saleReturn.save();

        // Smarter Sale status update
        sale.returnedAmount = (sale.returnedAmount || 0) + totalAmount;
        
        // Calculate total original qty
        const totalOriginalQty = sale.items.reduce((acc, i) => acc + i.quantity, 0);
        // Calculate total previously returned qty + current return qty
        const allReturnsForSale = await SaleReturn.find({ saleId: sale._id });
        const totalReturnedQty = allReturnsForSale.reduce((acc, r) => 
            acc + r.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0), 0
        );

        if (totalReturnedQty >= totalOriginalQty) {
            sale.status = 'Returned';
        } else {
            sale.status = 'Partial';
        }
        
        await sale.save();

        res.status(201).json({ success: true, saleReturn: createdReturn });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Complete Put Away for Sale Return (Update Inventory)
// @route   PUT /api/sales/returns/:id/putaway
// @access  Private
const completePutAway = async (req, res) => {
    try {
        const { items: putAwayItems } = req.body; // Items with rack info from frontend
        const saleReturn = await SaleReturn.findById(req.params.id);
        
        if (!saleReturn) {
            return res.status(404).json({ success: false, message: 'Return not found' });
        }

        if (saleReturn.status === 'Refunded') {
            return res.status(400).json({ success: false, message: 'Already processed' });
        }

        // Update inventory: increment quantity for returned items (Convert Strips to Units)
        for (const item of saleReturn.items) {
            const product = await Product.findById(item.productId);
            if (product) {
                const packSize = getPackSize(product.packing);
                const returnQtyInUnits = item.quantity * packSize; // item.quantity is Strips
                
                product.quantity = (product.quantity || 0) + returnQtyInUnits;

                // Update Rack Location if provided
                if (putAwayItems && putAwayItems.length > 0) {
                    // Try to match by _id or productId
                    const matchedItem = putAwayItems.find(p => 
                        (p._id && p._id.toString() === item._id.toString()) || 
                        (p.productId && p.productId.toString() === item.productId.toString())
                    );
                    
                    if (matchedItem && matchedItem.rack) {
                        product.rackLocation = matchedItem.rack;
                    }
                }

                await product.save();
            }
        }

        saleReturn.status = 'Refunded'; // Mark as Completed/Refunded
        await saleReturn.save();

        res.json({ success: true, message: 'Put away completed, stock updated', saleReturn });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all sale returns
// @route   GET /api/sales/returns
// @access  Private
const getSaleReturns = async (req, res) => {
    try {
        const { keyword, startDate, endDate, status, page = 1, limit = 10 } = req.query;
        const query = { shopId: req.shop._id };

        if (status) query.status = status;

        if (keyword) {
            query.$or = [
                { returnNumber: { $regex: keyword, $options: 'i' } },
                { invoiceNumber: { $regex: keyword, $options: 'i' } },
                { customerName: { $regex: keyword, $options: 'i' } }
            ];
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        const count = await SaleReturn.countDocuments(query);
        const returns = await SaleReturn.find(query)
            .populate('items.productId', 'name batchNumber sku')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(limit) * (Number(page) - 1));

        res.json({
            success: true,
            returns,
            page,
            pages: Math.ceil(count / limit),
            total: count
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get sale return by ID
// @route   GET /api/sales/returns/:id
// @access  Private
const getSaleReturnById = async (req, res) => {
    try {
        const saleReturn = await SaleReturn.findById(req.params.id)
            .populate({
                path: 'saleId',
                populate: { path: 'customerId' }
            })
            .populate('items.productId');
        
        if (saleReturn && saleReturn.shopId.toString() === req.shop._id.toString()) {
            res.json({ success: true, saleReturn, shop: req.shop });
        } else {
            res.status(404).json({ success: false, message: 'Return not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const clearSaleReturns = async (req, res) => {
    try {
        await SaleReturn.deleteMany({ shopId: req.shop._id });
        res.json({ success: true, message: 'All sale returns cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createSaleReturn,
    getSaleReturns,
    getSaleReturnById,
    clearSaleReturns,
    completePutAway
};
