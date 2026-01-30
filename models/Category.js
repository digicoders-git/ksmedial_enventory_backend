const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    color: { type: String, default: 'bg-blue-50 text-blue-600' },
    slug: { type: String, unique: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
