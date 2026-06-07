import React, { useState } from "react";
import { Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";

type ShippingForm = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  phone: string;
};

const SHIPPING_METHODS = [
  { id: "standard", label: "Standard Shipping", duration: "5–7 business days", price: 0 },
  { id: "express", label: "Express Shipping", duration: "2–3 business days", price: 9.99 },
  { id: "overnight", label: "Overnight Delivery", duration: "Next business day", price: 24.99 },
];

const steps = ["Shipping", "Delivery", "Payment", "Confirmation"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                {done ? <Check className="h-4 w-4" /> : step}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [orderNumber] = useState(() => "#" + Math.floor(10000 + Math.random() * 90000));

  const [form, setForm] = useState<ShippingForm>({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    phone: "",
  });

  const selectedMethod = SHIPPING_METHODS.find((m) => m.id === shippingMethod)!;
  const shippingCost = selectedMethod.price;
  const grandTotal = total + shippingCost;

  const updateForm = (field: keyof ShippingForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
    clearCart();
  };

  if (items.length === 0 && step < 4) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <p className="text-muted-foreground mb-8">Your cart is empty.</p>
          <Button asChild>
            <Link href="/products">Shop Now</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (step === 4) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 max-w-md text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8">
            <Check className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-2">Order number: <span className="font-bold text-foreground">{orderNumber}</span></p>
          <p className="text-muted-foreground mb-8">
            Thank you, {form.firstName}! We've received your order and will send a confirmation to {form.email || "your email"} once it ships.
          </p>
          <div className="bg-secondary p-6 text-left mb-8 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping to</span>
              <span className="font-medium">{form.city}, {form.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-medium">{selectedMethod.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total charged</span>
              <span className="font-bold">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <Button asChild className="h-12 px-8 uppercase font-bold tracking-wider">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
          <div className="lg:w-3/5">
            <StepIndicator current={step} />

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleStep1}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold tracking-tighter uppercase">Shipping Address</h2>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required placeholder="your@email.com" className="h-12" value={form.email} onChange={updateForm("email")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" required className="h-12" value={form.firstName} onChange={updateForm("firstName")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" required className="h-12" value={form.lastName} onChange={updateForm("lastName")} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" required className="h-12" value={form.address} onChange={updateForm("address")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" required className="h-12" value={form.city} onChange={updateForm("city")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input id="postalCode" required className="h-12" value={form.postalCode} onChange={updateForm("postalCode")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" required className="h-12" value={form.country} onChange={updateForm("country")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input id="phone" type="tel" className="h-12" value={form.phone} onChange={updateForm("phone")} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-14 text-base uppercase font-bold tracking-wider">
                    Continue to Delivery
                  </Button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleStep2}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold tracking-tighter uppercase">Delivery Method</h2>
                  <div className="border border-border p-4 text-sm text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">{form.firstName} {form.lastName}</span> — {form.address}, {form.city}, {form.country}
                    <button type="button" onClick={() => setStep(1)} className="text-primary ml-2 underline text-xs">Edit</button>
                  </div>
                  <div className="space-y-3">
                    {SHIPPING_METHODS.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${shippingMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            value={method.id}
                            checked={shippingMethod === method.id}
                            onChange={() => setShippingMethod(method.id)}
                            className="accent-primary"
                          />
                          <div>
                            <div className="font-bold text-sm">{method.label}</div>
                            <div className="text-xs text-muted-foreground">{method.duration}</div>
                          </div>
                        </div>
                        <div className="font-bold text-sm">
                          {method.price === 0 ? <span className="text-green-600">Free</span> : `$${method.price.toFixed(2)}`}
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" className="flex-1 h-14 uppercase font-bold tracking-wider" onClick={() => setStep(1)}>Back</Button>
                    <Button type="submit" className="flex-1 h-14 text-base uppercase font-bold tracking-wider">Continue to Payment</Button>
                  </div>
                </motion.form>
              )}

              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handlePlaceOrder}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold tracking-tighter uppercase">Payment</h2>
                  <div className="border border-border p-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{form.email}</span> · {form.city}, {form.country} · {selectedMethod.label}
                    <button type="button" onClick={() => setStep(2)} className="text-primary ml-2 underline text-xs">Edit</button>
                  </div>
                  <p className="text-xs text-muted-foreground bg-secondary p-3">
                    This is a demo store — no real payment will be processed.
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input id="cardNumber" placeholder="4242 4242 4242 4242" className="h-12" readOnly value="4242 4242 4242 4242" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry</Label>
                        <Input id="expiry" placeholder="MM / YY" className="h-12" readOnly value="12 / 28" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input id="cvv" placeholder="123" className="h-12" readOnly value="123" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nameOnCard">Name on Card</Label>
                      <Input id="nameOnCard" className="h-12" value={`${form.firstName} ${form.lastName}`} readOnly />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" className="flex-1 h-14 uppercase font-bold tracking-wider" onClick={() => setStep(2)}>Back</Button>
                    <Button type="submit" className="flex-1 h-14 text-base uppercase font-bold tracking-wider">
                      Place Order • ${grandTotal.toFixed(2)}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:w-2/5">
            <div className="bg-secondary p-8 sticky top-24">
              <h2 className="text-xl font-bold tracking-tighter uppercase mb-6">Order Summary</h2>
              <div className="space-y-4 mb-6 max-h-[320px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-3">
                    <div className="w-14 aspect-[3/4] bg-background relative flex-shrink-0">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="font-bold line-clamp-1">{item.title}</div>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {item.option1} {item.option2 && `/ ${item.option2}`}
                      </div>
                    </div>
                    <div className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className={shippingCost === 0 ? "text-green-600 font-medium" : "font-medium"}>
                    {shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
