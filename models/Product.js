const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    genericName: { type: String },
    company: { type: String }, // Manufacturer
    batchNumber: { type: String, default: 'N/A' }, // Made optional as master might not have batch
    expiryDate: { type: String, default: 'N/A' },
    purchasePrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    quantity: { type: Number, default: 0 },
    category: { type: String },
    sku: { type: String, unique: true },
    slug: { type: String, unique: true },
    reorderLevel: { type: Number, default: 20 },
    packing: { type: String },
    hsnCode: { type: String },
    tax: { type: Number, default: 0 },
    unit: { type: String },
    description: { type: String },
    isPrescriptionRequired: { type: Boolean, default: false },
    rackLocation: { type: String },
    image: { type: String },
    brand: { type: String },
    group: { type: String },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
