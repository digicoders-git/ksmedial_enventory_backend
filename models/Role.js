const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    permissions: [{
      module: { type: String, required: true }, // 'Inventory', 'Sales', 'Customers', 'Reports', 'Settings', etc.
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }]
  },
  { timestamps: true }
);

// Prevent duplicate role names within the same shop
roleSchema.index({ shopId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
