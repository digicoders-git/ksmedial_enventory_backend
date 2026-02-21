const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');

// Helper to parse date
const parseDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return null;
    return new Date(dateStr);
};

// 1. Get Requisitions (Low Stock & Near Expiry)
exports.getRequisitions = async (req, res) => {
    try {
        const shopId = req.shop ? req.shop._id : req.query.shopId;
        
        if (!shopId) {
             return res.status(400).json({ message: 'Shop ID is missing.' });
        }

        const products = await Product.find({ shopId }).lean();
        const lowStock = [];
        const expiryNear = [];
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);

        for (const prod of products) {
            // Check Low Stock
            if (prod.quantity <= (prod.reorderLevel || 10)) { // Default min 10 if not set
                lowStock.push({
                    _id: prod._id,
                    name: prod.name,
                    quantity: prod.quantity,
                    reorderLevel: prod.reorderLevel || 10,
                    suggestedOrder: (prod.reorderLevel || 10) * 2 - prod.quantity, // Simple logic: Top up to 2x Min
                    purchasePrice: prod.purchasePrice
                });
            }

            // Check Expiry (Primitive check since it's string)
            // Ideally we should store as Date. Assuming format YYYY-MM-DD or similar standard. 
            // If random string, skip.
            const expDate = parseDate(prod.expiryDate);
            if (expDate && expDate <= nextMonth && expDate >= today) {
                expiryNear.push({
                     _id: prod._id,
                    name: prod.name,
                    quantity: prod.quantity,
                    expiryDate: prod.expiryDate,
                    reason: 'Expiring Soon'
                });
            }
        }

        res.status(200).json({ lowStock, expiryNear });
    } catch (error) {
        console.error('Error fetching requisitions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 2. Create Purchase Order (Modified to split by supplier)
exports.createPurchaseOrder = async (req, res) => {
    try {
        const { items, expectedDeliveryDate, status, notes, poDate } = req.body;
        
        // Use shopId from body OR req.shop (prefer req.shop)
        const shopId = req.shop ? req.shop._id : req.body.shopId;
        
        if (!shopId) {
             return res.status(400).json({ message: 'Shop ID is missing. Ensure you are logged in.' });
        }

        // Group items by supplier
        const itemsBySupplier = {};
        for (const item of items) {
            const sid = item.supplier || item.supplierId || 'others';
            if (!itemsBySupplier[sid]) itemsBySupplier[sid] = [];
            itemsBySupplier[sid].push(item);
        }

        const supplierIds = Object.keys(itemsBySupplier);
        const createdPOs = [];

        for (const sid of supplierIds) {
            const supplierItems = itemsBySupplier[sid];
            let poTotal = 0;
            
            const processedItems = supplierItems.map(item => {
                const itemTotal = item.purchaseRate * item.quantity;
                const totalWithGst = itemTotal + (itemTotal * (item.gst || 0) / 100);
                poTotal += totalWithGst;
                return {
                    ...item,
                    supplier: sid !== 'others' ? sid : null,
                    totalAmount: totalWithGst
                };
            });

            let supplierName = 'Unknown Supplier';
            let supplierId = null;

            if (sid !== 'others') {
                const foundSupplier = await Supplier.findById(sid);
                if (foundSupplier) {
                    supplierName = foundSupplier.name;
                    supplierId = foundSupplier._id;
                }
            }

            const newPO = new PurchaseOrder({
                poDate: poDate || Date.now(),
                expectedDeliveryDate,
                supplierName,
                supplierId,
                items: processedItems,
                totalAmount: poTotal,
                status: status || 'Draft', // Use status from req.body, default to 'Draft'
                notes,
                shopId
            });

            await newPO.save();
            createdPOs.push(newPO);
        }

        res.status(201).json({
            success: true,
            message: `${createdPOs.length} Purchase Order(s) created successfully.`,
            orders: createdPOs,
            // Return first PO data for general success handling
            poNumber: createdPOs[0]?.poNumber,
            order: createdPOs[0]
        });

    } catch (error) {
        console.error('Error creating PO:', error);
        res.status(500).json({ 
            message: 'Error creating Purchase Order', 
            error: error.message,
            details: error.errors
        });
    }
};

// 3. Get All Purchase Orders
exports.getAllPurchaseOrders = async (req, res) => {
    try {
        const shopId = req.shop ? req.shop._id : req.query.shopId;
        const orders = await PurchaseOrder.find({ shopId }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
};

// 4. Get Single PO
exports.getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        let query = {};
        
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { _id: id };
        } else {
            query = { poNumber: id };
        }

        const order = await PurchaseOrder.findOne(query)
            .populate('items.product')
            .populate('supplierId')
            .populate('items.supplier');
        
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Error fetching order' });
    }
};

// 5. Update Status
exports.updatePurchaseOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await PurchaseOrder.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
    }
};

// 6. Delete PO
exports.deletePurchaseOrder = async (req, res) => {
    try {
        await PurchaseOrder.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Order deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting order' });
    }
};
