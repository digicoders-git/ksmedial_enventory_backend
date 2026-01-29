const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    licenseNumber: { type: String },
    gstNumber: { type: String },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    bio: { type: String },
    image: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    tagline: { type: String },
    website: { type: String },
    inventorySettings: {
      lowStockThreshold: { type: Number, default: 10 },
      expiryAlertDays: { type: Number, default: 60 },
      enableNegativeStock: { type: Boolean, default: false },
      barcodePrefix: { type: String, default: 'MED' },
      printLabels: { type: Boolean, default: true }
    },
    appSettings: {
      language: { type: String, default: 'en-US' },
      currency: { type: String, default: 'INR' },
      dateFormat: { type: String, default: 'DD-MM-YYYY' },
      enableSound: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      printerType: { type: String, default: 'thermal-3inch' },
      autoPrint: { type: Boolean, default: true },
      scannerMode: { type: String, default: 'keyboard' }
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model('Shop', shopSchema);
