import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check, MapPin, Phone, DollarSign, ShoppingBag } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

function fmtIQD(n: number) {
  return n.toLocaleString("en-US") + " IQD";
}

const SNAP_KEY = "mora_order_snap";

type CartItem = {
  variantId: string;
  title: string;
  price: number;
  quantity: number;
  option1?: string;
  option2?: string;
  image?: string;
};

type OrderSnap = {
  items: CartItem[];
  subtotal: number;
  orderNumber: string;
  form: {
    name: string;
    phone: string;
    city: string;
    district: string;
    street: string;
    note: string;
  };
};

const TX = {
  enter: { opacity: 0, x: 40,  scale: 0.98 },
  show:  { opacity: 1, x: 0,   scale: 1    },
  transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
};

const STEP_LABELS = ["Cart", "Checkout", "Complete"];

function StepIndicator() {
  return (
    <div className="flex items-center mb-10">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const done   = step < 3;
        const active = step === 3;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{
                  scale: active ? 1.1 : 1,
                  backgroundColor: done || active ? "hsl(var(--primary))" : "transparent",
                  borderColor:     done || active ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}
                transition={{ duration: 0.35, type: "spring", stiffness: 220, damping: 18 }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <span className="text-primary-foreground">{step}</span>
                )}
              </motion.div>
              <span className={`text-[11px] font-bold uppercase tracking-widest hidden sm:block
                ${active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <motion.div
                animate={{ backgroundColor: step < 3 ? "hsl(var(--primary))" : "hsl(var(--border))" }}
                transition={{ duration: 0.5 }}
                className="flex-1 h-px mx-3"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function CheckoutComplete() {
  const [snap, setSnap] = useState<OrderSnap | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SNAP_KEY);
      if (raw) {
        setSnap(JSON.parse(raw) as OrderSnap);
        sessionStorage.removeItem(SNAP_KEY);
      }
    } catch {}
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <StepIndicator />

        {!snap ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-8">
              <ShoppingBag className="h-9 w-9 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold mb-2">No order found</p>
            <p className="text-muted-foreground mb-8">Your order may have already been confirmed.</p>
            <Button asChild className="h-12 px-10 uppercase font-bold tracking-wider text-sm">
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <motion.div
            key="success"
            initial={TX.enter} animate={TX.show}
            transition={TX.transition}
            className="max-w-2xl mx-auto"
          >
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 230, damping: 18, delay: 0.05 }}
              className="text-center mb-10"
            >
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
                <Check className="h-10 w-10 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter uppercase mb-3">Order Placed!</h1>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-5 py-2 rounded-full mb-4">
                <span className="text-sm font-bold text-primary tracking-wide">{snap.orderNumber}</span>
              </div>
              <p className="text-muted-foreground">
                Thank you{snap.form.name ? `, ${snap.form.name.split(" ")[0]}` : ""}! We'll prepare your order right away.
              </p>
            </motion.div>

            {/* Items */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="border border-border bg-secondary/30 p-6 mb-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Order Items</p>
              <div className="space-y-3 mb-4">
                {snap.items.map((item) => (
                  <div key={item.variantId} className="flex justify-between items-center text-sm gap-3">
                    <span className="font-medium line-clamp-1 flex-1">
                      {item.title}{" "}
                      <span className="text-muted-foreground font-normal">×{item.quantity}</span>
                    </span>
                    <span className="font-bold flex-shrink-0">{fmtIQD(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600 font-semibold">Free</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{fmtIQD(snap.subtotal)}</span>
                </div>
              </div>
            </motion.div>

            {/* Delivery details */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid sm:grid-cols-3 gap-3 mb-8"
            >
              {[
                { icon: MapPin,     label: "Delivery", value: [snap.form.district, snap.form.city].filter(Boolean).join(", ") || "—" },
                { icon: Phone,      label: "Phone",    value: snap.form.phone || "—" },
                { icon: DollarSign, label: "Payment",  value: "Cash on Delivery" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="border border-border bg-secondary/30 p-4 flex gap-3">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <Button asChild className="w-full h-12 uppercase font-bold tracking-wider text-sm">
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
