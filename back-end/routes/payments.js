const express = require("express")
const router = express.Router()
const { Payment } = require("../models")
const { authenticateUser, authorizeRoles } = require("../middleware/auth")

// Get all payments (admin only)
router.get("/", authenticateUser, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10

    const payments = await Payment.findAll(page, limit)
    res.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    res.status(500).json({ error: "Failed to fetch payments" })
  }
})

// Get payment by ID
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" })
    }

    // Check if user is authorized to view this payment
    if (req.user.userType !== "Admin" && req.user.id !== payment.customer_id) {
      return res.status(403).json({ error: "Not authorized to view this payment" })
    }

    res.json(payment)
  } catch (error) {
    console.error("Error fetching payment:", error)
    res.status(500).json({ error: "Failed to fetch payment" })
  }
})

// Get payments by order ID
router.get("/order/:orderId", authenticateUser, async (req, res) => {
  try {
    const payment = await Payment.findByOrderId(req.params.orderId)

    if (!payment) {
      return res.status(404).json({ error: "Payment not found for this order" })
    }

    // Check if user is authorized to view this payment
    if (req.user.userType !== "Admin" && req.user.id !== payment.customer_id) {
      return res.status(403).json({ error: "Not authorized to view this payment" })
    }

    res.json(payment)
  } catch (error) {
    console.error("Error fetching payment:", error)
    res.status(500).json({ error: "Failed to fetch payment" })
  }
})

// Get payments by customer ID
router.get("/customer/:customerId", authenticateUser, async (req, res) => {
  try {
    const customerId = req.params.customerId

    // Check if user is authorized to view these payments
    if (req.user.userType !== "Admin" && req.user.id !== Number.parseInt(customerId)) {
      return res.status(403).json({ error: "Not authorized to view these payments" })
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10

    const payments = await Payment.findByCustomerId(customerId, page, limit)
    res.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    res.status(500).json({ error: "Failed to fetch payments" })
  }
})

// Create a new payment
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { order_id, amount, method, status } = req.body

    if (!order_id || !amount || !method) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Set customer_id to the current user's ID
    const customer_id = req.user.id

    const payment = await Payment.create({
      order_id,
      customer_id,
      amount,
      method,
      status,
    })

    res.status(201).json(payment)
  } catch (error) {
    console.error("Error creating payment:", error)
    res.status(500).json({ error: "Failed to create payment" })
  }
})

// Update payment status (admin only)
router.patch("/:id/status", authenticateUser, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ error: "Status is required" })
    }

    const payment = await Payment.update(req.params.id, { status })

    res.json(payment)
  } catch (error) {
    console.error("Error updating payment status:", error)
    res.status(500).json({ error: "Failed to update payment status" })
  }
})

// Update payment (admin only)
router.put("/:id", authenticateUser, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const { status, method } = req.body

    const payment = await Payment.update(req.params.id, { status, method })

    res.json(payment)
  } catch (error) {
    console.error("Error updating payment:", error)
    res.status(500).json({ error: "Failed to update payment" })
  }
})

// Delete payment (admin only)
router.delete("/:id", authenticateUser, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    await Payment.delete(req.params.id)

    res.json({ message: "Payment deleted successfully" })
  } catch (error) {
    console.error("Error deleting payment:", error)
    res.status(500).json({ error: "Failed to delete payment" })
  }
})

module.exports = router