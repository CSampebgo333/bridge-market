"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { ShoppingCart, Heart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Update the product data to include the correct image paths
const products = [
  {
    id: 1,
    name: "Fonio Grain",
    category: "Grains",
    price: 2500,
    rating: 4.5,
    origin: "Burkina Faso",
    image: "/images/fonio.jpg",
    seller: "Burkina Organic Farms",
  },
  {
    id: 2,
    name: "Millet",
    category: "Grains",
    price: 1800,
    rating: 4.2,
    origin: "Mali",
    image: "/images/millet.jpg",
    seller: "Mali Grain Cooperative",
  },
  {
    id: 3,
    name: "Cassava",
    category: "Tubers",
    price: 1200,
    rating: 4.0,
    origin: "Niger",
    image: "/images/cassava.jpg",
    seller: "Niger Root Farms",
  },
  {
    id: 4,
    name: "Okra",
    category: "Vegetables",
    price: 900,
    rating: 4.7,
    origin: "Burkina Faso",
    image: "/images/okra.jpg",
    seller: "Ouaga Fresh Produce",
  },
  {
    id: 5,
    name: "Sweet Potatoes",
    category: "Tubers",
    price: 1500,
    rating: 4.3,
    origin: "Mali",
    image: "/images/sweet_potatoes.jpg",
    seller: "Mali Root Vegetables",
  },
  {
    id: 6,
    name: "Sorghum",
    category: "Grains",
    price: 2200,
    rating: 4.1,
    origin: "Niger",
    image: "/images/sorghum.jpg",
    seller: "Niger Grain Producers",
  },
  {
    id: 7,
    name: "Hibiscus",
    category: "Herbs",
    price: 3000,
    rating: 4.8,
    origin: "Burkina Faso",
    image: "/images/hibiscus.jpg",
    seller: "Burkina Herb Gardens",
  },
  {
    id: 8,
    name: "Plantains",
    category: "Fruits",
    price: 1700,
    rating: 4.4,
    origin: "Mali",
    image: "/images/plantain.jpg",
    seller: "Mali Fruit Farms",
  },
]

export function ProductCatalog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState("featured")

  // Sort products based on selected option
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortOption) {
      case "price-low":
        return a.price - b.price
      case "price-high":
        return b.price - a.price
      case "rating":
        return b.rating - a.rating
      default:
        return 0 // featured - maintain original order
    }
  })

  // Filter products based on search query
  const filteredProducts = sortedProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.origin.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container mx-auto space-y-6 my-8 px-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-none search-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg cursor-pointer product-card"
            >
              <div className="aspect-square relative">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="object-cover w-full h-full"
                />
                <Badge className="absolute top-2 right-2 category-badge">{product.category}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-background/80 hover:bg-background"
                >
                  <Heart className="h-4 w-4" />
                  <span className="sr-only">Add to favorites</span>
                </Button>
              </div>
              <CardContent className="p-3 pb-0">
                <div className="mb-1">
                  <h3 className="font-semibold text-sm">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">{product.seller}</p>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <StarRating rating={product.rating} size="sm" />
                  <span className="text-xs text-muted-foreground">({product.rating})</span>
                </div>
                <p className="text-xs mt-1">Origin: {product.origin}</p>
              </CardContent>
              <CardFooter className="p-3 pt-2 flex justify-between items-center">
                <span className="font-semibold text-sm">{product.price.toLocaleString()} XOF</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" /> Add
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="h-7 px-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Link href={`/products/${product.id}`}>View</Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}