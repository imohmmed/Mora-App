import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";

export default function AccountOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "all"],
    queryFn: () => fetchOrders(""),
  });

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

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-secondary animate-pulse" />)}
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
          <div className="py-24 text-center border border-border">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">No orders found.</p>
            <Button asChild>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
