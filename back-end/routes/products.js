const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { authenticate, authorize } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/products');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all products with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('category_id').optional().isInt().toInt(),
  query('min_price').optional().isFloat({ min: 0 }).toFloat(),
  query('max_price').optional().isFloat({ min: 0 }).toFloat(),
  query('featured').optional().isBoolean().toBoolean(),
  query('sort_by').optional().isIn(['created_at', 'price', 'name', 'avg_rating']),
  query('sort_order').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const result = await Product.getAll({
      page: req.query.page,
      limit: req.query.limit,
      category_id: req.query.category_id,
      seller_id: req.query.seller_id,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      country_of_origin: req.query.country_of_origin,
      featured: req.query.featured,
      search: req.query.search,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order
    });
    
    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get related products
    const relatedProducts = await Product.getRelated(req.params.id);
    
    res.json({
      ...product,
      relatedProducts
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new product (Seller only)
router.post('/', [
  authenticate,
  authorize('Seller', 'Admin'),
  upload.array('images', 5), // Allow up to 5 images
  body('name').notEmpty().withMessage('Name is required'),
  body('description').optional(),
  body('category_id').isInt().withMessage('Valid category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock_quantity').isInt({ min: 0 }).withMessage('Stock quantity must be a positive number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Delete uploaded files if validation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Process uploaded images
    const images = req.files ? req.files.map(file => {
      // Convert file path to URL path
      return '/uploads/products/' + path.basename(file.path);
    }) : [];
    
    // Create product
    const productId = await Product.create({
      ...req.body,
      seller_id: req.user.user_id,
      images
    });
    
    res.status(201).json({
      message: 'Product created successfully',
      productId
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Delete uploaded files if an error occurs
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (Seller only)
router.put('/:id', [
  authenticate,
  authorize('Seller', 'Admin'),
  upload.array('images', 5), // Allow up to 5 images
  body('name').optional(),
  body('description').optional(),
  body('category_id').optional().isInt(),
  body('price').optional().isFloat({ min: 0 }),
  body('stock_quantity').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Delete uploaded files if validation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if product exists and belongs to the seller
    const product = await Product.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if the user is the seller or an admin
    if (product.seller_id !== req.user.user_id && req.user.user_type !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update this product' });
    }
    
    // Process uploaded images
    let images = undefined;
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => {
        // Convert file path to URL path
        return '/uploads/products/' + path.basename(file.path);
      });
    }
    
    // Update product
    await Product.update(req.params.id, {
      ...req.body,
      images
    });
    
    res.json({
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    // Delete uploaded files if an error occurs
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (Seller only)
router.delete('/:id', [
  authenticate,
  authorize('Seller', 'Admin')
], async (req, res) => {
  try {
    // Check if product exists and belongs to the seller
    const product = await Product.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if the user is the seller or an admin
    if (product.seller_id !== req.user.user_id && req.user.user_type !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this product' });
    }
    
    // Delete product images from filesystem
    if (product.images && product.images.length > 0) {
      product.images.forEach(image => {
        const imagePath = path.join(__dirname, '../public', image.image_path);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }
    
    // Delete product from database
    await Product.delete(req.params.id);
    
    res.json({
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a review to a product
router.post('/:id/reviews', [
  authenticate,
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional(),
  body('content').optional()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if product exists
    const product = await Product.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Add review
    const reviewId = await Product.addReview({
      product_id: req.params.id,
      user_id: req.user.user_id,
      rating: req.body.rating,
      title: req.body.title,
      content: req.body.content
    });
    
    res.status(201).json({
      message: 'Review added successfully',
      reviewId
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reviews for a product
router.get('/:id/reviews', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Check if product exists
    const product = await Product.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get reviews
    const result = await Product.getReviews(
      req.params.id,
      req.query.page,
      req.query.limit
    );
    
    res.json(result);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;