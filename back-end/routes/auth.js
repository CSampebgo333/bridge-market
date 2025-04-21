const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Register a new user
router.post('/register', [
  // Validation
  body('user_name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('user_type').isIn(['Customer', 'Seller', 'Logistician']).withMessage('Invalid user type')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if user already exists
    const existingUser = await User.getByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Create user
    const userId = await User.create(req.body);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        name: req.body.user_name,
        email: req.body.email,
        user_type: req.body.user_type
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', [
  // Validation
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Find user by email
    const user = await User.getByEmail(req.body.email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await User.verifyPassword(user, req.body.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update last login time
    await User.update(user.user_id, { last_login: new Date() });
    
    res.json({
      token,
      user: {
        id: user.user_id,
        name: user.user_name,
        email: user.email,
        user_type: user.user_type
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const userDetails = await User.getFullDetails(req.user.user_id);
    res.json(userDetails);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;