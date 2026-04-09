const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const clientSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

clientSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

clientSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('Client', clientSchema);
