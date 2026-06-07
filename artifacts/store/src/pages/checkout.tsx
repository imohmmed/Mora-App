import React, { useState } from "react";
import { Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePlaceOrder = () => {
    setIsSuccess(true);
    clearCart();
  };

  if (isSuccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 max-w-md text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase mb-4">Order Confirmed</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your purchase! We've received your order and will email you with tracking information once it ships.
          </p>
          <Button asChild className="h-12 px-8 uppercase font-bold tracking-wider">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (items.length === 0 && step === 1) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <p className="text-muted-foreground mb-8">Your cart is empty.</p>
          <Button asChild><Link href="/products">Shop Now</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
          <div className="lg:w-3/5">
            <div className="flex gap-4 mb-8 text-sm font-bold uppercase tracking-wider">
              <button 
                className={`transition-colors ${step === 1 ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => setStep(1)}
              >
                1. Information
              </button>
              <span className="text-muted-foreground">/</span>
              <button 
                className={`transition-colors ${step === 2 ? "text-primary" : "text-muted-foreground"}`}
                disabled={step === 1}
              >
                2. Review & Payment
              </button>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.form 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleContinue}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tighter uppercase">Contact Information</h2>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required placeholder="Email address" className="h-12" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tighter uppercase">Shipping Address</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" required className="h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" required className="h-12" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" required className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" required className="h-12" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" required className="h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input id="postalCode" required className="h-12" />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 text-base uppercase font-bold tracking-wider">
                    Continue to Payment
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <div className="border border-border p-6 space-y-4">
                    <div className="flex justify-between pb-4 border-b border-border">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Contact</div>
                        <div className="font-medium">customer@example.com</div>
                      </div>
                      <button onClick={() => setStep(1)} className="text-sm text-primary underline">Change</button>
                    </div>
                    <div className="flex justify-between pt-2">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Ship to</div>
                        <div className="font-medium">123 Main St, City, Country</div>
                      </div>
                      <button onClick={() => setStep(1)} className="text-sm text-primary underline">Change</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tighter uppercase">Payment</h2>
                    <p className="text-sm text-muted-foreground mb-4">This is a demo store. No actual payment will be processed.</p>
                    <div className="border border-border p-6 bg-secondary/50 text-center text-sm font-medium">
                      Simulated Checkout Active
                    </div>
                  </div>

                  <Button onClick={handlePlaceOrder} className="w-full h-14 text-base uppercase font-bold tracking-wider">
                    Place Order • ${(total).toFixed(2)}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:w-2/5">
            <div className="bg-secondary p-8 sticky top-24">
              <h2 className="text-xl font-bold tracking-tighter uppercase mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-4">
                    <div className="w-16 aspect-[3/4] bg-background relative">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="font-bold line-clamp-1">{item.title}</div>
                      <div className="text-muted-foreground mt-1">
                        {item.option1} {item.option2 && `/ ${item.option2}`}
                      </div>
                    </div>
                    <div className="font-bold text-sm">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="border-t border-border pt-4 mt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
