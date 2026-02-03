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
            invoiceNumber,
            invoiceDate,
            invoiceSummary,
            taxBreakup
        } = req.body;

        // Verify supplier
        const supplier = await Supplier.findById(supplierId);
        if(!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        // Auto-calculate invoice summary if not provided
        let calculatedInvoiceSummary = invoiceSummary || {};
        let calculatedTaxBreakup = taxBreakup || { gst5: {}, gst12: {}, gst18: {}, gst28: {} };
        
        if (!invoiceSummary || !taxBreakup) {
            let taxableAmount = 0;
            let totalTax = 0;
            let mrpValue = 0;
            
            // Initialize tax breakup
            const breakup = {
                gst5: { taxable: 0, tax: 0 },
                gst12: { taxable: 0, tax: 0 },
                gst18: { taxable: 0, tax: 0 },
                gst28: { taxable: 0, tax: 0 }
            };
            
            items.forEach(item => {
                const itemTaxable = item.baseRate ? (item.baseRate * item.receivedQty) : item.amount;
                const itemTax = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
                const totalGst = itemTax;
                
                taxableAmount += itemTaxable;
                totalTax += (itemTaxable * totalGst / 100);
                mrpValue += (item.mrp || 0) * item.receivedQty;
                
                // Categorize by GST rate
                if (totalGst === 5) {
                    breakup.gst5.taxable += itemTaxable;
                    breakup.gst5.tax += (itemTaxable * 5 / 100);
                } else if (totalGst === 12) {
                    breakup.gst12.taxable += itemTaxable;
                    breakup.gst12.tax += (itemTaxable * 12 / 100);
                } else if (totalGst === 18) {
                    breakup.gst18.taxable += itemTaxable;
                    breakup.gst18.tax += (itemTaxable * 18 / 100);
                } else if (totalGst === 28) {
                    breakup.gst28.taxable += itemTaxable;
                    breakup.gst28.tax += (itemTaxable * 28 / 100);
                }
            });
            
            const amountAfterGst = taxableAmount + totalTax;
            const roundAmount = Math.round(amountAfterGst) - amountAfterGst;
            
            calculatedInvoiceSummary = {
                taxableAmount: parseFloat(taxableAmount.toFixed(2)),
                tcsAmount: 0,
                mrpValue: parseFloat(mrpValue.toFixed(2)),
                netAmount: parseFloat(taxableAmount.toFixed(2)),
                amountAfterGst: parseFloat(amountAfterGst.toFixed(2)),
                roundAmount: parseFloat(roundAmount.toFixed(2)),
                invoiceAmount: Math.round(amountAfterGst)
            };
            
            calculatedTaxBreakup = breakup;
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
            invoiceDate: invoiceDate || new Date(),
            invoiceSummary: calculatedInvoiceSummary,
            taxBreakup: calculatedTaxBreakup,
            shopId: req.shop._id
        });

        const createdPurchase = await purchase.save();

        // Update Product Stock
        for (const item of items) {
             const product = await Product.findById(item.productId);
             if (product) {
                 const totalQty = (item.receivedQty || 0) + (item.physicalFreeQty || 0) + (item.schemeFreeQty || 0);
                 product.quantity = (product.quantity || 0) + Number(totalQty);
                 
                 // Update pricing if provided
                 if (item.purchasePrice) product.purchasePrice = item.purchasePrice;
                 if (item.sellingPrice) product.sellingPrice = item.sellingPrice;
                 if (item.mrp) product.mrp = item.mrp;
                 
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
