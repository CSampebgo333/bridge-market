const db = require("../lib/db")

class Seller {
  static async findAll() {
    const [sellers] = await db.query(
      `SELECT u.*, s.*
       FROM User u
       JOIN Seller s ON u.user_id = s.user_id
       WHERE u.user_type = 'Seller'`,
    )
    return sellers
  }

  static async findById(userId) {
    const [seller] = await db.query(
      `SELECT u.*, s.*
       FROM User u
       JOIN Seller s ON u.user_id = s.user_id
       WHERE u.user_id = ? AND u.user_type = 'Seller'`,
      [userId],
    )
    return seller[0]
  }

  static async create(userData, sellerData) {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Create user first
      const [userResult] = await connection.query(
        `INSERT INTO User (user_name, email, phone_number, country, user_type)
         VALUES (?, ?, ?, ?, 'Seller')`,
        [userData.user_name, userData.email, userData.phone_number, userData.country],
      )

      const userId = userResult.insertId

      // Create seller record
      await connection.query(
        `INSERT INTO Seller (user_id, business_name, business_license, address, rating, preferred_payment_method)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          sellerData.business_name,
          sellerData.business_license,
          sellerData.address,
          sellerData.rating || null,
          sellerData.preferred_payment_method,
        ],
      )

      await connection.commit()

      return this.findById(userId)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  static async update(userId, userData, sellerData) {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Update user data
      await connection.query(
        `UPDATE User SET
         user_name = ?,
         phone_number = ?,
         country = ?
         WHERE user_id = ?`,
        [userData.user_name, userData.phone_number, userData.country, userId],
      )

      // Update seller data
      await connection.query(
        `UPDATE Seller SET
         business_name = ?,
         business_license = ?,
         address = ?,
         preferred_payment_method = ?
         WHERE user_id = ?`,
        [
          sellerData.business_name,
          sellerData.business_license,
          sellerData.address,
          sellerData.preferred_payment_method,
          userId,
        ],
      )

      await connection.commit()

      return this.findById(userId)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  static async updateRating(userId, rating) {
    await db.query("UPDATE Seller SET rating = ? WHERE user_id = ?", [rating, userId])

    return this.findById(userId)
  }

  static async getProducts(sellerId, page = 1, limit = 10) {
    const offset = (page - 1) * limit

    const [products] = await db.query(
      `SELECT p.*, c.name as category_name,
        (SELECT pi.image_url FROM ProductImage pi WHERE pi.product_id = p.product_id AND pi.is_primary = TRUE LIMIT 1) as primary_image,
        (SELECT AVG(r.rating) FROM Review r WHERE r.product_id = p.product_id) as avg_rating,
        (SELECT COUNT(*) FROM Review r WHERE r.product_id = p.product_id) as review_count
       FROM Product p
       LEFT JOIN Category c ON p.category_id = c.category_id
       WHERE p.seller_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [sellerId, limit, offset],
    )

    const [countResult] = await db.query("SELECT COUNT(*) as total FROM Product WHERE seller_id = ?", [sellerId])

    return {
      products,
      pagination: {
        total: countResult[0].total,
        page,
        limit,
        pages: Math.ceil(countResult[0].total / limit),
      },
    }
  }

  static async getOrders(sellerId, page = 1, limit = 10) {
    const offset = (page - 1) * limit

    const [orders] = await db.query(
      `SELECT DISTINCT o.*, u.user_name as customer_name
       FROM \`Order\` o
       JOIN OrderDetail od ON o.order_id = od.order_id
       JOIN Product p ON od.product_id = p.product_id
       JOIN User u ON o.customer_id = u.user_id
       WHERE p.seller_id = ?
       ORDER BY o.order_date DESC
       LIMIT ? OFFSET ?`,
      [sellerId, limit, offset],
    )

    const [countResult] = await db.query(
      `SELECT COUNT(DISTINCT o.order_id) as total
       FROM \`Order\` o
       JOIN OrderDetail od ON o.order_id = od.order_id
       JOIN Product p ON od.product_id = p.product_id
       WHERE p.seller_id = ?`,
      [sellerId],
    )

    return {
      orders,
      pagination: {
        total: countResult[0].total,
        page,
        limit,
        pages: Math.ceil(countResult[0].total / limit),
      },
    }
  }
}

module.exports = Seller