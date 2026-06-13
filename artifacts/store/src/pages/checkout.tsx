import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import { useStoreAuth } from "@/hooks/use-store-auth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check, ArrowLeft, MapPin, Phone, Package,
  DollarSign, Loader2, Eye, EyeOff,
  ShoppingBag, User, ChevronRight,
} from "lucide-react";

const BASE = "/api";
const SNAP_KEY = "mora_store_wayl_snap";

const PAYMENT_LOGOS = [
  { key: "mastercard", src: "/payment/visa.webp"   },
  { key: "zaincash",   src: "/payment/zaincash.png" },
  { key: "fastpay",    src: "/payment/fastpay.png"  },
  { key: "fib",        src: "/payment/fib.jpeg"     },
  { key: "qicard",     src: "/payment/qicard.png"   },
];

function fmtIQD(n: number) {
  return n.toLocaleString("en-US") + " IQD";
}

type Step = 1 | 2;
type FormState = {
  name: string; phone: string;
  city: string; district: string; street: string; note: string;
};
type OrderSnap = {
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  orderNumber: string;
  form: FormState;
};

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

function LoginGate({ onLogin }: { onLogin: (email: string, pw: string) => Promise<unknown> }) {
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try { await onLogin(email, pw); }
    catch (err: unknown) { setError((err as Error).message || "Invalid credentials"); }
    finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-sm mx-auto"
    >
      <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6 mx-auto">
        <ShoppingBag className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-2xl font-bold tracking-tighter uppercase text-center mb-2">
        Sign In to Checkout
      </h2>
      <p className="text-muted-foreground text-center text-sm mb-8">
        Don&apos;t have an account?{" "}
        <Link href="/account" className="text-primary underline">Create one</Link>
      </p>
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-md mb-5">
          {error}
        </div>
      )}
      <form onSubmit={handle} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" required className="h-12" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Input type={showPw ? "text" : "password"} required className="h-12 pr-10"
              value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-12 uppercase font-bold tracking-wider text-sm" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {loading ? "Signing in…" : "Sign In & Continue"}
        </Button>
      </form>
    </motion.div>
  );
}

