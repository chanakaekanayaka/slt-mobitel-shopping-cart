const { 
  generateRegistrationOptions, 
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { isoUint8Array } = require('@simplewebauthn/server/helpers');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const rpID = process.env.RP_ID || 'localhost';
const rpName = 'ShopEasy';
const origin = process.env.ORIGIN || 'http://localhost:3000';

// ==================== REGISTRATION ====================

const generateRegisterOptions = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userAuthenticators = user.authenticators || [];
    
    // ✅ Convert string to Uint8Array (REQUIRED for v10+)
    const userIdBuffer = isoUint8Array.fromUTF8String(user._id.toString());
    
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userIdBuffer,        // ✅ Uint8Array, not string
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      authenticatorSelection: { 
        residentKey: 'required', 
        userVerification: 'preferred' 
      },
      excludeCredentials: userAuthenticators.map(authenticator => ({
        id: Buffer.from(authenticator.credentialID, 'base64url'),
        type: 'public-key',
        transports: authenticator.transports,
      })),
    });
    
    user.currentChallenge = options.challenge;
    await user.save();
    
    res.json({ success: true, options });
  } catch (error) {
    console.error('Generate registration options error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyRegistration = async (req, res) => {
  try {
    const { email, attestationResponse, deviceName } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    
    if (!verification.verified) {
      return res.status(400).json({ success: false, message: 'Verification failed' });
    }
    
    const { credentialInfo } = verification;
    
    user.authenticators.push({
      credentialID: credentialInfo.credentialID,
      credentialPublicKey: credentialInfo.credentialPublicKey,
      counter: credentialInfo.counter,
      transports: attestationResponse.response.transports || [],
      deviceName: deviceName || 'Unknown Device',
    });
    user.passkeyEnabled = true;
    user.currentChallenge = null;
    await user.save();
    
    res.json({ success: true, message: 'Passkey registered successfully!' });
  } catch (error) {
    console.error('Verify registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== AUTHENTICATION ====================

const generateAuthOptions = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !user.passkeyEnabled || user.authenticators.length === 0) {
      return res.status(404).json({ success: false, message: 'No passkey found' });
    }
    
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: user.authenticators.map(authenticator => ({
        id: Buffer.from(authenticator.credentialID, 'base64url'),
        type: 'public-key',
        transports: authenticator.transports,
      })),
    });
    
    user.currentChallenge = options.challenge;
    await user.save();
    
    res.json({ success: true, options });
  } catch (error) {
    console.error('Generate auth options error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyAuthentication = async (req, res) => {
  try {
    const { email, attestationResponse } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const credentialID = attestationResponse.id;
    const authenticator = user.authenticators.find(auth => auth.credentialID === credentialID);
    
    if (!authenticator) {
      return res.status(400).json({ success: false, message: 'Authenticator not found' });
    }
    
    const verification = await verifyAuthenticationResponse({
      response: attestationResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, 'base64url'),
        credentialPublicKey: authenticator.credentialPublicKey,
        counter: authenticator.counter,
        transports: authenticator.transports,
      },
    });
    
    if (!verification.verified) {
      return res.status(400).json({ success: false, message: 'Authentication failed' });
    }
    
    authenticator.counter = verification.authenticationInfo.newCounter;
    user.currentChallenge = null;
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        isAdmin: user.isAdmin 
      }
    });
  } catch (error) {
    console.error('Verify authentication error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const checkPasskeyStatus = async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email });
    res.json({ success: true, hasPasskey: user?.passkeyEnabled || false });
  } catch (error) {
    res.json({ success: true, hasPasskey: false });
  }
};

module.exports = {
  generateRegisterOptions,
  verifyRegistration,
  generateAuthOptions,
  verifyAuthentication,
  checkPasskeyStatus
};