const mongoose = require('mongoose');

const pickerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
    totalOrdersPicked: { type: Number, default: 0 }
  },
  { 
    timestamps: true
  }
);

module.exports = mongoose.model("Picker", pickerSchema);
