const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    adminId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'superadmin' },
    isActive: { type: Boolean, default: true }
  },
  { 
    timestamps: true 
  }
);

// Method to compare password (straight comparison as per project style)
adminSchema.methods.matchPassword = async function(enteredPassword) {
  return enteredPassword === this.password;
};

module.exports = mongoose.model('Admin', adminSchema);
