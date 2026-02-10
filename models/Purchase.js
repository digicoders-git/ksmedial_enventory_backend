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
    
    // Link to Physical Receiving
    physicalReceivingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'PhysicalReceiving' 
    },

    // Invoice Level Summary
    priority: {
        type: String,
        enum: ['P1', 'P2', 'P3'],
        default: 'P3'
    },
    receivingLocation: {
        type: String,
        default: 'Dock-1'
    },
    
    invoiceSummary: {
        taxableAmount: { type: Number, default: 0 },
        tcsAmount: { type: Number, default: 0 },
        mrpValue: { type: Number, default: 0 },
        netAmount: { type: Number, default: 0 },
        amountAfterGst: { type: Number, default: 0 },
        roundAmount: { type: Number, default: 0 },
        invoiceAmount: { type: Number, default: 0 }
    },
    
    // Tax Breakup
    taxBreakup: {
        gst5: { taxable: { type: Number, default: 0 }, tax: { type: Number, default: 0 } },
        gst12: { taxable: { type: Number, default: 0 }, tax: { type: Number, default: 0 } },
        gst18: { taxable: { type: Number, default: 0 }, tax: { type: Number, default: 0 } },
        gst28: { taxable: { type: Number, default: 0 }, tax: { type: Number, default: 0 } }
    },
    
    // Invoice Metadata
    invoiceDate: { type: Date },
    
    // Multiple SKU Items
    items: [{
        // Supplier & Product Info
        supplierSkuId: { type: String },
        skuId: { type: String },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
             required: true
        },
        productName: { type: String },
        pack: { type: String },
        
        // Batch & Expiry
        batchNumber: { type: String },
        expiryDate: { type: Date },
        mfgDate: { type: Date },
        
        // System MRP
        systemMrp: { type: Number },
        
        // Quantities
        orderedQty: { type: Number, default: 0 },
        receivedQty: { type: Number, required: true },
        physicalFreeQty: { type: Number, default: 0 },
        schemeFreeQty: { type: Number, default: 0 },
        
        // Pricing
        poRate: { type: Number },
        ptr: { type: Number },
        baseRate: { type: Number },
        schemeDiscount: { type: Number, default: 0 },
        discountPercent: { type: Number, default: 0 },
        
        // Amounts
        amount: { type: Number, required: true },
        
        // Tax & Codes
        hsnCode: { type: String },
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
        
        // Final Pricing
        purchasePrice: { type: Number, required: true },
        sellingPrice: { type: Number },
        mrp: { type: Number },
        margin: { type: Number, default: 0 }
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
        enum: ['Received', 'Pending', 'Cancelled', 'Putaway_Pending'],
        default: 'Pending'
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