function OrderSidebar({ items, subtotal }: { items: ReturnType<typeof useCart>["items"]; subtotal: number }) {
  return (
    <div className="lg:w-2/5">
      <div className="border border-border bg-secondary/30 p-6 sticky top-24">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Order Summary ({items.length} item{items.length !== 1 ? "s" : ""})
        </p>
        <div className="space-y-3 max-h-72 overflow-y-auto mb-4 pr-1">
          {items.map((item) => (
            <div key={item.variantId} className="flex gap-3 items-center">
              <div className="w-12 h-14 bg-background border border-border flex-shrink-0 overflow-hidden relative">
                {item.image
                  ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>}
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                {(item.option1 || item.option2) && (
                  <p className="text-xs text-muted-foreground">
                    {item.option1}{item.option2 ? ` / ${item.option2}` : ""}
                  </p>
                )}
              </div>
              <span className="text-sm font-bold flex-shrink-0">{fmtIQD(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{fmtIQD(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="text-green-600 font-semibold">Free</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-border pt-3 mt-1">
            <span>Total</span>
            <span>{fmtIQD(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user, token, isLoading, login } = useStoreAuth();

  const [step, setStep]         = useState<Step>(1);
  const [payMethod, setPayMethod] = useState<"cod" | "online">("cod");
  const [placing, setPlacing]   = useState(false);
  const [placeError, setPlaceError] = useState("");
  const orderRef = useRef<OrderSnap | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "", phone: "", city: "", district: "", street: "", note: "",
  });

  // Detect return from Wayl payment (web)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      try {
        const snap = sessionStorage.getItem(SNAP_KEY);
        if (snap) {
          const { items: snapItems, subtotal: snapSubtotal, orderNumber, form: snapForm } = JSON.parse(snap) as OrderSnap;
          orderRef.current = { items: snapItems, subtotal: snapSubtotal, orderNumber, form: snapForm };
          sessionStorage.removeItem(SNAP_KEY);
          clearCart();
          setStep(2);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name:     f.name     || `${user.firstName} ${user.lastName}`.trim(),
        phone:    f.phone    || user.phone || "",
        city:     f.city     || user.address?.["city"]     || "",
        district: f.district || user.address?.["district"] || "",
        street:   f.street   || user.address?.["street"]   || "",
      }));
    }
  }, [user]);

  const upd = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacing(true); setPlaceError("");
    try {
      const res = await fetch(`${BASE}/store/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: user?.email || "",
          subtotal: total,
          shipping: 0,
          shippingAddress: {
            fullName: form.name, phone: form.phone,
            city: form.city, district: form.district, street: form.street,
          },
          lineItems: items.map((i) => ({
            variantId: i.variantId, title: i.title,
            quantity: i.quantity, price: i.price,
            option1: i.option1, option2: i.option2, image: i.image,
          })),
          paymentMethod: payMethod,
          note: form.note,
        }),
      });
      const json = await res.json() as { data: { order_number?: string; orderNumber?: string } | null; error?: string };
      if (!res.ok) throw new Error(json.error || "Order failed");

      const orderNumber = json.data?.order_number || json.data?.orderNumber || "#—";

      if (payMethod === "online") {
        const waylRes = await fetch(`${BASE}/store/wayl/create-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber,
            total,
            lineItems: items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })),
            redirectionUrl: `${window.location.origin}/checkout?paid=1`,
          }),
        });
        const waylJson = await waylRes.json() as { data: { url?: string } | null; error?: string };
        const waylUrl = waylJson.data?.url;
        if (waylUrl) {
          sessionStorage.setItem(SNAP_KEY, JSON.stringify({ items: [...items], subtotal: total, orderNumber, form: { ...form } }));
          window.location.href = waylUrl;
          return;
        }
      }

      orderRef.current = { items: [...items], subtotal: total, orderNumber, form: { ...form } };
      clearCart();
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setPlaceError((err as Error).message || "Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0 && step < 2) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-8">
            <ShoppingBag className="h-9 w-9 text-muted-foreground" />
          </div>
          <p className="text-xl font-bold mb-2">Your cart is empty</p>
          <p className="text-muted-foreground mb-8">Add items to your cart before checking out.</p>
          <Button asChild className="h-12 px-10 uppercase font-bold tracking-wider text-sm">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (step === 2) {
    const snap = orderRef.current!;
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <StepIndicator current={3} />

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="text-center mb-10"
          >
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
              <Check className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase mb-3">Order Placed!</h1>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-5 py-2 rounded-full mb-4">
              <span className="text-sm font-bold text-primary tracking-wide">{snap?.orderNumber}</span>
            </div>
            <p className="text-muted-foreground">
              Thank you{snap?.form.name ? `, ${snap.form.name.split(" ")[0]}` : ""}! We'll prepare your order right away.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="border border-border bg-secondary/30 p-6 mb-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Order Items</p>
            <div className="space-y-3 mb-4">
              {snap?.items.map((item) => (
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
                <span>{fmtIQD(snap?.subtotal || 0)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid sm:grid-cols-3 gap-3 mb-8"
          >
            {[
              {
                icon: MapPin,
                label: "Delivery",
                value: [snap?.form.district, snap?.form.city].filter(Boolean).join(", ") || "—",
              },
              { icon: Phone, label: "Phone", value: snap?.form.phone || "—" },
              { icon: DollarSign, label: "Payment", value: "Cash on Delivery" },
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
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <StepIndicator current={2} />

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <LoginGate onLogin={login} />
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="lg:w-3/5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.form
                  key="checkout"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  onSubmit={handlePlaceOrder}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <Link href="/cart" className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1">
                      <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h2 className="text-xl font-bold tracking-tighter uppercase">Delivery Information</h2>
                  </div>

                  <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 px-4 py-3 rounded text-sm">
                    <User className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Signed in as <strong>{user.email}</strong></span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input required className="h-12" value={form.name} onChange={upd("name")} placeholder="Ahmed Al-Rashidi" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input required className="h-12" type="tel" value={form.phone} onChange={upd("phone")} placeholder="+964 770 000 0000" />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input required className="h-12" value={form.city} onChange={upd("city")} placeholder="Baghdad" />
                    </div>
                    <div className="space-y-2">
                      <Label>District / Area</Label>
                      <Input required className="h-12" value={form.district} onChange={upd("district")} placeholder="Al-Mansour" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Street <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                    <Input className="h-12" value={form.street} onChange={upd("street")} placeholder="Street 14, Building 3" />
                  </div>

                  <div className="space-y-2">
                    <Label>Order Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                    <textarea
                      value={form.note}
                      onChange={upd("note")}
                      placeholder="Any special instructions for your order…"
                      className="w-full border border-input bg-background px-3 py-3 text-sm rounded-md resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Payment */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Payment Method</p>

                    {/* Cash on Delivery */}
                    <button type="button" onClick={() => setPayMethod("cod")}
                      className={`w-full text-left border p-4 flex items-center gap-4 transition-colors ${payMethod === "cod" ? "border-green-500 bg-green-500/5" : "border-border bg-secondary/30 hover:bg-secondary/50"}`}>
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-xl leading-none">
                        💵
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Pay in cash when your order arrives</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${payMethod === "cod" ? "border-green-500 bg-green-500" : "border-muted-foreground/30"}`}>
                        {payMethod === "cod" && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>

                    {/* Online Payment */}
                    <button type="button" onClick={() => setPayMethod("online")}
                      className={`w-full text-left border p-4 flex items-center gap-4 transition-colors ${payMethod === "online" ? "border-primary bg-primary/5" : "border-border bg-secondary/30 hover:bg-secondary/50"}`}>
                      <div className="flex gap-1 flex-wrap w-10 flex-shrink-0 content-start">
                        {PAYMENT_LOGOS.slice(0, 4).map((logo) => (
                          <img key={logo.key} src={logo.src} alt={logo.key} className="w-4 h-4 rounded object-cover" />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">Online Payment</p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {PAYMENT_LOGOS.map((logo) => (
                            <img key={logo.key} src={logo.src} alt={logo.key} className="w-8 h-8 rounded-lg object-cover" />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">Card, wallet & more · secured via Wayl</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${payMethod === "online" ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                        {payMethod === "online" && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </button>
                  </div>

                  {placeError && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-md">
                      {placeError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={placing}
                    className={`w-full h-14 text-base uppercase font-bold tracking-wider gap-2 ${payMethod === "online" ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                  >
                    {placing
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> {payMethod === "online" ? "Processing…" : "Placing Order…"}</>
                      : payMethod === "online"
                      ? <><ChevronRight className="h-4 w-4" /> Pay Now · {fmtIQD(total)}</>
                      : <><Check className="h-4 w-4" /> Place Order · {fmtIQD(total)}</>
                    }
                  </Button>
                </motion.form>
              </AnimatePresence>
            </div>

            <OrderSidebar items={items} subtotal={total} />
          </div>
        )}
      </div>
    </Layout>
  );
}
