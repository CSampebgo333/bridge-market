const express = require("express")
const router = express.Router()
const { Category, Product } = require("../models")
const { isAuthenticated, hasRole } = require("../middleware/auth")

// Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.findAll()
    res.status(200).json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    res.status(500).json({ message: "Failed to fetch categories", error: error.message })
  }
})

// Get category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id)

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    res.status(200).json(category)
  } catch (error) {
    console.error("Error fetching category:", error)
    res.status(500).json({ message: "Failed to fetch category", error: error.message })
  }
})

// Create new category (admin only)
router.post("/", isAuthenticated, hasRole(["administrator"]), async (req, res) => {
  try {
    const { name, description } = req.body

    const category = await Category.create({
      name,
      description,
    })

    res.status(201).json(category)
  } catch (error) {
    console.error("Error creating category:", error)
    res.status(500).json({ message: "Failed to create category", error: error.message })
  }
})

// Update category (admin only)
router.put("/:id", isAuthenticated, hasRole(["administrator"]), async (req, res) => {
  try {
    const { name, description } = req.body

    const category = await Category.findByPk(req.params.id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    await category.update({
      name,
      description,
      updated_at: new Date(),
    })

    res.status(200).json(category)
  } catch (error) {
    console.error("Error updating category:", error)
    res.status(500).json({ message: "Failed to update category", error: error.message })
  }
})

// Delete category (admin only)
router.delete("/:id", isAuthenticated, hasRole(["administrator"]), async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    await category.destroy()

    res.status(204).end()
  } catch (error) {
    console.error("Error deleting category:", error)
    res.status(500).json({ message: "Failed to delete category", error: error.message })
  }
})

// Get products by category ID
router.get("/:id/products", async (req, res) => {
  try {
    const categoryId = req.params.id

    // Verify category exists
    const category = await Category.findByPk(categoryId)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    // Optional query parameters
    const limit = Number.parseInt(req.query.limit) || 10
    const offset = Number.parseInt(req.query.offset) || 0

    const products = await Product.findAndCountAll({
      where: {
        category_id: categoryId,
        status: "active",
      },
      limit,
      offset,
      order: [["name", "ASC"]],
    })

    res.status(200).json({
      total: products.count,
      products: products.rows,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching products by category:", error)
    res.status(500).json({ message: "Failed to fetch products", error: error.message })
  }
})

module.exports = router