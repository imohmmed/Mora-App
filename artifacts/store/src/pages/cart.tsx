import React, { useState } from "react";
import { Link } from "wouter";
import { Trash2, Plus, Minus, Tag, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const MOCK_DISCOUNT_CODES: Record<string, number> = {
  MORA10: 10,
  MORA20: 20,
  WELCOME: 15,
};

export default function Cart() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);

  const applyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const code = discountCode.trim().toUpperCase();
    if (MOCK_DISCOUNT_CODES[code]) {
      setAppliedCode(code);
      setDiscountPercent(MOCK_DISCOUNT_CODES[code]);
      toast.success(`Discount code "${code}" applied — ${MOCK_DISCOUNT_CODES[code]}% off!`);
      setDiscountCode("");
    } else {
      toast.error("Invalid discount code. Try MORA10, MORA20, or WELCOME.");
    }
  };

  const removeDiscount = () => {
    setAppliedCode(null);
    setDiscountPercent(0);
    toast("Discount code removed");
  };

  const discountAmount = appliedCode ? (total * discountPercent) / 100 : 0;
  const grandTotal = total - discountAmount;

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
                        <button className="px-3 py-2 hover:bg-secondary transition-colors" onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                        <button className="px-3 py-2 hover:bg-secondary transition-colors" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>
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

                {/* Discount code */}
                <div className="mb-6">
                  {appliedCode ? (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <Tag className="h-4 w-4" />
                        <span>{appliedCode} — {discountPercent}% off</span>
                      </div>
                      <button onClick={removeDiscount} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={applyDiscount} className="flex gap-2">
                      <Input
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        placeholder="Discount code"
                        className="h-10 text-sm uppercase flex-1"
                      />
                      <Button type="submit" variant="outline" size="sm" className="h-10 px-4 text-xs font-bold uppercase tracking-wide">
                        Apply
                      </Button>
                    </form>
                  )}
                </div>

                <div className="space-y-4 text-sm mb-8">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Discount ({discountPercent}%)</span>
                      <span className="font-medium">−${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-muted-foreground text-xs italic">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-border pt-4 mt-4 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button asChild className="w-full h-14 text-base font-bold tracking-wider uppercase">
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Try codes: MORA10, MORA20, WELCOME
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
