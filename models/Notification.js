const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['critical', 'warning', 'info', 'success'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);

