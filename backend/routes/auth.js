const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// @desc    Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      provider: 'email',
      isAdmin: false
    });
    
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin }, 
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
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
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create admin user directly
router.post('/create-admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      provider: 'email',
      isAdmin: true
    });
    
    await admin.save();
    
    const token = jwt.sign(
      { userId: admin._id, isAdmin: admin.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully!',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        isAdmin: admin.isAdmin
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all users (Admin only)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('Fetching all users...');
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    console.log(`Found ${users.length} users`);
    res.json({ success: true, users: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get single user by ID (Admin only)
router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Make user admin / Remove admin (Admin only)
router.put('/make-admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isAdmin } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.isAdmin = isAdmin;
    await user.save();
    
    console.log(`User ${user.email} admin status changed to: ${isAdmin}`);
    
    res.json({ 
      success: true, 
      message: `User ${isAdmin ? 'promoted to admin' : 'demoted from admin'}`,
      user: { id: user._id, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete user (Admin only)
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Prevent deleting another admin
    if (user.isAdmin) {
      const currentUser = await User.findById(req.user.userId);
      if (currentUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot delete admin users' });
      }
    }
    
    await User.findByIdAndDelete(req.params.id);
    console.log(`User ${user.email} deleted successfully`);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;