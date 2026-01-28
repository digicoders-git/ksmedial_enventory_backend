const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    batchNumber: { type: String, required: true },
    expiryDate: { type: String, required: true },
    purchasePrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    quantity: { type: Number, default: 0 },
    category: { type: String },
    sku: { type: String, unique: true },
    reorderLevel: { type: Number, default: 20 },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
