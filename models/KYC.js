const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submitDate: { type: String },
    kycData: {
        fullName: { type: String },
        address: { type: String },
        panCard: { type: String },
        aadharCard: { type: String },
        panImage: { type: String },
        aadharFrontImage: { type: String },
        aadharBackImage: { type: String },
        bankPassbook: { type: String },
        selfie: { type: String }
    },
    rejectReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('KYC', kycSchema);
