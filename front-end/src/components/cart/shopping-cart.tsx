"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Minus } from "lucide-react"

// Sample cart items
const initialCartItems = [
  {
    id: 1,
    name: "Fonio Grain",
    price: 2500,
    quantity: 2,
    image: "/placeholder.svg?height=80&width=80",
    seller: "Burkina Organic Farms",
  },
  {
    id: 3,
    name: "Cassava",
    price: 1200,
    quantity: 1,
    image: "/placeholder.svg?height=80&width=80",
    seller: "Niger Root Farms",
  },
  {
    id: 7,
    name: "Hibiscus",
    price: 3000,
    quantity: 1,
    image: "/placeholder.svg?height=80&width=80",
    seller: "Burkina Herb Gardens",
  },
]

export function ShoppingCart() {
  const [cartItems, setCartItems] = useState(initialCartItems)
  const [promoCode, setPromoCode] = useState("")
  const [promoApplied, setPromoApplied] = useState(false)

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return

    setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)))
  }

  const removeItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const applyPromoCode = () => {
    if (promoCode.trim()) {
      setPromoApplied(true)
    }
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0 // 10% discount
  const shippingCost = cartItems.length > 0 ? 1500 : 0
  const total = subtotal - discount + shippingCost

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Trash2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Looks like you haven't added any products to your cart yet.</p>
        <Button asChild>
          <a href="/products">Browse Products</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex gap-4 py-4 border-b">
              <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                <img src={item.image || "/placeholder.svg"} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.seller}</p>
                <p className="font-medium mt-1">{item.price.toLocaleString()} XOF</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove</span>
                </Button>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                    <span className="sr-only">Decrease</span>
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                    <span className="sr-only">Increase</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{subtotal.toLocaleString()} XOF</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between text-green-600">
                  <span>Discount (10%)</span>
                  <span>-{discount.toLocaleString()} XOF</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shippingCost.toLocaleString()} XOF</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold text-lg mb-6">
              <span>Total</span>
              <span>{total.toLocaleString()} XOF</span>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={promoApplied}
                />
                <Button variant="outline" onClick={applyPromoCode} disabled={promoApplied || !promoCode.trim()}>
                  Apply
                </Button>
              </div>

              {promoApplied && <div className="text-sm text-green-600">Promo code applied successfully!</div>}

              <Button className="w-full">Proceed to Checkout</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}