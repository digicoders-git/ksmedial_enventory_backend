const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    buttonText: { type: String },
    linkUrl: { type: String },
    image: {
      url: { type: String },
      public_id: { type: String }
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Slider', sliderSchema);
