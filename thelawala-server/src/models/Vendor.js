const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const vendorSchema = new mongoose.Schema({
  thelaId: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  isBroadcasting: { type: Boolean, default: false },
  lastLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  currentInventory: { type: Array, default: [] },
}, { timestamps: true });

vendorSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

vendorSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('Vendor', vendorSchema);
