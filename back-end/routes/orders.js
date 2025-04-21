const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Product = require('../models/product');
const { authenticate, authorize } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

// Get all orders (with filtering by user role)
router.get('/', [
  authenticate,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  query('sort_by').optional().isIn(['order_date', 'total_amount', 'status']),
  query('sort_order').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Filter orders based on user role
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order
    };
    
    switch (req.user.user_type) {
      case 'Customer':
        options.customer_id = req.user.user_id;
        break;
      case 'Seller':
        options.seller_id = req.user.user_id;
        break;
      case 'Logistician':
        options.logistician_id = req.user.user_id;
        break;
      case 'Admin':
        // Admin can see all orders
        break;
      default:
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await Order.getAll(options);
    
    res.json(result);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get order by ID
router.get('/:id', [
  authenticate
], async (req, res) => {
  try {
    const order = await Order.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if user has permission to view this order
    const hasPermission = 
      req.user.user_type === 'Admin' || 
      (req.user.user_type === 'Customer' && order.customer_id === req.user.user_id) ||
      (req.user.user_type === 'Seller' && order.items.some(item => item.seller_id === req.user.user_id)) ||
      (req.user.user_type === 'Logistician' && order.delivery && order.delivery.logistician_id === req.user.user_id);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to view this order' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new order (Customer only)
router.post('/', [
  authenticate,
  authorize('Customer'),
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.product_id').isInt().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of req.body.items) {
      const product = await Product.getById(item.product_id);
      
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.product_id} not found` });
      }
      
      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}` 
        });
      }
      
      // Calculate price (considering discounts)
      const price = product.discount ? 
        product.price * (1 - product.discount / 100) : 
        product.price;
      
      totalAmount += price * item.quantity;
      
      orderItems.push({
        product_id: product.product_id,
        quantity: item.quantity,
        price: price
      });
    }
    
    // Create order
    const orderId = await Order.create({
      customer_id: req.user.user_id,
      total_amount: totalAmount,
      items: orderItems,
      payment: req.body.payment,
      delivery: {
        ...req.body.delivery,
        customer_id: req.user.user_id
      }
    });
    
    res.status(201).json({
      message: 'Order created successfully',
      orderId
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status (Admin or Seller)
router.patch('/:id/status', [
  authenticate,
  authorize('Admin', 'Seller'),
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const order = await Order.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if seller has permission to update this order
    if (req.user.user_type === 'Seller') {
      const hasPermission = order.items.some(item => item.seller_id === req.user.user_id);
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'You do not have permission to update this order' });
      }
    }
    
    // Update order status
    await Order.updateStatus(req.params.id, req.body.status);
    
    res.json({
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update payment status (Admin)
router.patch('/:id/payment', [
  authenticate,
  authorize('Admin'),
  body('status').isIn(['pending', 'completed', 'failed', 'refunded']).withMessage('Invalid payment status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const order = await Order.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update payment status
    await Order.updatePaymentStatus(
      req.params.id, 
      req.body.status, 
      req.body.transaction_reference
    );
    
    res.json({
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update delivery status (Admin or Logistician)
router.patch('/:id/delivery', [
  authenticate,
  authorize('Admin', 'Logistician'),
  body('status').isIn(['pending', 'processing', 'in_transit', 'delivered', 'failed']).withMessage('Invalid delivery status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const order = await Order.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if logistician has permission to update this delivery
    if (req.user.user_type === 'Logistician' && 
        order.delivery && 
        order.delivery.logistician_id !== req.user.user_id) {
      return res.status(403).json({ error: 'You do not have permission to update this delivery' });
    }
    
    // Update delivery status
    await Order.updateDeliveryStatus(
      req.params.id, 
      req.body.status, 
      req.body.delivery_date
    );
    
    // If delivery is completed, also update order status
    if (req.body.status === 'delivered') {
      await Order.updateStatus(req.params.id, 'delivered');
    }
    
    res.json({
      message: 'Delivery status updated successfully'
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign logistician to delivery (Admin only)
router.patch('/:id/assign-logistician', [
  authenticate,
  authorize('Admin'),
  body('logistician_id').isInt().withMessage('Valid logistician ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const order = await Order.getById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Assign logistician
    await Order.assignLogistician(req.params.id, req.body.logistician_id);
    
    res.json({
      message: 'Logistician assigned successfully'
    });
  } catch (error) {
    console.error('Assign logistician error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;