import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchProducts } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { useSearch, useLocation } from "wouter";
import { ProductCard } from "@/components/ui/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, X } from "lucide-react";
import { Link } from "wouter";
import { FilterPanel, Filters } from "@/pages/products";

const DEFAULT_FILTERS: Filters = { sizes: [], colors: [], brands: [], priceMin: 0, priceMax: 500 };

function applyFilters(products: any[], filters: Filters): any[] {
  return products.filter((p) => {
    if (p.price < filters.priceMin || p.price > filters.priceMax) return false;
    if (filters.sizes.length > 0) {
      const variantSizes = p.variants?.map((v: any) => v.option1?.toUpperCase()).filter(Boolean) ?? [];
      if (!filters.sizes.some((s) => variantSizes.includes(s))) return false;
    }
    if (filters.colors.length > 0) {
      const variantColors = p.variants?.map((v: any) => v.option2?.toLowerCase()).filter(Boolean) ?? [];
      const tags = (p.tags ?? []).map((t: string) => t.toLowerCase());
      if (!filters.colors.some((c) => variantColors.some((vc: string) => vc.includes(c.toLowerCase())) || tags.some((t: string) => t.includes(c.toLowerCase())))) return false;
    }
    if (filters.brands.length > 0) {
      if (!filters.brands.includes(p.vendor ?? "")) return false;
    }
    return true;
  });
}

export default function Search() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const q = searchParams.get("q") || "";

  const [, setLocation] = useLocation();
  const [localQuery, setLocalQuery] = useState(q);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchProducts(q),
    enabled: q.length > 0,
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ["search-suggest", localQuery],
    queryFn: () => searchProducts(localQuery),
    enabled: localQuery.length >= 2 && localQuery !== q,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setShowSuggestions(false);
      setLocation(`/search?q=${encodeURIComponent(localQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (title: string) => {
    setLocalQuery(title);
    setShowSuggestions(false);
    setLocation(`/search?q=${encodeURIComponent(title)}`);
  };

  const suggestions = suggestionsData?.products?.slice(0, 5) ?? [];
  const allResults = data?.products ?? [];
  const filteredResults = applyFilters(allResults, filters);
  const hasActiveFilters = filters.sizes.length > 0 || filters.colors.length > 0 || filters.brands.length > 0 || filters.priceMin > 0 || filters.priceMax < 500;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Search bar */}
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter uppercase mb-6">Search</h1>
          <div className="relative">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={localQuery}
                  onChange={(e) => {
                    setLocalQuery(e.target.value);
                    setShowSuggestions(e.target.value.length >= 2);
                  }}
                  onFocus={() => { if (localQuery.length >= 2) setShowSuggestions(true); }}
                  placeholder="Search products..."
                  className="h-12 text-base pr-10"
                  autoFocus
                />
                {localQuery && (
                  <button type="button" onClick={() => { setLocalQuery(""); setShowSuggestions(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" className="h-12 px-8">
                <SearchIcon className="h-5 w-5" />
              </Button>
            </form>

            {/* Typeahead suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-background border border-border shadow-xl z-50 text-left">
                {suggestions.map((product) => (
                  <button key={product.id} type="button" onClick={() => handleSuggestionClick(product.title)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-sm">
                    <img src={product.images[0]} alt={product.title} className="w-10 h-10 object-cover flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{product.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{product.category}</div>
                    </div>
                    <div className="font-bold text-sm">${product.price.toFixed(2)}</div>
                  </button>
                ))}
                <div className="border-t border-border p-2">
                  <button type="button" onClick={handleSearch}
                    className="w-full text-center text-sm text-primary py-1 hover:underline font-medium">
                    See all results for "{localQuery}"
                  </button>
                </div>
              </div>
            )}
          </div>

          {!q && (
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {["Blazer", "Dress", "Accessories", "Beauty", "Shoes"].map((term) => (
                <button key={term} onClick={() => { setLocalQuery(term); setLocation(`/search?q=${encodeURIComponent(term)}`); }}
                  className="px-4 py-1.5 border border-border text-sm hover:bg-secondary transition-colors rounded-full">
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results with filter panel */}
        {q && (
          <div className="flex flex-col md:flex-row gap-8">
            {/* Filter sidebar on results */}
            <div className="hidden md:block w-56 flex-shrink-0">
              <FilterPanel
                filters={filters as any}
                setFilters={setFilters as any}
                category=""
                onClear={() => setFilters(DEFAULT_FILTERS)}
              />
            </div>

            <div className="flex-1">
              <h2 className="text-xl mb-6 font-bold">
                {isLoading ? "Searching…" : (
                  <>
                    <span className="text-muted-foreground font-normal">{filteredResults.length} results for </span>
                    <span className="text-primary">"{q}"</span>
                    {hasActiveFilters && <span className="text-sm font-normal text-muted-foreground"> (filtered from {allResults.length})</span>}
                  </>
                )}
              </h2>

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[1,2,3,4,5,6].map((i) => <div key={i} className="aspect-[3/4] bg-secondary animate-pulse" />)}
                </div>
              ) : filteredResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {filteredResults.map((product) => (
                    <ProductCard key={product.id} product={product} showQuickAdd />
                  ))}
                </div>
              ) : allResults.length > 0 ? (
                <div className="py-16 text-center text-muted-foreground border border-border">
                  <p className="mb-4">No results match your filters.</p>
                  <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear Filters</Button>
                </div>
              ) : (
                <div className="py-24 text-center text-muted-foreground">
                  <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No results found</p>
                  <p className="text-sm mb-6">Try different keywords or browse our categories.</p>
                  <Button asChild variant="outline"><Link href="/products">Browse All Products</Link></Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
