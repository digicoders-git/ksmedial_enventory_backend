const Batch = require('../models/Batch');
const Product = require('../models/Product');

// @desc    Get all batches for a product
// @route   GET /api/batches/product/:productId
// @access  Private
const getBatchesByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const batches = await Batch.find({ 
            productId,
            status: { $in: ['Active', 'Expired'] }
        })
        .populate('productId', 'name sku')
        .sort({ expiryDate: 1 }); // Sort by expiry date (FEFO - First Expiry First Out)

        res.status(200).json({
            success: true,
            batches
        });
    } catch (error) {
        console.error('Get Batches Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get batch by ID
// @route   GET /api/batches/:id
// @access  Private
const getBatchById = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id).populate('productId', 'name sku');
        
        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        res.status(200).json({
            success: true,
            batch
        });
    } catch (error) {
        console.error('Get Batch Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update batch quantity (for order fulfillment)
// @route   PUT /api/batches/:id/deduct
// @access  Private
const deductBatchQuantity = async (req, res) => {
    try {
        const { quantity } = req.body;
        const batch = await Batch.findById(req.params.id);

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        if (batch.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient batch quantity'
            });
        }

        batch.quantity -= quantity;
        
        // Update status if depleted
        if (batch.quantity === 0) {
            batch.status = 'Depleted';
        }

        await batch.save();

        res.status(200).json({
            success: true,
            message: 'Batch quantity updated',
            batch
        });
    } catch (error) {
        console.error('Deduct Batch Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create or update batch (from GRN)
// @route   POST /api/batches
// @access  Private
const createOrUpdateBatch = async (req, res) => {
    try {
        const {
            productId,
            batchNumber,
            expiryDate,
            manufacturingDate,
            quantity,
            purchasePrice,
            sellingPrice,
            mrp,
            rackLocation,
            grnId,
            shopId
        } = req.body;

        // Check if batch already exists
        let batch = await Batch.findOne({ productId, batchNumber, shopId });

        if (batch) {
            // Update existing batch
            batch.quantity += quantity;
            batch.expiryDate = expiryDate || batch.expiryDate;
            batch.manufacturingDate = manufacturingDate || batch.manufacturingDate;
            batch.purchasePrice = purchasePrice || batch.purchasePrice;
            batch.sellingPrice = sellingPrice || batch.sellingPrice;
            batch.mrp = mrp || batch.mrp;
            batch.rackLocation = rackLocation || batch.rackLocation;
            batch.status = 'Active';
            await batch.save();
        } else {
            // Create new batch
            batch = await Batch.create({
                productId,
                batchNumber,
                expiryDate,
                manufacturingDate,
                quantity,
                purchasePrice,
                sellingPrice,
                mrp,
                rackLocation,
                grnId,
                shopId,
                status: 'Active'
            });
        }

        res.status(201).json({
            success: true,
            message: batch ? 'Batch updated successfully' : 'Batch created successfully',
            batch
        });
    } catch (error) {
        console.error('Create/Update Batch Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getBatchesByProduct,
    getBatchById,
    deductBatchQuantity,
    createOrUpdateBatch
};
