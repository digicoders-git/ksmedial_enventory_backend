const mongoose = require('mongoose');

const prescriptionRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String, required: true },
        productPrice: { type: Number, required: true },
        quantity: { type: Number, required: true },
      }
    ],
    shippingAddress: {
      name: String,
      phone: String,
      email: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
      country: String
    },
    paymentMethod: { type: String, default: 'COD' },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    adminActionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    rejectionReason: { type: String },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    offerCode: { type: String },
    discount: { type: Number, default: 0 },
    prescriptionImage: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PrescriptionRequest', prescriptionRequestSchema);
