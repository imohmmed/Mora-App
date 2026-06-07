import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrder } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function OrderDetail() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-4xl animate-pulse">
          <div className="h-8 w-1/3 bg-secondary mb-12" />
          <div className="h-48 bg-secondary mb-8" />
          <div className="h-64 bg-secondary" />
        </div>
      </Layout>
    );
  }

  if (error || !data?.order || !data.order) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <Button asChild><Link href="/account">Back to Account</Link></Button>
        </div>
      </Layout>
    );
  }

  const { order } = data;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Link href="/account" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-8 border-b border-border gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter uppercase mb-2">Order #{order.id.slice(0,8)}</h1>
            <p className="text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit'
              })}
            </p>
          </div>
          <div>
            <span className={`inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              order.status === 'completed' ? 'bg-green-100 text-green-800' :
              order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {order.status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-[2fr_1fr] gap-12">
          <div>
            <h2 className="text-xl font-bold tracking-tighter uppercase mb-6">Items</h2>
            <div className="space-y-6">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center border-b border-border pb-6">
                  <div className="w-20 aspect-[3/4] bg-secondary flex-shrink-0" />
                  <div className="flex-1">
                    <Link href={`/products/${item.productId}`} className="font-bold hover:text-primary transition-colors line-clamp-1 text-sm">
                      {item.title}
                    </Link>
                    <div className="text-sm text-muted-foreground mt-1">
                      Qty: {item.quantity}
                    </div>
                  </div>
                  <div className="font-bold text-sm">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <div className="bg-secondary p-8 sticky top-24">
              <h2 className="text-xl font-bold tracking-tighter uppercase mb-6">Summary</h2>
              
              <div className="space-y-4 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
              </div>

              <div className="border-t border-border pt-6 text-sm">
                <div className="flex justify-between text-lg font-bold mb-6">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
                
                <h3 className="font-bold uppercase tracking-wider mb-2">Customer</h3>
                <p className="text-muted-foreground mb-4">
                  {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}<br/>
                  {order.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
