const express = require("express")
const router = express.Router()
const { Delivery, Logistician } = require("../models")
const { authenticateUser, authorizeRoles } = require("../middleware/auth")

// Get all deliveries (admin only)
router.get("/", authenticateUser, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10

    const deliveries = await Delivery.findAll(page, limit)
    res.json(deliveries)
  } catch (error) {
    console.error("Error fetching deliveries:", error)
    res.status(500).json({ error: "Failed to fetch deliveries" })
  }
})

// Get delivery by ID
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)

    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" })
    }

    // Check if user is authorized to view this delivery
    if (
      req.user.userType !== "Admin" &&
      req.user.id !== delivery.customer_id &&
      req.user.id !== delivery.logistician_id
    ) {
      return res.status(403).json({ error: "Not authorized to view this delivery" })
    }

    res.json(delivery)
  } catch (error) {
    console.error("Error fetching delivery:", error)
    res.status(500).json({ error: "Failed to fetch delivery" })
  }
})

// Get delivery by order ID
router.get("/order/:orderId", authenticateUser, async (req, res) => {
  try {
    const delivery = await Delivery.findByOrderId(req.params.orderId)

    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found for this order" })
    }

    // Check if user is authorized to view this delivery
    if (
      req.user.userType !== "Admin" &&
      req.user.id !== delivery.customer_id &&
      req.user.id !== delivery.logistician_id
    ) {
      return res.status(403).json({ error: "Not authorized to view this delivery" })
    }

    res.json(delivery)
  } catch (error) {
    console.error("Error fetching delivery:", error)
    res.status(500).json({ error: "Failed to fetch delivery" })
  }
})

// Get deliveries by customer ID
router.get("/customer/:customerId", authenticateUser, async (req, res) => {
  try {
    const customerId = req.params.customerId

    // Check if user is authorized to view these deliveries
    if (req.user.userType !== "Admin" && req.user.id !== Number.parseInt(customerId)) {
      return res.status(403).json({ error: "Not authorized to view these deliveries" })
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10

    const deliveries = await Delivery.findByCustomerId(customerId, page, limit)
    res.json(deliveries)
  } catch (error) {
    console.error("Error fetching deliveries:", error)
    res.status(500).json({ error: "Failed to fetch deliveries" })
  }
})

// Get deliveries by logistician ID
router.get("/logistician/:logisticianId", authenticateUser, async (req, res) => {
  try {
    const logisticianId = req.params.logisticianId

    // Check if user is authorized to view these deliveries
    if (req.user.userType !== "Admin" && req.user.id !== Number.parseInt(logisticianId)) {
      return res.status(403).json({ error: "Not authorized to view these deliveries" })
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const status = req.query.status

    const deliveries = await Delivery.findByLogisticianId(logisticianId, page, limit)
    res.json(deliveries)
  } catch (error) {
    console.error("Error fetching deliveries:", error)
    res.status(500).json({ error: "Failed to fetch deliveries" })
  }
})

// Create a new delivery
router.post("/", authenticateUser, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const {
      order_id,
      logistician_id,
      customer_id,
      estimated_delivery_date,
      delivery_cost,
      tracking_number,
      delivery_notes,
    } = req.body

    if (!order_id || !customer_id) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const delivery = await Delivery.create({
      order_id,
      logistician_id,
      customer_id,
      estimated_delivery_date,
      delivery_cost,
      tracking_number,
      delivery_notes,
    })

    res.status(201).json(delivery)
  } catch (error) {
    console.error("Error creating delivery:", error)
    res.status(500).json({ error: "Failed to create delivery" })
  }
})

// Assign logistician to delivery
router.patch("/:id/assign", authenticateUser, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const { logistician_id } = req.body

    if (!logistician_id) {
      return res.status(400).json({ error: "Logistician ID is required" })
    }

    // Check if logistician exists and is available
    const logistician = await Logistician.findById(logistician_id)

    if (!logistician) {
      return res.status(404).json({ error: "Logistician not found" })
    }

    if (!logistician.availability_status) {
      return res.status(400).json({ error: "Logistician is not available" })
    }

    const delivery = await Delivery.assignLogistician(req.params.id, logistician_id)

    res.json(delivery)
  } catch (error) {
    console.error("Error assigning logistician:", error)
    res.status(500).json({ error: "Failed to assign logistician" })
  }
})

// Update delivery status
router.patch("/:id/status", authenticateUser, async (req, res) => {
  try {
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ error: "Status is required" })
    }

    // Get the delivery to check permissions
    const delivery = await Delivery.findById(req.params.id)

    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" })
    }

    // Only admin or assigned logistician can update status
    if (
      req.user.userType !== "Admin" &&
      (req.user.userType !== "Logistician" || req.user.id !== delivery.logistician_id)
    ) {
      return res.status(403).json({ error: "Not authorized to update this delivery" })
    }

    const updatedDelivery = await Delivery.updateStatus(req.params.id, status)

    res.json(updatedDelivery)
  } catch (error) {
    console.error("Error updating delivery status:", error)
    res.status(500).json({ error: "Failed to update delivery status" })
  }
})

// Update delivery
router.put("/:id", authenticateUser, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const {
      logistician_id,
      delivery_date,
      estimated_delivery_date,
      delivery_cost,
      delivery_status,
      tracking_number,
      delivery_notes,
    } = req.body

    const delivery = await Delivery.update(req.params.id, {
      logistician_id,
      delivery_date,
      estimated_delivery_date,
      delivery_cost,
      delivery_status,
      tracking_number,
      delivery_notes,
    })

    res.json(delivery)
  } catch (error) {
    console.error("Error updating delivery:", error)
    res.status(500).json({ error: "Failed to update delivery" })
  }
})

module.exports = router