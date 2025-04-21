const db = require('../lib/db');

class Product {
  // Get product by ID with all related information
  static async getById(productId) {
    // Get product details
    const product = await db.getOne(`
      SELECT p.*, c.name as category_name, c.description as category_description,
             u.user_name as seller_name, u.email as seller_email, u.profile_image as seller_image
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      JOIN users u ON p.seller_id = u.user_id
      WHERE p.product_id = ?
    `, [productId]);
    
    if (!product) return null;
    
    // Get product images
    const images = await db.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC',
      [productId]
    );
    
    // Get product reviews
    const reviews = await db.query(`
      SELECT r.*, u.user_name, u.profile_image
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `, [productId]);
    
    // Calculate average rating
    let avgRating = null;
    if (reviews.length > 0) {
      const sum = reviews.reduce((total, review) => total + review.rating, 0);
      avgRating = sum / reviews.length;
    }
    
    // Get seller details
    const seller = await db.getOne(`
      SELECT s.*, u.user_name, u.email, u.profile_image, u.joined_date
      FROM sellers s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.user_id = ?
    `, [product.seller_id]);
    
    return {
      ...product,
      images,
      reviews,
      avgRating,
      seller
    };
  }

  // Get all products with filtering and pagination
  static async getAll(options = {}) {
    const {
      page = 1,
      limit = 12,
      category_id,
      seller_id,
      min_price,
      max_price,
      country_of_origin,
      featured,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;
    
    const offset = (page - 1) * limit;
    
    // Build the query
    let sql = `
      SELECT p.*, c.name as category_name, 
             u.user_name as seller_name,
             (SELECT image_path FROM product_images WHERE product_id = p.product_id AND is_primary = TRUE LIMIT 1) as primary_image,
             (SELECT AVG(rating) FROM reviews WHERE product_id = p.product_id) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as review_count
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      JOIN users u ON p.seller_id = u.user_id
    `;
    
    // Build WHERE clause
    const whereConditions = [];
    const params = [];
    
    if (category_id) {
      whereConditions.push('p.category_id = ?');
      params.push(category_id);
    }
    
    if (seller_id) {
      whereConditions.push('p.seller_id = ?');
      params.push(seller_id);
    }
    
    if (min_price !== undefined) {
      whereConditions.push('p.price >= ?');
      params.push(min_price);
    }
    
    if (max_price !== undefined) {
      whereConditions.push('p.price <= ?');
      params.push(max_price);
    }
    
    if (country_of_origin) {
      whereConditions.push('p.country_of_origin = ?');
      params.push(country_of_origin);
    }
    
    if (featured !== undefined) {
      whereConditions.push('p.featured = ?');
      params.push(featured);
    }
    
    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // Add sorting
    const validSortColumns = ['created_at', 'price', 'name', 'avg_rating'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';
    
    if (sortColumn === 'avg_rating') {
      sql += ' ORDER BY avg_rating ' + sortOrder;
    } else {
      sql += ` ORDER BY p.${sortColumn} ${sortOrder}`;
    }
    
    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Execute query
    const products = await db.query(sql, params);
    
    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM products p';
    
    if (whereConditions.length > 0) {
      countSql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    const countResult = await db.getOne(countSql, params.slice(0, params.length - 2));
    const total = countResult.total;
    
    return {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Create a new product
  static async create(productData) {
    const connection = await db.beginTransaction();
    
    try {
      // Insert product
      const productId = await db.insert('products', {
        seller_id: productData.seller_id,
        name: productData.name,
        description: productData.description,
        category_id: productData.category_id,
        price: productData.price,
        expiry_date: productData.expiry_date,
        manufacture_date: productData.manufacture_date,
        weight: productData.weight,
        weight_unit: productData.weight_unit,
        country_of_origin: productData.country_of_origin,
        stock_quantity: productData.stock_quantity,
        featured: productData.featured || false,
        discount: productData.discount
      });
      
      // Insert product images if provided
      if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
        for (let i = 0; i < productData.images.length; i++) {
          await db.insert('product_images', {
            product_id: productId,
            image_path: productData.images[i],
            is_primary: i === 0 // First image is primary
          });
        }
      }
      
      // Commit the transaction
      await db.commitTransaction(connection);
      
      return productId;
    } catch (error) {
      // Rollback the transaction in case of error
      await db.rollbackTransaction(connection);
      throw error;
    }
  }

  // Update product
  static async update(productId, productData) {
    const connection = await db.beginTransaction();
    
    try {
      // Update product
      const productFields = {};
      
      if (productData.name) productFields.name = productData.name;
      if (productData.description) productFields.description = productData.description;
      if (productData.category_id) productFields.category_id = productData.category_id;
      if (productData.price !== undefined) productFields.price = productData.price;
      if (productData.expiry_date) productFields.expiry_date = productData.expiry_date;
      if (productData.manufacture_date) productFields.manufacture_date = productData.manufacture_date;
      if (productData.weight !== undefined) productFields.weight = productData.weight;
      if (productData.weight_unit) productFields.weight_unit = productData.weight_unit;
      if (productData.country_of_origin) productFields.country_of_origin = productData.country_of_origin;
      if (productData.stock_quantity !== undefined) productFields.stock_quantity = productData.stock_quantity;
      if (productData.featured !== undefined) productFields.featured = productData.featured;
      if (productData.discount !== undefined) productFields.discount = productData.discount;
      
      if (Object.keys(productFields).length > 0) {
        await db.update('products', productFields, { product_id: productId });
      }
      
      // Update product images if provided
      if (productData.images && Array.isArray(productData.images)) {
        // Delete existing images
        await db.remove('product_images', { product_id: productId });
        
        // Insert new images
        if (productData.images.length > 0) {
          for (let i = 0; i < productData.images.length; i++) {
            await db.insert('product_images', {
              product_id: productId,
              image_path: productData.images[i],
              is_primary: i === 0 // First image is primary
            });
          }
        }
      }
      
      // Commit the transaction
      await db.commitTransaction(connection);
      
      return true;
    } catch (error) {
      // Rollback the transaction in case of error
      await db.rollbackTransaction(connection);
      throw error;
    }
  }

  // Delete product
  static async delete(productId) {
    return db.remove('products', { product_id: productId });
  }

  // Get related products
  static async getRelated(productId, limit = 4) {
    // Get the category of the current product
    const product = await db.getOne('SELECT category_id FROM products WHERE product_id = ?', [productId]);
    
    if (!product) return [];
    
    // Get related products from the same category
    return db.query(`
      SELECT p.*, 
             (SELECT image_path FROM product_images WHERE product_id = p.product_id AND is_primary = TRUE LIMIT 1) as primary_image,
             (SELECT AVG(rating) FROM reviews WHERE product_id = p.product_id) as avg_rating
      FROM products p
      WHERE p.category_id = ? AND p.product_id != ?
      ORDER BY RAND()
      LIMIT ?
    `, [product.category_id, productId, limit]);
  }

  // Add a review to a product
  static async addReview(reviewData) {
    return db.insert('reviews', {
      product_id: reviewData.product_id,
      user_id: reviewData.user_id,
      rating: reviewData.rating,
      title: reviewData.title,
      content: reviewData.content
    });
  }

  // Get reviews for a product
  static async getReviews(productId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const reviews = await db.query(`
      SELECT r.*, u.user_name, u.profile_image
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [productId, limit, offset]);
    
    const countResult = await db.getOne(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = ?',
      [productId]
    );
    
    return {
      reviews,
      pagination: {
        total: countResult.total,
        page,
        limit,
        pages: Math.ceil(countResult.total / limit)
      }
    };
  }
}

module.exports = Product;