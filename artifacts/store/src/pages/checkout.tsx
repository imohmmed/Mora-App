import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import { useStoreAuth } from "@/hooks/use-store-auth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check, ArrowLeft, Truck, MapPin, Phone, Package,
  DollarSign, ChevronRight, Loader2, Eye, EyeOff,
  CreditCard, Zap, RefreshCw
} from "lucide-react";

const BASE = "/api";

function fmtIQD(n: number) {
  return n.toLocaleString("en-US") + " IQD";
}

const STEPS = ["Information", "Payment", "Complete"];

type PayMethod = "cod" | "wayl";
type FormState = { name: string; phone: string; city: string; district: string; street: string; note: string };
type OrderSnap = { items: ReturnType<typeof useCart>["items"]; subtotal: number; orderNumber: string; form: FormState; payMethod: PayMethod };

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                ${done || active ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground bg-background"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-widest hidden sm:block transition-colors
                ${active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 transition-all duration-500 ${step < current ? "bg-primary" : "bg-border"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LoginGate({ onLogin }: { onLogin: (email: string, password: string) => Promise<unknown> }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try { await onLogin(email, password); } catch (err: any) { setError(err.message || "Invalid credentials"); }
    finally { setLoading(false); }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
      <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6 mx-auto">
        <Package className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-2xl font-bold tracking-tighter uppercase text-center mb-2">Sign In to Checkout</h2>
      <p className="text-muted-foreground text-center text-sm mb-8">
        Don't have an account?{" "}<Link href="/account" className="text-primary underline">Create one</Link>
      </p>
      {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded mb-4">{error}</div>}
      <form onSubmit={handle} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lg-email">Email</Label>
          <Input id="lg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lg-pw">Password</Label>
          <div className="relative">
            <Input id="lg-pw" type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-12 text-sm uppercase font-bold tracking-wider" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{loading ? "Signing in..." : "Sign In & Continue"}
        </Button>
      </form>
    </motion.div>
  );
}

function OrderSidebar({ items, subtotal }: { items: ReturnType<typeof useCart>["items"]; subtotal: number }) {
  return (
    <div className="lg:w-2/5">
      <div className="bg-secondary/50 border border-border p-6 sticky top-24">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Order Summary</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
          {items.map((item) => (
            <div key={item.variantId} className="flex gap-3 items-center">
              <div className="w-12 h-14 bg-background border border-border relative flex-shrink-0 overflow-hidden">
                {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>}
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.quantity}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                {(item.option1 || item.option2) && <p className="text-xs text-muted-foreground">{item.option1}{item.option2 ? ` / ${item.option2}` : ""}</p>}
              </div>
              <span className="text-sm font-bold flex-shrink-0">{fmtIQD(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{fmtIQD(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-green-600 font-medium">Free</span></div>
          <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2"><span>Total</span><span>{fmtIQD(subtotal)}</span></div>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user, token, isLoading, login } = useStoreAuth();

  const [step, setStep]         = useState<1 | 2 | 3>(1);
  const [payMethod, setPayMethod] = useState<PayMethod>("cod");
  const [placing, setPlacing]   = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [payVerified, setPayVerified] = useState<boolean | null>(null);
  const orderRef = useRef<OrderSnap | null>(null);

  const [form, setForm] = useState<FormState>({ name: "", phone: "", city: "", district: "", street: "", note: "" });

  // Handle return from Wayl payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const waylReturn = params.get("wayl_return");
    if (waylReturn === "1") {
      const stored = localStorage.getItem("mora_wayl_pending");
      if (stored) {
        try {
          const snap = JSON.parse(stored) as OrderSnap;
          orderRef.current = snap;
          clearCart();
          setStep(3);
          localStorage.removeItem("mora_wayl_pending");
          // Clean up URL
          window.history.replaceState({}, "", window.location.pathname);
        } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name:     `${user.firstName} ${user.lastName}`.trim(),
        phone:    user.phone || f.phone,
        city:     user.address?.["city"] || f.city,
        district: user.address?.["district"] || f.district,
        street:   user.address?.["street"] || f.street,
      }));
    }
  }, [user]);

  const upd = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault(); setStep(2); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const verifyWaylPayment = async (referenceId: string) => {
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/store/wayl/status/${referenceId}`);
      const json = await res.json() as { data: { paid: boolean; status: string } };
      setPayVerified(json.data?.paid === true);
    } catch { setPayVerified(false); }
    setVerifying(false);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setPlacing(true); setPlaceError("");
    try {
      const orderRes = await fetch(`${BASE}/store/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          email: user?.email || "",
          subtotal: total, shipping: 0,
          shippingAddress: { fullName: form.name, phone: form.phone, city: form.city, district: form.district, street: form.street },
          lineItems: items.map((i) => ({ variantId: i.variantId, title: i.title, quantity: i.quantity, price: i.price, option1: i.option1, option2: i.option2, image: i.image })),
          paymentMethod: payMethod, note: form.note,
        }),
      });
      const orderJson = await orderRes.json() as { data: { order_number?: string; total?: number } | null; error?: string };
      if (!orderRes.ok) throw new Error(orderJson.error || "Order failed");

      const orderNumber = orderJson.data?.order_number || "#—";
      const snap: OrderSnap = { items: [...items], subtotal: total, orderNumber, form: { ...form }, payMethod };
      orderRef.current = snap;

      if (payMethod === "wayl") {
        localStorage.setItem("mora_wayl_pending", JSON.stringify(snap));
        const redirectionUrl = `${window.location.origin}${window.location.pathname}?wayl_return=1`;

        const waylRes = await fetch(`${BASE}/store/wayl/create-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, total, redirectionUrl }),
        });
        const waylJson = await waylRes.json() as { data: { url?: string } | null; error?: string };
        if (!waylRes.ok || !waylJson.data?.url) throw new Error(waylJson.error || "Could not create payment link");

        window.location.href = waylJson.data.url;
        return;
      }

      clearCart();
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setPlaceError(err.message || "Something went wrong");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0 && step < 3) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-8">
            <Package className="h-9 w-9 text-muted-foreground" />
          </div>
          <p className="text-xl font-bold mb-2">Your cart is empty</p>
          <p className="text-muted-foreground mb-8">Add items before checking out.</p>
          <Button asChild className="h-12 px-10 uppercase font-bold tracking-wider"><Link href="/products">Shop Now</Link></Button>
        </div>
      </Layout>
    );
  }

  if (step === 3) {
    const snap = orderRef.current!;
    const isWayl = snap?.payMethod === "wayl";
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <StepIndicator current={3} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-10">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25">
              <Check className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter uppercase mb-2">Order Placed!</h1>
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-3">
              <span className="text-sm font-bold text-primary">{snap?.orderNumber}</span>
            </div>
            <p className="text-muted-foreground">
              Thank you{snap?.form.name ? `, ${snap.form.name.split(" ")[0]}` : ""}! We'll prepare your order right away.
            </p>
          </motion.div>

          {/* Wayl payment status */}
          {isWayl && (
            <div className="border border-border p-4 mb-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Online Payment Status
                </span>
                {payVerified === true && <span className="text-green-600 font-bold flex items-center gap-1"><Check className="h-4 w-4" />Confirmed</span>}
                {payVerified === false && <span className="text-destructive font-bold">Not yet confirmed</span>}
              </div>
              <button
                onClick={() => verifyWaylPayment(snap.orderNumber)}
                disabled={verifying || payVerified === true}
                className="flex items-center gap-2 text-primary hover:underline disabled:opacity-50 font-medium"
              >
                {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {verifying ? "Checking…" : payVerified === true ? "Payment Confirmed" : "Verify Payment"}
              </button>
            </div>
          )}

          <div className="bg-secondary/50 border border-border p-6 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Order Items</p>
            <div className="space-y-3 mb-4">
              {snap?.items.map((item) => (
                <div key={item.variantId} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{item.title} <span className="text-muted-foreground font-normal">×{item.quantity}</span></span>
                  <span className="font-bold">{fmtIQD(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="text-green-600 font-medium">Free</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{fmtIQD(snap?.subtotal || 0)}</span></div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-8">
            <div className="bg-secondary/50 border border-border p-4 flex gap-3">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Delivery</p>
                <p className="text-sm font-medium">{[snap?.form.district, snap?.form.city].filter(Boolean).join(", ") || "—"}</p></div>
            </div>
            <div className="bg-secondary/50 border border-border p-4 flex gap-3">
              <Phone className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Phone</p>
                <p className="text-sm font-medium">{snap?.form.phone || "—"}</p></div>
            </div>
            <div className="bg-secondary/50 border border-border p-4 flex gap-3">
              {isWayl ? <CreditCard className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /> : <DollarSign className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
              <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Payment</p>
                <p className="text-sm font-medium">{isWayl ? "Online · Wayl" : "Cash on Delivery"}</p></div>
            </div>
          </div>
          <Button asChild className="w-full h-12 uppercase font-bold tracking-wider"><Link href="/products">Continue Shopping</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <StepIndicator current={step} />
        {isLoading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !user ? (
          <LoginGate onLogin={login} />
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="lg:w-3/5">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.form key="step1" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.25 }} onSubmit={handleStep1} className="space-y-5">
                    <h2 className="text-xl font-bold tracking-tighter uppercase">Delivery Information</h2>
                    {user && (
                      <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 px-4 py-3 text-sm rounded">
                        <Check className="h-4 w-4 text-primary" /><span>Signed in as <strong>{user.email}</strong></span>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Full Name</Label><Input required className="h-12" value={form.name} onChange={upd("name")} placeholder="Ahmed Al-Rashidi" /></div>
                      <div className="space-y-2"><Label>Phone Number</Label><Input required className="h-12" type="tel" value={form.phone} onChange={upd("phone")} placeholder="+964 770 000 0000" /></div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>City</Label><Input required className="h-12" value={form.city} onChange={upd("city")} placeholder="Baghdad" /></div>
                      <div className="space-y-2"><Label>District / Area</Label><Input required className="h-12" value={form.district} onChange={upd("district")} placeholder="Al-Mansour" /></div>
                    </div>
                    <div className="space-y-2"><Label>Street <span className="text-muted-foreground font-normal">(optional)</span></Label><Input className="h-12" value={form.street} onChange={upd("street")} placeholder="Street 14, Building 3" /></div>
                    <div className="space-y-2">
                      <Label>Order Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <textarea value={form.note} onChange={upd("note") as any} placeholder="Any special instructions..." className="w-full border border-input bg-background px-3 py-3 text-sm rounded-md resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <Button type="submit" className="w-full h-14 text-base uppercase font-bold tracking-wider">
                      Continue to Payment <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </motion.form>
                )}

                {step === 2 && (
                  <motion.form key="step2" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.25 }} onSubmit={handlePlaceOrder} className="space-y-6">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
                      <h2 className="text-xl font-bold tracking-tighter uppercase">Payment Method</h2>
                    </div>

                    <div className="border border-border p-3 text-sm text-muted-foreground bg-secondary/30">
                      <span className="font-semibold text-foreground">{form.name}</span> · {[form.district, form.city].filter(Boolean).join(", ")}
                      <button type="button" onClick={() => setStep(1)} className="text-primary ml-2 underline text-xs">Edit</button>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Payment Method</p>

                      {/* Cash on Delivery */}
                      <label className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-all ${payMethod === "cod" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}
                        onClick={() => setPayMethod("cod")}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${payMethod === "cod" ? "bg-primary/15" : "bg-secondary"}`}>
                          <Truck className={`h-5 w-5 ${payMethod === "cod" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">Cash on Delivery</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Pay when your order arrives at your door</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${payMethod === "cod" ? "border-primary bg-primary" : "border-border"}`}>
                          {payMethod === "cod" && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </label>

                      {/* Online Payment (Wayl) */}
                      <label className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-all ${payMethod === "wayl" ? "border-blue-500 bg-blue-500/5" : "border-border hover:border-border/80"}`}
                        onClick={() => setPayMethod("wayl")}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${payMethod === "wayl" ? "bg-blue-500/15" : "bg-secondary"}`}>
                          <CreditCard className={`h-5 w-5 ${payMethod === "wayl" ? "text-blue-500" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-sm">Online Payment</p>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-500 px-1.5 py-0.5 rounded">Powered by Wayl</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Zain Cash · FastPay · Asia Hawala · Visa · Mastercard</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${payMethod === "wayl" ? "border-blue-500 bg-blue-500" : "border-border"}`}>
                          {payMethod === "wayl" && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </label>
                    </div>

                    {payMethod === "cod" && (
                      <div className="bg-secondary/50 border border-border p-4 text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" /> Total: <span className="text-primary font-bold">{fmtIQD(total)}</span>
                        </p>
                        <p>The delivery team will collect payment upon arrival.</p>
                      </div>
                    )}
                    {payMethod === "wayl" && (
                      <div className="bg-blue-500/5 border border-blue-500/20 p-4 text-sm">
                        <p className="font-semibold mb-1 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-500" /> <span>Total: <span className="text-blue-600 font-bold">{fmtIQD(total)}</span></span>
                        </p>
                        <p className="text-muted-foreground">You'll be redirected to Wayl's secure payment page to complete your payment.</p>
                      </div>
                    )}

                    {placeError && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3">{placeError}</div>}

                    <Button type="submit" className={`w-full h-14 text-base uppercase font-bold tracking-wider ${payMethod === "wayl" ? "bg-blue-500 hover:bg-blue-600" : ""}`} disabled={placing}>
                      {placing
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{payMethod === "wayl" ? "Creating Payment Link..." : "Placing Order..."}</>
                        : payMethod === "wayl"
                        ? <><CreditCard className="h-4 w-4 mr-2" />Pay Online · {fmtIQD(total)}</>
                        : `Place Order · ${fmtIQD(total)}`
                      }
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
            <OrderSidebar items={items} subtotal={total} />
          </div>
        )}
      </div>
    </Layout>
  );
}
