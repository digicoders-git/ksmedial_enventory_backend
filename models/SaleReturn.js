const mongoose = require('mongoose');

const saleReturnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    invoiceNumber: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      subtotal: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    reason: { type: String },
    status: { type: String, enum: ['Refunded', 'Credit', 'Pending'], default: 'Refunded' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SaleReturn', saleReturnSchema);
