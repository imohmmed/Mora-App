import React from "react";
import { Link } from "wouter";
import { Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

export default function Cart() {
  const { items, removeItem, updateQuantity, total } = useCart();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tighter uppercase mb-12">Your Cart</h1>
        
        {items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground mb-8">Your cart is currently empty.</p>
            <Button asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-2/3">
              <div className="border-b border-border pb-4 mb-8 hidden md:grid grid-cols-[3fr_1fr_1fr] gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <div>Product</div>
                <div className="text-center">Quantity</div>
                <div className="text-right">Total</div>
              </div>
              
              <div className="space-y-8">
                {items.map((item) => (
                  <div key={item.variantId} className="flex flex-col md:grid md:grid-cols-[3fr_1fr_1fr] gap-4 items-center border-b border-border pb-8">
                    <div className="flex w-full gap-4">
                      <div className="w-24 aspect-[3/4] bg-secondary flex-shrink-0">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <Link href={`/products/${item.productId}`} className="font-bold hover:text-primary transition-colors line-clamp-2">
                          {item.title}
                        </Link>
                        <div className="text-sm text-muted-foreground mt-2">
                          {item.option1 && <span>{item.option1}</span>}
                          {item.option2 && <span> / {item.option2}</span>}
                        </div>
                        <div className="font-medium mt-2 md:hidden">${item.price.toFixed(2)}</div>
                        <button 
                          onClick={() => removeItem(item.variantId)}
                          className="text-sm text-muted-foreground hover:text-destructive transition-colors mt-4 flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-auto flex justify-between md:justify-center items-center">
                      <span className="md:hidden text-sm text-muted-foreground">Quantity</span>
                      <div className="flex items-center border border-input">
                        <button
                          className="px-3 py-2 hover:bg-secondary transition-colors"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          className="px-3 py-2 hover:bg-secondary transition-colors"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-auto flex justify-between md:justify-end items-center font-bold">
                      <span className="md:hidden text-sm text-muted-foreground">Total</span>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:w-1/3">
              <div className="bg-secondary p-8">
                <h2 className="text-xl font-bold tracking-tighter uppercase mb-6">Order Summary</h2>
                <div className="space-y-4 text-sm mb-8">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-muted-foreground text-xs italic">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-border pt-4 mt-4 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                
                <Button asChild className="w-full h-14 text-base font-bold tracking-wider uppercase">
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
