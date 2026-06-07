import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/ui/ProductCard";
import { Layout } from "@/components/layout/Layout";
import { useSearch, useLocation } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Grid, List, SlidersHorizontal, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/hooks/use-cart";

const CATEGORIES = [
  { name: "All", slug: "" },
  { name: "Women", slug: "women" },
  { name: "Men", slug: "men" },
  { name: "Accessories", slug: "accessories" },
  { name: "Beauty", slug: "beauty" },
  { name: "Shoes", slug: "shoes" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const SORT_OPTIONS = [
  { value: "default", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "name-desc", label: "Name: Z–A" },
  { value: "newest", label: "Newest" },
];

const PAGE_SIZE = 12;

export default function Products() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(searchString);
  const category = searchParams.get("category") || "";

  const [sort, setSort] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", { category }],
    queryFn: () => fetchProducts({ category: category || undefined, limit: 50 }),
  });

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedSizes([]);
    setPriceRange([0, 500]);
    setSort("default");
  };

  let products = data?.products ?? [];

  if (selectedSizes.length > 0) {
    products = products.filter((p) =>
      selectedSizes.some((s) => p.tags?.includes(s.toLowerCase()) || true)
    );
  }
  products = products.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

  if (sort === "price-asc") products = [...products].sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") products = [...products].sort((a, b) => b.price - a.price);
  else if (sort === "name-asc") products = [...products].sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "name-desc") products = [...products].sort((a, b) => b.title.localeCompare(a.title));
  else if (sort === "newest") products = [...products].reverse();

  const totalPages = Math.ceil(products.length / PAGE_SIZE);
  const paginated = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = selectedSizes.length > 0 || priceRange[0] > 0 || priceRange[1] < 500;

  const FilterPanel = () => (
    <aside className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-bold uppercase tracking-wider text-sm">Filters</h2>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-primary underline flex items-center gap-1">
            <X className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      <div>
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3">Category</h3>
        <ul className="space-y-1.5">
          {CATEGORIES.map((cat) => (
            <li key={cat.name}>
              <Link
                href={cat.slug ? `/products?category=${cat.slug}` : "/products"}
                className={`text-sm transition-colors ${(category || "") === cat.slug ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`w-10 h-10 border text-xs font-bold transition-colors ${
                selectedSizes.includes(size)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-foreground"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3">Price Range</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-6">${priceRange[0]}</span>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={priceRange[0]}
              onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])}
              className="flex-1 accent-primary"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-6">${priceRange[1]}</span>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], +e.target.value])}
              className="flex-1 accent-primary"
            />
          </div>
          <div className="text-xs text-muted-foreground">${priceRange[0]} – ${priceRange[1]}</div>
        </div>
      </div>
    </aside>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="hidden md:block w-56 flex-shrink-0">
            <FilterPanel />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold uppercase tracking-tighter">
                  {category ? CATEGORIES.find((c) => c.slug === category)?.name || category : "All Products"}
                </h1>
                <span className="text-sm text-muted-foreground">{products.length} items</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden flex items-center gap-2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters {hasActiveFilters && `(${selectedSizes.length + (priceRange[0] > 0 || priceRange[1] < 500 ? 1 : 0)})`}
                </Button>

                <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
                  <SelectTrigger className="w-44 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex border border-border">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                    title="Grid view"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="md:hidden mb-6 p-4 border border-border bg-secondary/30">
                <FilterPanel />
              </div>
            )}

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSizes.map((size) => (
                  <button key={size} onClick={() => toggleSize(size)}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    {size} <X className="h-3 w-3" />
                  </button>
                ))}
                {(priceRange[0] > 0 || priceRange[1] < 500) && (
                  <button onClick={() => setPriceRange([0, 500])}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    ${priceRange[0]}–${priceRange[1]} <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {isLoading ? (
              <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 gap-6" : "space-y-4"}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={viewMode === "grid" ? "aspect-[3/4] bg-secondary animate-pulse" : "h-28 bg-secondary animate-pulse"} />
                ))}
              </div>
            ) : error ? (
              <div className="py-12 text-center text-destructive">Failed to load products.</div>
            ) : paginated.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground">
                <p className="mb-4">No products match your filters.</p>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {paginated.map((product) => (
                  <ProductCard key={product.id} product={product} showQuickAdd />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {paginated.map((product) => (
                  <Link key={product.id} href={`/products/${product.id}`} className="flex gap-6 border border-border p-4 hover:shadow-sm transition-shadow group">
                    <div className="w-24 aspect-[3/4] flex-shrink-0 overflow-hidden bg-secondary">
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{product.category}</div>
                      <h3 className="font-bold text-lg mb-2">{product.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">${product.price.toFixed(2)}</span>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <span className="text-muted-foreground line-through text-sm">${product.comparePrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 text-sm font-bold border transition-colors ${
                      p === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
