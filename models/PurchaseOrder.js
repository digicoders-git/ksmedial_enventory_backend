const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        unique: true,
        required: true
    },
    poDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    expectedDeliveryDate: {
        type: Date
    },
    supplierName: {
        type: String,
        required: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        // Making it optional for now, in case manual name entry is allowed, create a supplier if needed? 
        // Or strictly link to Suppliers. Let's start with strict if possible, but existing code might just use names. 
        // User said "Supplier Name". I'll keep name string for now for flexibility + ID if available. 
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        medicineName: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        purchaseRate: { // Buying Price
            type: Number,
            required: true
        },
        gst: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Sent to Supplier', 'Dispatched', 'Approved by Supplier', 'Cancelled', 'Closed'],
        default: 'Draft'
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Middleware to auto-generate PO Number
purchaseOrderSchema.pre('validate', async function() {
    if (!this.poNumber) {
        const count = await mongoose.model('PurchaseOrder').countDocuments();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        this.poNumber = `PO-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
