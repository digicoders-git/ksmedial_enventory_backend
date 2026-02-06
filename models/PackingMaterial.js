const mongoose = require('mongoose');

const packingMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true }, // e.g., 'Box', 'Poly Bag', 'Tape', 'Label'
    dimensions: { type: String }, // e.g. "10x10x5 cm"
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: 'Pcs' }, // Pcs, Kg, Roll
    minStockLevel: { type: Number, default: 100 },
    supplier: { type: String },
    description: { type: String },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    lastRestocked: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PackingMaterial', packingMaterialSchema);
