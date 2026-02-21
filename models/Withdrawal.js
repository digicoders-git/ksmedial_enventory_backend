const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    method: { type: String },
    accountDetails: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
    referenceId: { type: String },
    date: { type: String },
    rejectReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
