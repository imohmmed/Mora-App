import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Package, Heart } from "lucide-react";

type Tab = "orders" | "login" | "register";

export default function Account() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ firstName: "", lastName: "", email: "", password: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["orders", submittedEmail],
    queryFn: () => fetchOrders(submittedEmail),
    enabled: !!submittedEmail,
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setSubmittedEmail(loginForm.email);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setSubmittedEmail(registerForm.email);
  };

  const handleEmailLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedEmail(email);
  };

  if (isLoggedIn) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter">{registerForm.firstName || "My Account"}</h1>
              <p className="text-sm text-muted-foreground">{loginForm.email || registerForm.email}</p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setIsLoggedIn(false); setSubmittedEmail(""); }}>
              Sign out
            </Button>
          </div>

          <div className="flex gap-6 mb-8 border-b border-border">
            <button
              className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${tab !== "register" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setTab("orders")}
            >
              <Package className="h-4 w-4 inline mr-2" />Orders
            </button>
            <Link href="/wishlist" className="pb-3 text-sm font-bold uppercase tracking-wider border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors">
              <Heart className="h-4 w-4 inline mr-2" />Wishlist
            </Link>
            <Link href="/account/profile" className="pb-3 text-sm font-bold uppercase tracking-wider border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors">
              <User className="h-4 w-4 inline mr-2" />Profile Settings
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-secondary animate-pulse" />)}
            </div>
          ) : data?.orders && data.orders.length > 0 ? (
            <div className="border border-border divide-y divide-border">
              {data.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-secondary/30 transition-colors gap-4"
                >
                  <div className="flex gap-6 items-center">
                    <div>
                      <div className="font-bold text-primary text-sm">{order.orderNumber || "#" + order.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`text-xs font-bold uppercase px-2.5 py-1 ${
                      order.status === "completed" ? "bg-green-100 text-green-800" :
                      order.status === "processing" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {order.status}
                    </span>
                    <span className="font-bold text-sm">${order.total.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border border-border">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No orders yet.</p>
              <Button asChild variant="outline">
                <Link href="/products">Start Shopping</Link>
              </Button>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="flex border-b border-border mb-8">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === "login" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === "register" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Create Account
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === "orders" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Track Order
          </button>
        </div>

        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-xl font-bold tracking-tighter mb-6">Welcome back</h2>
            <div className="space-y-2">
              <Label htmlFor="loginEmail">Email</Label>
              <Input id="loginEmail" type="email" required placeholder="your@email.com" className="h-12"
                value={loginForm.email} onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginPassword">Password</Label>
              <Input id="loginPassword" type="password" required placeholder="••••••••" className="h-12"
                value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <button type="button" className="text-xs text-primary underline">Forgot password?</button>
            </div>
            <Button type="submit" className="w-full h-12 uppercase font-bold tracking-wider">Sign In</Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button type="button" onClick={() => setTab("register")} className="text-primary underline">Create one</button>
            </p>
          </form>
        )}

        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <h2 className="text-xl font-bold tracking-tighter mb-6">Create your account</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regFirstName">First Name</Label>
                <Input id="regFirstName" required className="h-12"
                  value={registerForm.firstName} onChange={(e) => setRegisterForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regLastName">Last Name</Label>
                <Input id="regLastName" required className="h-12"
                  value={registerForm.lastName} onChange={(e) => setRegisterForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="regEmail">Email</Label>
              <Input id="regEmail" type="email" required placeholder="your@email.com" className="h-12"
                value={registerForm.email} onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPassword">Password</Label>
              <Input id="regPassword" type="password" required placeholder="At least 8 characters" className="h-12"
                value={registerForm.password} onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full h-12 uppercase font-bold tracking-wider">Create Account</Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={() => setTab("login")} className="text-primary underline">Sign in</button>
            </p>
          </form>
        )}

        {tab === "orders" && (
          <div>
            <h2 className="text-xl font-bold tracking-tighter mb-6">Track Your Orders</h2>
            {!submittedEmail ? (
              <form onSubmit={handleEmailLookup} className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter the email address used during checkout to view your order history.</p>
                <div className="space-y-2">
                  <Label htmlFor="trackEmail">Email address</Label>
                  <Input id="trackEmail" type="email" required placeholder="your@email.com" className="h-12"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full h-12 uppercase font-bold tracking-wider">Find Orders</Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Showing orders for: <strong>{submittedEmail}</strong></span>
                  <Button variant="ghost" size="sm" onClick={() => setSubmittedEmail("")}>Change</Button>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => <div key={i} className="h-16 bg-secondary animate-pulse" />)}
                  </div>
                ) : data?.orders && data.orders.length > 0 ? (
                  <div className="divide-y divide-border border border-border">
                    {data.orders.map((order) => (
                      <Link key={order.id} href={`/account/orders/${order.id}`}
                        className="flex justify-between items-center p-4 hover:bg-secondary/30 transition-colors">
                        <div>
                          <div className="font-bold text-primary text-sm">{order.orderNumber || "#" + order.id.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold uppercase">{order.status}</span>
                          <span className="font-bold text-sm">${order.total.toFixed(2)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground border border-border">No orders found for this email.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
