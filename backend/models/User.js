const mongoose = require('mongoose');

const AuthenticatorSchema = new mongoose.Schema({
  credentialID: { type: String, required: true },
  credentialPublicKey: { type: String, required: true },
  counter: { type: Number, required: true },
  transports: { type: [String], default: [] },
  deviceName: { type: String, default: 'Unknown Device' },
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  provider: { type: String, enum: ['email', 'google', 'facebook', 'passkey'], default: 'email' },
  providerId: { type: String },
  isAdmin: { type: Boolean, default: false },
  passkeyEnabled: { type: Boolean, default: false },
  authenticators: [AuthenticatorSchema],
  currentChallenge: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);