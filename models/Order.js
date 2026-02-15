const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    productPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String },
    color: { type: String },
    addOnName: { type: String },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderNumber: { type: String, unique: true },
    items: { type: [orderItemSchema], required: true },

    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },

    offerCode: { type: String },

    status: {
      type: String,
      enum: [
        "pending", "confirmed", "shipped", "delivered", "cancelled", 
        "Picking", "On Hold", "Packing", "Problem Queue", "Billing",
        "Picklist Generated", "Quality Check", "Scanned For Shipping", "Unallocated"
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "COD" },
    
    // Razorpay fields
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },

    shippingAddress: { type: addressSchema, required: true },
    notes: { type: String, default: "" },

    // Enhanced Tracking Fields
    vendorId: { type: String },
    orderType: { type: String, default: 'KS4' },
    rapidOrderType: { type: String },
    vendorRefId: { type: String },
    expectedHandover: { type: Date },
    
    prescriptionImage: {
      url: { type: String },
      publicId: { type: String },
    },
    
    // Added for Inventory Panel Workflow
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    problemDescription: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
