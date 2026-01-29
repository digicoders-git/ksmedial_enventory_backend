const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    reason: { type: String, required: true },
    quantity: { type: Number, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String }, // Snapshot of name
    batchNumber: { type: String }, // Snapshot
    note: { type: String },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
