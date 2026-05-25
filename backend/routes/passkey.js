const express = require('express');
const router = express.Router();
const {
  generateRegisterOptions,
  verifyRegistration,
  generateAuthOptions,
  verifyAuthentication,
  checkPasskeyStatus
} = require('../controllers/passkeyController');

router.post('/register/generate', generateRegisterOptions);
router.post('/register/verify', verifyRegistration);
router.post('/auth/generate', generateAuthOptions);
router.post('/auth/verify', verifyAuthentication);
router.get('/status', checkPasskeyStatus);

module.exports = router;