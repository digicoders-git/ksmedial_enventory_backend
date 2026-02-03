const mongoose = require('mongoose');

const grnSchema = new mongoose.Schema({
    grnNumber: {
        type: String,
        required: true,
        unique: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    purchaseId: { // Link to PO
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase'
    },
    invoiceNumber: {
        type: String
    },
    grnDate: {
        type: Date,
        default: Date.now
    },
    items: [{
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
        orderedQuantity: {
            type: Number,
            default: 0
        },
        receivedQuantity: {
            type: Number,
            required: true
        },
        damagedQuantity: {
            type: Number,
            default: 0
        },
        shortQuantity: {
            type: Number,
            default: 0
        },
        price: { // Unit price
            type: Number
        }
    }],
    totalReceivedAmount: {
        type: Number
    },
    receivedBy: {
        type: String,
        // could be ref to User if Auth system exists
    },
    notes: {
        type: String
    },
    status: {
        type: String,
        enum: ['Draft', 'Completed', 'Cancelled'],
        default: 'Draft'
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GRN', grnSchema);
