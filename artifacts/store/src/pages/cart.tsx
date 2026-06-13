import React from "react";
import { Link } from "wouter";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

function fmtIQD(n: number) {
  return n.toLocaleString("en-US") + " IQD";
}

const STEP_LABELS = ["Cart", "Checkout", "Complete"];

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center mb-10">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const done   = step < current;
        const active = step === current;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
                transition-all duration-300
                ${done || active
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border text-muted-foreground bg-background"}
              `}>
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <span className={`
                text-[11px] font-bold uppercase tracking-widest hidden sm:block transition-colors
                ${active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}
              `}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`
                flex-1 h-px mx-3 transition-all duration-500
                ${step < current ? "bg-primary" : "bg-border"}
              `} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function Cart() {
  const { items, removeItem, updateQuantity, total } = useCart();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <StepIndicator current={1} />

        <AnimatePresence mode="wait">
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-24"
            >
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-8">
                <ShoppingBag className="h-9 w-9 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold mb-2">Your cart is empty</p>
              <p className="text-muted-foreground mb-8">Add items to get started</p>
              <Button asChild className="h-12 px-10 uppercase font-bold tracking-wider text-sm">
                <Link href="/products">Browse Products</Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="cart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col lg:flex-row gap-12"
            >
              {/* Items */}
              <div className="lg:w-2/3">
                <div className="border-b border-border pb-4 mb-8 hidden md:grid grid-cols-[3fr_1fr_1fr] gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <div>Product</div>
                  <div className="text-center">Quantity</div>
                  <div className="text-right">Total</div>
                </div>

                <div className="space-y-6">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.variantId}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col md:grid md:grid-cols-[3fr_1fr_1fr] gap-4 items-center border-b border-border pb-6"
                      >
                        <div className="flex w-full gap-4">
                          <div className="w-24 aspect-[3/4] bg-secondary flex-shrink-0 overflow-hidden">
                            {item.image
                              ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                                </div>
                            }
                          </div>
                          <div className="flex-1">
                            <Link href={`/products/${item.productId}`} className="font-bold hover:text-primary transition-colors line-clamp-2">
                              {item.title}
                            </Link>
                            <div className="text-sm text-muted-foreground mt-1">
                              {item.option1 && <span>{item.option1}</span>}
                              {item.option2 && <span> / {item.option2}</span>}
                            </div>
                            <div className="font-medium mt-2 md:hidden">{fmtIQD(item.price)}</div>
                            <button
                              onClick={() => removeItem(item.variantId)}
                              className="text-sm text-muted-foreground hover:text-destructive transition-colors mt-3 flex items-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          </div>
                        </div>

                        <div className="w-full md:w-auto flex justify-between md:justify-center items-center">
                          <span className="md:hidden text-sm text-muted-foreground">Quantity</span>
                          <div className="flex items-center border border-input">
                            <button
                              className="px-3 py-2 hover:bg-secondary transition-colors"
                              onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
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
                          {fmtIQD(item.price * item.quantity)}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Summary */}
              <div className="lg:w-1/3">
                <div className="bg-secondary/50 border border-border p-8 sticky top-24">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-5">
                    Order Summary ({items.length} item{items.length !== 1 ? "s" : ""})
                  </p>

                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{fmtIQD(total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-green-600 font-semibold">Free</span>
                    </div>
                    <div className="border-t border-border pt-4 mt-2 flex justify-between text-lg font-black">
                      <span>Total</span>
                      <span>{fmtIQD(total)}</span>
                    </div>
                  </div>

                  <Button asChild className="w-full h-14 text-base font-bold tracking-wider uppercase gap-2">
                    <Link href="/checkout">
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
