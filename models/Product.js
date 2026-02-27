const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    genericName: { type: String },
    company: { type: String }, // Manufacturer
    batchNumber: { type: String, default: 'N/A' },
    expiryDate: { type: String, default: 'N/A' },
    purchasePrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 }, // mapped to price
    mrp: { type: Number, default: 0 },
    stock: { type: Number, default: 0 }, // specifically for admin app view
    quantity: { type: Number, default: 0 }, // inventory view
    category: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    sku: { type: String, unique: true, sparse: true },
    slug: { type: String, unique: true, sparse: true },
    reorderLevel: { type: Number, default: 20 },
    packing: { type: String },
    hsnCode: { type: String },
    tax: { type: Number, default: 0 },
    unit: { type: String, default: 'Pcs' },
    description: { type: String },
    about: { type: String },
    isPrescriptionRequired: { type: Boolean, default: false },
    rackLocation: { type: String },
    image: { type: String }, // Main Image
    galleryImages: [{ type: String }],
    brand: { type: String },
    manufacturer: { type: String },
    batchNo: { type: String },
    discountPercent: { type: Number, default: 0 },
    sizes: [{ type: String }],
    colors: [{ type: String }],
    addOns: [{
        name: String,
        price: Number,
        isDefault: Boolean
    }],
    schedule: { type: String, default: 'H' },
    nppaMrp: { type: Number, default: 0 },
    manufacturingDate: { type: String, default: 'N/A' },
    isInventoryLive: { type: Boolean, default: false },
    group: { type: String },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }, // Added
    status: { type: String, default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
