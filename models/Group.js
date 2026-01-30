const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    slug: { type: String, unique: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
