const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    batchNumber: {
        type: String,
        required: true
    },
    expiryDate: {
        type: Date
    },
    manufacturingDate: {
        type: Date
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    purchasePrice: {
        type: Number,
        default: 0
    },
    sellingPrice: {
        type: Number,
        default: 0
    },
    mrp: {
        type: Number,
        default: 0
    },
    rackLocation: {
        type: String
    },
    grnId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GRN'
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Depleted'],
        default: 'Active'
    }
}, {
    timestamps: true
});

// Compound index to ensure unique batch per product
batchSchema.index({ productId: 1, batchNumber: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);
