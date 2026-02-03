const GRN = require('../models/GRN');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const InventoryLog = require('../models/InventoryLog');
const mongoose = require('mongoose');

// @desc    Create new GRN
// @route   POST /api/grn
// @access  Private
const createGRN = async (req, res) => {
    try {
        const {
            purchaseId,
            supplierId,
            invoiceNumber,
            grnDate,
            items,
            remarks,
            receivedBy
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in GRN' });
        }

        // Generate GRN Number (Simple increment or random for now, or Date based)
        const count = await GRN.countDocuments();
        const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        const grn = new GRN({
            grnNumber,
            purchaseId: purchaseId || undefined,
            supplierId,
            invoiceNumber,
            grnDate: grnDate || Date.now(),
            items,
            receivedBy,
            notes: remarks,
            status: 'Completed', // Auto complete for now
            shopId: req.shop._id
        });

        const createdGRN = await grn.save();

        // Update Stock and create Inventory Logs
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (product) {
                // Calculate accepted quantity
                const acceptedQty = Number(item.receivedQuantity) - Number(item.damagedQuantity || 0);

                if (acceptedQty > 0) {
                    // Update Product Quantity
                    product.quantity = (product.quantity || 0) + acceptedQty;
                    
                    // Update Product Batch/Expiry if it's the first time or if strategy allows
                    // For now, we don't overwrite master batch info to avoid losing tracking of old batches logic if it existed
                    // But we can check if product has no batch, set it.
                    if (product.batchNumber === 'N/A' || !product.batchNumber) {
                         product.batchNumber = item.batchNumber;
                         product.expiryDate = item.expiryDate;
                    }
                    
                    await product.save();

                    // Create Inventory Log
                    await InventoryLog.create({
                        type: 'IN',
                        reason: `GRN Received (${grnNumber})`,
                        quantity: acceptedQty,
                        productId: item.productId,
                        productName: product.name,
                        batchNumber: item.batchNumber, // Track specific batch in log
                        note: `Inv: ${invoiceNumber}, Exp: ${item.expiryDate}`,
                        shopId: req.shop._id,
                        date: new Date()
                    });
                }
            }
        }

        // If linked to Purchase, update Purchase status
        if (purchaseId) {
            const purchase = await Purchase.findById(purchaseId);
            if (purchase) {
                purchase.status = 'Received';
                await purchase.save();
            }
        }

        res.status(201).json({ success: true, grn: createdGRN });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all GRNs
// @route   GET /api/grn
// @access  Private
const getGRNs = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 10;
        const page = Number(req.query.pageNumber) || 1;
        
        const query = { shopId: req.shop._id };

        if (req.query.keyword) {
            query.$or = [
                { grnNumber: { $regex: req.query.keyword, $options: 'i' } },
                { invoiceNumber: { $regex: req.query.keyword, $options: 'i' } }
            ];
        }

        if (req.query.supplierId) {
            query.supplierId = req.query.supplierId;
        }

        const count = await GRN.countDocuments(query);
        const grns = await GRN.find(query)
            .populate('supplierId', 'name')
            .populate('items.productId', 'name') // Populate product name
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ 
            success: true, 
            grns, 
            page, 
            pages: Math.ceil(count / pageSize), 
            total: count 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get GRN by ID
// @route   GET /api/grn/:id
// @access  Private
const getGRNById = async (req, res) => {
    try {
        const grn = await GRN.findOne({ _id: req.params.id, shopId: req.shop._id })
            .populate('supplierId', 'name email phone address')
            .populate('items.productId', 'name sku brand bookingPrice sellingPrice unit');

        if (grn) {
            res.json({ success: true, grn });
        } else {
            res.status(404).json({ success: false, message: 'GRN not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createGRN,
    getGRNs,
    getGRNById
};
