const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    image: { type: String, default: '' },
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    walletBalance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model("User", userSchema);
