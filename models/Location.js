const mongoose = require('mongoose');

const locationSchema = mongoose.Schema({
    locationCode: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        uppercase: true 
    }, // Format: Aisle-Rack-Shelf-Bin-Partition e.g. 0-R04-S09-1-0
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    vendorName: { type: String, default: '' }, // Optional, looking at screenshot
    category: { 
        type: String, 
        enum: ['Picking', 'Reserve', 'Bulk', 'Returns', 'Expired', 'Quarantine'], 
        default: 'Picking' 
    },
    aisle: { type: String, required: true },
    rack: { type: String, required: true },
    shelf: { type: String, required: true },
    bin: { type: String, required: true },
    partition: { type: String, default: '0' },
    status: { 
        type: String, 
        enum: ['Active', 'Inactive', 'Maintenance', 'Full'], 
        default: 'Active' 
    },
    temperatureType: { 
        type: String, 
        enum: ['Normal', 'Cold', 'Frozen', 'Hazardous'], 
        default: 'Normal' 
    },
    dimension: {
        length: Number,
        width: Number,
        height: Number,
        unit: { type: String, default: 'cm' }
    },
    capacity: {
        maxWeight: Number,
        currentWeight: Number,
        maxVolume: Number,
        currentVolume: Number
    },
    qrCode: { type: String } // URL or Base64 of QR
}, {
    timestamps: true
});

// Composite index to ensure uniqueness per shop
locationSchema.index({ shopId: 1, locationCode: 1 }, { unique: true });

module.exports = mongoose.model('Location', locationSchema);
