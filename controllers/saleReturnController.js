const SaleReturn = require('../models/SaleReturn');
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// @desc    Create new sale return
// @route   POST /api/sales/returns
// @access  Private
const createSaleReturn = async (req, res) => {
    try {
        const {
            saleId,
            items,
            totalAmount,
            reason,
            status
        } = req.body;

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
            status: status || 'Refunded',
            shopId: req.shop._id
        });

        const createdReturn = await saleReturn.save();

        // Update inventory: increment quantity for returned items
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: item.quantity }
            });
        }

        // Update sale status if it was a full return or just mark as partially returned
        // For simplicity, let's mark it as 'Returned' if any return is processed
        sale.status = 'Returned';
        await sale.save();

        res.status(201).json({ success: true, saleReturn: createdReturn });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all sale returns
// @route   GET /api/sales/returns
// @access  Private
const getSaleReturns = async (req, res) => {
    try {
        const { keyword, startDate, endDate, page = 1, limit = 10 } = req.query;
        const query = { shopId: req.shop._id };

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
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                query.createdAt.$gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = eDate;
            }
        }

        const count = await SaleReturn.countDocuments(query);
        const returns = await SaleReturn.find(query)
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
            res.json({ success: true, saleReturn });
        } else {
            res.status(404).json({ success: false, message: 'Return not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createSaleReturn,
    getSaleReturns,
    getSaleReturnById
};
