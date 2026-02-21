const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    color: { type: String, default: 'bg-blue-50 text-blue-600' },
    slug: { type: String, unique: true },
    defaultUnit: { type: String, default: 'Pcs' },
    gst: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
