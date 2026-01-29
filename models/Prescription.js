const mongoose = require('mongoose');

const prescriptionSchema = mongoose.Schema({
    patient: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    gender: {
        type: String,
        default: 'Unknown'
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    doctor: {
        type: String,
        default: 'Self'
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected'],
        default: 'Pending'
    },
    items: {
        type: Number,
        default: 0
    },
    urgency: {
        type: String,
        enum: ['Normal', 'High'],
        default: 'Normal'
    },
    image: {
        type: String, 
        required: true
    },
    reason: {
        type: String 
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Shop'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
