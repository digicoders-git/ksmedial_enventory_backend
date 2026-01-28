const mongoose = require('mongoose');

const activityLogSchema = mongoose.Schema(
    {
        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Shop',
        },
        action: {
            type: String,
            required: true,
        },
        details: {
            type: String,
        },
        ip: {
            type: String,
        },
        type: {
            type: String,
            enum: ['Auth', 'System', 'Inventory', 'Settings', 'Profile', 'Sales', 'Purchase'],
            default: 'System',
        },
        user: {
            type: String, // Name of the user who performed action
            required: true
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
