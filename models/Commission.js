const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    amount: { type: Number, required: true },
    level: { type: Number, required: true }, // 1, 2, or 3
    description: { type: String },
    status: { type: String, enum: ['pending', 'credited'], default: 'credited' }
}, { timestamps: true });

module.exports = mongoose.model('Commission', commissionSchema);
