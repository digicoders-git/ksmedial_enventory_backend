const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String }, // For guest customers or if customer record is deleted
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      subtotal: { type: Number, required: true }
    }],
     patientDetails: {
        name: String,
        age: String,
        gender: { type: String, enum: ['Male', 'Female', 'Other'] },
        mobile: String,
        address: String,
        doctorName: String,
        doctorAddress: String
     },
     shippingDetails: {
        packingType: { type: String, enum: ['Box', 'Poly', 'Both'], default: 'Box' },
        boxCount: { type: Number, default: 0 },
        polyCount: { type: Number, default: 0 },
        isColdStorage: { type: Boolean, default: false }
     },
     totalAmount: { type: Number, required: true },
     subTotal: { type: Number, default: 0 },
     taxAmount: { type: Number, default: 0 },
     discountAmount: { type: Number, default: 0 },
     returnedAmount: { type: Number, default: 0 },
     paymentMethod: { type: String, enum: ['Cash', 'Online', 'Card', 'UPI', 'Credit'], default: 'Cash' },
    status: { type: String, enum: ['Paid', 'Pending', 'Cancelled', 'Returned', 'Partial'], default: 'Paid' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
