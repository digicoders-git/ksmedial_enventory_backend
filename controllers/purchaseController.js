const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PhysicalReceiving = require('../models/PhysicalReceiving');

// Helper to extract pack size (e.g. "1x10" -> 10)
const getPackSize = (packingStr) => {
    if (!packingStr) return 1;
    const match = packingStr.toString().match(/(\d+)$/);
    return match ? parseInt(match[0]) : 1;
};

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Private
const createPurchase = async (req, res) => {
    try {
        let {
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
            taxBreakup,
            priority,
            receivingLocation,
            status,
            physicalReceivingId // Get from frontend
        } = req.body;

        // Parse JSON strings if necessary (Multipart/Form-Data sends objects as strings)
        if (typeof items === 'string') items = JSON.parse(items);
        if (typeof invoiceSummary === 'string') invoiceSummary = JSON.parse(invoiceSummary);
        if (typeof taxBreakup === 'string') taxBreakup = JSON.parse(taxBreakup);

        // Get File Path if uploaded
        let invoiceFile = null;
        if (req.file) {
            // Store relative path (e.g., /uploads/filename.pdf)
            invoiceFile = `/uploads/${req.file.filename}`;
        }

        // Verify supplier
        const supplier = await Supplier.findById(supplierId);
        if(!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        // Auto-generate Invoice Number if not provided
        let finalInvoiceNumber = invoiceNumber;
        if (!finalInvoiceNumber) {
            const currentYear = new Date().getFullYear();
            const prefix = `GRN-${currentYear}-`;
            
            // Find the last invoice number for this year
            const lastPurchase = await Purchase.findOne({
                shopId: req.shop._id,
                invoiceNumber: { $regex: `^${prefix}` }
            }).sort({ invoiceNumber: -1 });
            
            let nextNumber = 1;
            if (lastPurchase && lastPurchase.invoiceNumber) {
                const lastNumber = parseInt(lastPurchase.invoiceNumber.split('-').pop());
                nextNumber = lastNumber + 1;
            }
            
            finalInvoiceNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
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
            invoiceNumber: finalInvoiceNumber,
            invoiceDate: invoiceDate || new Date(),
            invoiceSummary: calculatedInvoiceSummary,
            taxBreakup: calculatedTaxBreakup,
            shopId: req.shop._id,
            status: status || 'Pending',
            priority: priority || 'P3',
            receivingLocation: receivingLocation || 'Dock-1',
            invoiceFile: invoiceFile // Save file path
        });

        const createdPurchase = await purchase.save();

        // LINK TO PHYSICAL RECEIVING IF ID PROVIDED
        if (physicalReceivingId) {
            const prEntry = await PhysicalReceiving.findOne({ physicalReceivingId });
            if (prEntry) {
                prEntry.grnStatus = 'Done';
                prEntry.grnId = createdPurchase._id;
                prEntry.grnDate = Date.now();
                await prEntry.save();
            }
        }

        // Update Product Stock ONLY if status is 'Received' (Direct GRN)
        // If status is 'Putaway_Pending', stock will be updated later in Put Away Bucket
        if (status === 'Received') {
            for (const item of items) {
                 const product = await Product.findById(item.productId);
                 if (product) {
                     const packSize = getPackSize(product.packing);
                     const totalQtyInStrips = (item.receivedQty || 0) + (item.physicalFreeQty || 0) + (item.schemeFreeQty || 0);
                     const totalQtyInUnits = Number(totalQtyInStrips) * packSize;
                     
                     product.quantity = (product.quantity || 0) + totalQtyInUnits;
                     
                     // Update pricing and SKU details
                     const pPrice = item.purchasePrice || item.baseRate;
                     if (pPrice) product.purchasePrice = pPrice;
                     
                     const sPrice = item.sellingPrice || item.mrp;
                     if (sPrice) product.sellingPrice = sPrice;
                     
                     if (item.mrp) product.mrp = item.mrp;
                     
                     // Sync Batch, Expiry, Mfg Date, HSN, Tax from GRN
                     if (item.batchNumber) product.batchNumber = item.batchNumber;
                     if (item.expiryDate && !isNaN(new Date(item.expiryDate).getTime())) {
                         product.expiryDate = new Date(item.expiryDate).toISOString().split('T')[0];
                     }
                     if (item.mfgDate && !isNaN(new Date(item.mfgDate).getTime())) {
                         product.manufacturingDate = new Date(item.mfgDate).toISOString().split('T')[0];
                     }
                     if (item.hsnCode) product.hsnCode = item.hsnCode;
                     if (item.pack) product.packing = item.pack;
                     
                     const totalTax = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
                     if (totalTax > 0) product.tax = totalTax;
                     
                     product.isInventoryLive = true;
                     await product.save();
                 }
            }
        }

        res.status(201).json({ success: true, purchase: createdPurchase });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ... (Rest of file including getPurchases, getPurchaseById, updatePurchase, deletePurchase - keeping them as is)



// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
const getPurchases = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 10;
        const page = Number(req.query.pageNumber) || 1;
        
        const query = { shopId: req.shop._id };
        
        if (req.query.keyword) {
            query.$or = [
                { invoiceNumber: { $regex: req.query.keyword, $options: 'i' } },
                { 'items.skuId': { $regex: req.query.keyword, $options: 'i' } },
                { 'items.productName': { $regex: req.query.keyword, $options: 'i' } }
            ];
        }
        
        if (req.query.supplierId) {
            query.supplierId = req.query.supplierId;
        }

        if (req.query.status && req.query.status !== 'All') {
            query.status = req.query.status;
        }

        if (req.query.priority && req.query.priority !== 'All') {
            query.priority = req.query.priority;
        }

        if (req.query.receivingLocation) {
            query.receivingLocation = { $regex: req.query.receivingLocation, $options: 'i' };
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
        const id = req.params.id ? req.params.id.trim() : '';
        const mongoose = require('mongoose');
        
        let query = { shopId: req.shop._id };

        if (mongoose.Types.ObjectId.isValid(id)) {
            query._id = id;
        } else {
            query.invoiceNumber = id;
        }

        const purchase = await Purchase.findOne(query)
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
        const purchase = await Purchase.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });

        if (purchase) {
            res.json({ success: true, message: 'Purchase removed' });
        } else {
            res.status(404).json({ success: false, message: 'Purchase not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Process Put Away (Move to Live Stock)
// @route   PUT /api/purchases/:id/putaway
// @access  Private
const processPutAway = async (req, res) => {
    try {
        const { items: verifiedItems } = req.body; 
        const purchase = await Purchase.findOne({ _id: req.params.id, shopId: req.shop._id });

        if (!purchase) {
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }

        if (purchase.status === 'Received') {
             return res.status(400).json({ success: false, message: 'Put away already completed' });
        }
        
        const itemsToProcess = verifiedItems || purchase.items;

        // Update items if verified items provided
        if (verifiedItems) {
             purchase.items = verifiedItems;
             // Note: Totals are not recalculated here. Assumes verification maintains invoice integrity.
        }

        // Update Product Stock
        for (const item of itemsToProcess) {
             const product = await Product.findById(item.productId);
             if (product) {
                 const packSize = getPackSize(product.packing);
                 const totalQtyInStrips = (item.receivedQty || 0) + (item.physicalFreeQty || 0) + (item.schemeFreeQty || 0);
                 const totalQtyInUnits = Number(totalQtyInStrips) * packSize;

                 product.quantity = (product.quantity || 0) + totalQtyInUnits;
                 
                 // Update pricing, location and SKU details
                 const pPrice = item.purchasePrice || item.baseRate;
                 if (pPrice) product.purchasePrice = pPrice;
                 
                 const sPrice = item.sellingPrice || item.mrp;
                 if (sPrice) product.sellingPrice = sPrice;
                 
                 if (item.mrp) product.mrp = item.mrp;
                 if (item.rack) product.rackLocation = item.rack; 
                 
                 // Sync Batch, Expiry, Mfg Date, HSN, Tax from PutAway
                 if (item.batchNumber) product.batchNumber = item.batchNumber;
                 if (item.expiryDate && !isNaN(new Date(item.expiryDate).getTime())) {
                     product.expiryDate = new Date(item.expiryDate).toISOString().split('T')[0];
                 }
                 if (item.mfgDate && !isNaN(new Date(item.mfgDate).getTime())) {
                     product.manufacturingDate = new Date(item.mfgDate).toISOString().split('T')[0];
                 }
                 if (item.hsnCode) product.hsnCode = item.hsnCode;
                 if (item.pack) product.packing = item.pack;

                  const totalTax = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
                  if (totalTax > 0) product.tax = totalTax;
                  
                  product.isInventoryLive = true;
                  await product.save();
              }
         }

        purchase.status = 'Received';
        await purchase.save();

        res.json({ success: true, message: 'Put away completed and stock updated', purchase });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const processBulkPutAwayUpload = async (req, res) => {
    try {
        const { items } = req.body; // Array of { invoiceNumber, sku, rack, quantity }
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items provided' });
        }

        const stats = {
            updated: 0,
            notFound: 0,
            errors: 0
        };

        // Group by Invoice Number to minimize DB calls
        const groupedByInvoice = {};
        for (const item of items) {
            if (!item.invoiceNumber) continue;
            if (!groupedByInvoice[item.invoiceNumber]) {
                groupedByInvoice[item.invoiceNumber] = [];
            }
            groupedByInvoice[item.invoiceNumber].push(item);
        }

        for (const invoiceNumber in groupedByInvoice) {
            const purchase = await Purchase.findOne({ 
                invoiceNumber, 
                shopId: req.shop._id,
                status: 'Putaway_Pending' // Only update pending ones
            }).populate('items.productId');

            if (!purchase) {
                stats.notFound += groupedByInvoice[invoiceNumber].length;
                continue;
            }

            let purchaseUpdated = false;
            const invoiceItems = groupedByInvoice[invoiceNumber];

            for (const uploadItem of invoiceItems) {
                // Find item in purchase
                const pItem = purchase.items.find(pi => 
                    (pi.productId.sku === uploadItem.sku) || // Match by SKU
                    (pi.productName && uploadItem.productName && pi.productName.toLowerCase() === uploadItem.productName.toLowerCase()) // Match by Name
                );

                if (pItem) {
                    if (uploadItem.rack) {
                        pItem.rack = uploadItem.rack;
                        purchaseUpdated = true;
                        stats.updated++;
                    }
                    if (uploadItem.quantity) {
                        // Optional: Update quantity if needed, though risky for bulk without validation
                        // pItem.receivedQty = Number(uploadItem.quantity);
                    }
                } else {
                    stats.notFound++;
                }
            }

            if (purchaseUpdated) {
                await purchase.save();
            }
        }

        res.json({ 
            success: true, 
            message: `Processed. Updated: ${stats.updated}, Not Found/Skipped: ${stats.notFound}`,
            stats 
        });

    } catch (error) {
        console.error("Bulk Upload Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const clearPurchases = async (req, res) => {
    try {
        await Purchase.deleteMany({ shopId: req.shop._id });
        res.json({ success: true, message: 'All purchase invoices cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase,
    processPutAway,
    processBulkPutAwayUpload,
    clearPurchases
};
