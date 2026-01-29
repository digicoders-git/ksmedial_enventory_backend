const mongoose = require('mongoose');

const purchaseReturnSchema = new mongoose.Schema({
    returnNumber: {
        type: String,
        required: true,
        unique: true
    },
    purchaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase',
        required: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        batchNumber: {
            type: String
        },
        returnQuantity: {
            type: Number,
            required: true
        },
        purchasePrice: {
            type: Number,
            required: true
        },
        amount: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    reason: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Adjusted', 'Refunded'],
        default: 'Pending'
    },
    returnDate: {
        type: Date,
        default: Date.now
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PurchaseReturn', purchaseReturnSchema);
