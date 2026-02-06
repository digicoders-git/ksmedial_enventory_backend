const mongoose = require('mongoose');

const physicalReceivingSchema = new mongoose.Schema({
    supplierName: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    invoiceValue: { type: Number, required: true },
    skuCount: { type: Number, required: true },
    invoiceDate: { type: Date, required: true },
    // New Fields matching screenshot
    location: { type: String }, 
    poIds: { type: String }, // Comma separated IDs
    isPoNotPresent: { type: Boolean, default: false },

    // Existing fields kept as requested
    orderNumber: { type: String },
    boxCount: { type: Number, default: 0 },
    polyCount: { type: Number, default: 0 },
    
    systemId: { type: String, required: true, unique: true },
    physicalReceivingId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Pending', 'Done'], default: 'Pending' },
    validatedBy: { type: String },
    validationDate: { type: Date },
    
    // GRN Fields
    grnStatus: { type: String, enum: ['Pending', 'Done'], default: 'Pending' },
    grnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    invoiceImageUrl: { type: String },
    grnDate: { type: Date }
}, {
    timestamps: true
});

module.exports = mongoose.model('PhysicalReceiving', physicalReceivingSchema);
