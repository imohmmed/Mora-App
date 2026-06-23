import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCollection, fetchProducts } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { ProductCard } from "@/components/ui/ProductCard";
import { Button } from "@/components/ui/button";

export default function CollectionDetail() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => fetchCollection(id),
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "all-collection"],
    queryFn: () => fetchProducts({ limit: 50 }),
    enabled: !!data?.collection,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[40vh] bg-secondary animate-pulse w-full mb-12" />
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />
          ))}
        </div>
      </Layout>
    );
  }

  if (error || !data?.collection) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Collection Not Found</h1>
          <Button asChild><Link href="/collections">All Collections</Link></Button>
        </div>
      </Layout>
    );
  }

  const { collection } = data;
  const products = productsData?.products ?? [];
  const displayCount = collection.productsCount ?? products.length;
  const displayProducts = products.slice(0, displayCount);

  return (
    <Layout>
      <div className="relative h-[40vh] w-full flex items-center justify-center bg-secondary mb-16 overflow-hidden">
        {collection.image && (
          <img src={collection.image} alt={collection.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-white text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-4">{collection.title}</h1>
          <p className="text-lg max-w-2xl mx-auto">{collection.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 mb-24">
        <div className="mb-8 text-sm text-muted-foreground">
          {displayProducts.length} Products
        </div>

        {isLoadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} showQuickAdd />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-muted-foreground">
            No products in this collection.
          </div>
        )}
      </div>
    </Layout>
  );
}
