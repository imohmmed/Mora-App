import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchProducts } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { useSearch, useLocation } from "wouter";
import { ProductCard } from "@/components/ui/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon } from "lucide-react";

export default function Search() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const q = searchParams.get("q") || "";
  
  const [, setLocation] = useLocation();
  const [localQuery, setLocalQuery] = useState(q);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchProducts(q),
    enabled: q.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(localQuery.trim())}`);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h1 className="text-3xl font-bold tracking-tighter uppercase mb-8">Search</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input 
              value={localQuery} 
              onChange={(e) => setLocalQuery(e.target.value)} 
              placeholder="Search products..." 
              className="h-12 text-lg"
              autoFocus
            />
            <Button type="submit" className="h-12 px-8">
              <SearchIcon className="h-5 w-5" />
            </Button>
          </form>
        </div>

        {q && (
          <div>
            <h2 className="text-xl mb-8">
              Results for "<span className="font-bold">{q}</span>"
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />
                ))}
              </div>
            ) : data?.products && data.products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center text-muted-foreground">
                <p>No results found. Try a different term.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
