import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, ArrowLeft, Mail } from "lucide-react";

export default function AccountOrders() {
  const [emailInput, setEmailInput] = useState("");
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", lookupEmail],
    queryFn: () => fetchOrders(lookupEmail!),
    enabled: !!lookupEmail,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (trimmed) setLookupEmail(trimmed);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tighter uppercase">Order History</h1>
          </div>
        </div>

        {/* Email lookup form — always visible, scopes all queries to that address */}
        <div className="bg-secondary/40 border border-border p-6 mb-8">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="order-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Enter the email address used when placing your order
              </Label>
              <Input
                id="order-email"
                type="email"
                required
                className="h-11"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 px-6 uppercase font-bold tracking-wider sm:self-end">
              Look Up Orders
            </Button>
          </form>
        </div>

        {/* Results — only shown after a lookup email is submitted */}
        {!lookupEmail ? (
          <div className="py-16 text-center text-muted-foreground">
            Enter your email above to view your order history.
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-secondary animate-pulse" />)}
          </div>
        ) : data?.orders && data.orders.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing orders for <span className="font-medium text-foreground">{lookupEmail}</span>
            </p>
            <div className="border border-border divide-y divide-border">
              {data.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}?email=${encodeURIComponent(lookupEmail)}`}
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
                    <span className="font-bold text-sm">{Math.round(order.total).toLocaleString("en-US")} IQD</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="py-24 text-center border border-border">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No orders found for <span className="font-medium text-foreground">{lookupEmail}</span></p>
            <p className="text-sm text-muted-foreground mb-6">Check that the email address matches the one used at checkout.</p>
            <Button asChild>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
