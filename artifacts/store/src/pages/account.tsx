import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Account() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["orders", submittedEmail],
    queryFn: () => fetchOrders(submittedEmail),
    enabled: !!submittedEmail,
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmittedEmail(email.trim());
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tighter uppercase mb-8">My Account</h1>

        {!submittedEmail ? (
          <div className="max-w-md mx-auto bg-secondary p-8 mt-16">
            <h2 className="text-xl font-bold tracking-tighter uppercase mb-4 text-center">Look up Orders</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Enter the email address used during checkout to view your order history.
            </p>
            <form onSubmit={handleLookup} className="space-y-4">
              <Input 
                type="email" 
                placeholder="Email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
              <Button type="submit" className="w-full h-12 uppercase font-bold tracking-wider">
                Find Orders
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-secondary p-4">
              <div>
                <span className="text-sm text-muted-foreground mr-2">Showing orders for:</span>
                <span className="font-bold">{submittedEmail}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSubmittedEmail("")}>
                Change Email
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-secondary animate-pulse" />)}
              </div>
            ) : data?.orders && data.orders.length > 0 ? (
              <div className="border border-border">
                <div className="hidden md:grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 p-4 border-b border-border bg-secondary/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <div>Order</div>
                  <div>Date</div>
                  <div>Status</div>
                  <div className="text-right">Total</div>
                </div>
                
                <div className="divide-y divide-border">
                  {data.orders.map((order) => (
                    <Link 
                      key={order.id} 
                      href={`/account/orders/${order.id}`}
                      className="block hover:bg-secondary/30 transition-colors"
                    >
                      <div className="p-4 flex flex-col md:grid md:grid-cols-[1fr_2fr_1fr_1fr] gap-4 items-center">
                        <div className="font-bold text-primary">#{order.id.slice(0,8)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="font-bold md:text-right w-full md:w-auto">
                          ${order.total.toFixed(2)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border border-border">
                <p className="text-muted-foreground mb-4">No orders found for this email.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
