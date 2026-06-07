import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/ui/ProductCard";
import { Layout } from "@/components/layout/Layout";
import { useSearch } from "wouter";
import { Link } from "wouter";

export default function Products() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const category = searchParams.get("category") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", { category }],
    queryFn: () => fetchProducts({ category, limit: 50 }),
  });

  const categories = [
    { name: "All", slug: "" },
    { name: "Women", slug: "women" },
    { name: "Men", slug: "men" },
    { name: "Accessories", slug: "accessories" },
    { name: "Beauty", slug: "beauty" },
    { name: "Shoes", slug: "shoes" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 flex-shrink-0">
            <h2 className="font-bold uppercase tracking-wider mb-4">Categories</h2>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.name}>
                  <Link
                    href={cat.slug ? `/products?category=${cat.slug}` : "/products"}
                    className={`text-sm hover:text-primary transition-colors ${
                      (category || "") === cat.slug ? "font-bold text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-bold uppercase tracking-tighter">
                {category ? category.replace("-", " ") : "All Products"}
              </h1>
              <span className="text-sm text-muted-foreground">
                {data?.products.length || 0} Products
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-destructive py-12 text-center">Failed to load products.</div>
            ) : data?.products.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground">
                No products found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {data?.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
