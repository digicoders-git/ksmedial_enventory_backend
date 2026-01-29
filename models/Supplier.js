const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contactPerson: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    city: { type: String },
    gstNumber: { type: String },
    drugLicenseNumber: { type: String },
    rating: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
