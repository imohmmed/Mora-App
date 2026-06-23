import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { useWishlist } from "@/hooks/use-wishlist";
import { Layout } from "@/components/layout/Layout";
import { ProductCard } from "@/components/ui/ProductCard";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export default function Wishlist() {
  const { items } = useWishlist();

  const { data, isLoading } = useQuery({
    queryKey: ["products", "all-wishlist"],
    queryFn: () => fetchProducts({ limit: 50 }),
    enabled: items.length > 0,
  });

  const wishlisted = data?.products.filter((p) => items.includes(p.id)) ?? [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="flex items-center gap-3 mb-12">
          <Heart className="h-6 w-6 text-primary fill-primary" />
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Wishlist</h1>
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">({items.length} items)</span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-8">
              Save items you love by clicking the heart icon on any product.
            </p>
            <Button asChild className="h-12 px-8 uppercase font-bold tracking-wider">
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((id) => (
              <div key={id} className="aspect-[3/4] bg-secondary animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlisted.map((product) => (
              <ProductCard key={product.id} product={product} showQuickAdd />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
