const mongoose = require('mongoose');

const unitSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Shop'
    }
}, {
    timestamps: true
});

// Compound index to ensure unique code per shop
unitSchema.index({ shop: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Unit', unitSchema);
