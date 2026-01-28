const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
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
        expiryDate: {
            type: Date
        },
        quantity: {
            type: Number,
            required: true
        },
        purchasePrice: {
            type: Number,
            required: true
        },
        sellingPrice: {
             type: Number
        },
        mrp: {
             type: Number
        },
        tax: {
            type: Number,
            default: 0
        },
        amount: {
            type: Number,
            required: true
        }
    }],
    subTotal: {
        type: Number,
        required: true
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Received', 'Pending', 'Cancelled'],
        default: 'Received'
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Pending', 'Partial'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI'],
        default: 'Cash'
    },
    notes: {
        type: String
    },
    purchaseDate: {
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

module.exports = mongoose.model('Purchase', purchaseSchema);
