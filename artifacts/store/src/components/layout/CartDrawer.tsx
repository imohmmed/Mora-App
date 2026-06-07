import React from "react";
import { Drawer } from "vaul";
import { X, Trash2, Plus, Minus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const { items, isDrawerOpen, setIsDrawerOpen, removeItem, updateQuantity, total } = useCart();
  const [, setLocation] = useLocation();

  const handleCheckout = () => {
    setIsDrawerOpen(false);
    setLocation("/checkout");
  };

  return (
    <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 right-0 top-0 w-[400px] max-w-[100vw] bg-background z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <Drawer.Title className="font-bold text-lg">Your Cart</Drawer.Title>
            <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
                <p>Your cart is empty.</p>
                <Button onClick={() => setIsDrawerOpen(false)} variant="outline">
                  Continue Shopping
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.variantId} className="flex gap-4">
                  <div className="w-20 h-24 bg-secondary overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                      <button onClick={() => removeItem(item.variantId)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.option1 && <span>{item.option1}</span>}
                      {item.option2 && <span> / {item.option2}</span>}
                    </div>
                    <div className="mt-auto flex justify-between items-end">
                      <div className="flex items-center border border-input">
                        <button
                          className="px-2 py-1 hover:bg-secondary"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-sm text-center w-8">{item.quantity}</span>
                        <button
                          className="px-2 py-1 hover:bg-secondary"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="p-4 border-t bg-secondary/30 flex flex-col gap-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Taxes and shipping calculated at checkout
              </p>
              <Button onClick={handleCheckout} className="w-full h-12 text-base">
                Checkout
              </Button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
