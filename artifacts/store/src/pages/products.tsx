import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, getShippingRules } from "@/lib/api";
import { ProductCard } from "@/components/ui/ProductCard";
import { Layout } from "@/components/layout/Layout";
import { useSearch, useLocation } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Grid, List, SlidersHorizontal, X, ChevronDown, Truck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product } from "@/lib/types";

const CATEGORIES = [
  { name: "All", slug: "" },
  { name: "Women", slug: "women" },
  { name: "Men", slug: "men" },
  { name: "Accessories", slug: "accessories" },
  { name: "Beauty", slug: "beauty" },
  { name: "Shoes", slug: "shoes" },
  { name: "New In", slug: "new" },
  { name: "Sale", slug: "sale" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy", hex: "#1B3A6B" },
  { name: "Camel", hex: "#C19A6B" },
  { name: "Grey", hex: "#9B9B9B" },
  { name: "Red", hex: "#C0392B" },
  { name: "Green", hex: "#2E7D32" },
  { name: "Blue", hex: "#0274C1" },
];

const BRANDS = ["Mora Studio", "Mora Essentials", "Mora Active", "Mora Beauty"];

const SORT_OPTIONS = [
  { value: "default", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "name-desc", label: "Name: Z–A" },
  { value: "newest", label: "Newest" },
];

const PAGE_SIZE = 12;

export type Filters = {
  sizes: string[];
  colors: string[];
  brands: string[];
  priceMin: number;
  priceMax: number;
};

const MAX_PRICE = 500000;

const DEFAULT_FILTERS: Filters = {
  sizes: [],
  colors: [],
  brands: [],
  priceMin: 0,
  priceMax: MAX_PRICE,
};

function applyFilters(products: Product[], filters: Filters): Product[] {
  return products.filter((p) => {
    if (p.price < filters.priceMin || p.price > filters.priceMax) return false;

    if (filters.sizes.length > 0) {
      const variantSizes = p.variants.map((v) => v.option1?.toUpperCase()).filter(Boolean);
      if (!filters.sizes.some((s) => variantSizes.includes(s))) return false;
    }

    if (filters.colors.length > 0) {
      const variantColors = p.variants.map((v) => v.option2?.toLowerCase()).filter(Boolean);
      const productTags = (p.tags ?? []).map((t) => t.toLowerCase());
      const hasColor = filters.colors.some(
        (c) =>
          variantColors.some((vc) => vc?.includes(c.toLowerCase())) ||
          productTags.some((t) => t.includes(c.toLowerCase()))
      );
      if (!hasColor) return false;
    }

    if (filters.brands.length > 0) {
      if (!filters.brands.includes(p.vendor ?? "")) return false;
    }

    return true;
  });
}

export function FilterPanel({
  filters,
  setFilters,
  category,
  onClear,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  category: string;
  onClear: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    size: true,
    color: false,
    brand: false,
    price: true,
  });

  const toggleSection = (key: string) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const hasActive =
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.brands.length > 0 ||
    filters.priceMin > 0 ||
    filters.priceMax < 500;

  const toggle = (key: keyof Pick<Filters, "sizes" | "colors" | "brands">, val: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter((x) => x !== val)
        : [...prev[key], val],
    }));

  return (
    <aside className="space-y-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </h2>
        {hasActive && (
          <button onClick={onClear} className="text-xs text-primary underline flex items-center gap-1">
            <X className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <div className="border-t border-border">
        <button
          className="w-full flex justify-between items-center py-3 text-sm font-bold uppercase tracking-wider"
          onClick={() => toggleSection("category")}
        >
          Category <ChevronDown className={`h-4 w-4 transition-transform ${openSections.category ? "rotate-180" : ""}`} />
        </button>
        {openSections.category && (
          <ul className="pb-3 space-y-1.5">
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
        )}
      </div>

      {/* Size */}
      <div className="border-t border-border">
        <button
          className="w-full flex justify-between items-center py-3 text-sm font-bold uppercase tracking-wider"
          onClick={() => toggleSection("size")}
        >
          Size <ChevronDown className={`h-4 w-4 transition-transform ${openSections.size ? "rotate-180" : ""}`} />
        </button>
        {openSections.size && (
          <div className="pb-3 flex flex-wrap gap-2">
            {SIZES.map((size) => (
              <button
                key={size}
                onClick={() => toggle("sizes", size)}
                className={`w-10 h-10 border text-xs font-bold transition-colors ${
                  filters.sizes.includes(size)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-foreground"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Color */}
      <div className="border-t border-border">
        <button
          className="w-full flex justify-between items-center py-3 text-sm font-bold uppercase tracking-wider"
          onClick={() => toggleSection("color")}
        >
          Color <ChevronDown className={`h-4 w-4 transition-transform ${openSections.color ? "rotate-180" : ""}`} />
        </button>
        {openSections.color && (
          <div className="pb-3 flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => toggle("colors", color.name)}
                title={color.name}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  filters.colors.includes(color.name) ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground"
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {filters.colors.length > 0 && (
              <div className="w-full text-xs text-muted-foreground mt-1">
                {filters.colors.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Brand */}
      <div className="border-t border-border">
        <button
          className="w-full flex justify-between items-center py-3 text-sm font-bold uppercase tracking-wider"
          onClick={() => toggleSection("brand")}
        >
          Brand <ChevronDown className={`h-4 w-4 transition-transform ${openSections.brand ? "rotate-180" : ""}`} />
        </button>
        {openSections.brand && (
          <ul className="pb-3 space-y-2">
            {BRANDS.map((brand) => (
              <li key={brand}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(brand)}
                    onChange={() => toggle("brands", brand)}
                    className="accent-primary"
                  />
                  {brand}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Price */}
      <div className="border-t border-border">
        <button
          className="w-full flex justify-between items-center py-3 text-sm font-bold uppercase tracking-wider"
          onClick={() => toggleSection("price")}
        >
          Price <ChevronDown className={`h-4 w-4 transition-transform ${openSections.price ? "rotate-180" : ""}`} />
        </button>
        {openSections.price && (
          <div className="pb-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-20 text-xs">{(filters.priceMin / 1000).toFixed(0)}k</span>
              <input
                type="range" min={0} max={MAX_PRICE} step={5000}
                value={filters.priceMin}
                onChange={(e) => setFilters((f) => ({ ...f, priceMin: +e.target.value }))}
                className="flex-1 accent-primary"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-20 text-xs">{filters.priceMax >= MAX_PRICE ? "Any" : `${(filters.priceMax / 1000).toFixed(0)}k`}</span>
              <input
                type="range" min={0} max={MAX_PRICE} step={5000}
                value={filters.priceMax}
                onChange={(e) => setFilters((f) => ({ ...f, priceMax: +e.target.value }))}
                className="flex-1 accent-primary"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {(filters.priceMin / 1000).toFixed(0)}k – {filters.priceMax >= MAX_PRICE ? "Any" : `${(filters.priceMax / 1000).toFixed(0)}k`} IQD
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function Products() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const category = searchParams.get("category") || "";

  const [sort, setSort] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", { category }],
    queryFn: () => fetchProducts({ category: category || undefined, limit: 50 }),
  });

  const { data: shippingRules = [] } = useQuery({
    queryKey: ["shipping-rules"],
    queryFn: getShippingRules,
  });

  const shippingBanner = shippingRules.find((r) => r.enabled)?.textEn;

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const hasActiveFilters =
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.brands.length > 0 ||
    filters.priceMin > 0 ||
    filters.priceMax < MAX_PRICE;

  const filtered = useMemo(() => {
    let products = data?.products ?? [];
    products = applyFilters(products, filters);
    if (sort === "price-asc") products = [...products].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") products = [...products].sort((a, b) => b.price - a.price);
    else if (sort === "name-asc") products = [...products].sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "name-desc") products = [...products].sort((a, b) => b.title.localeCompare(a.title));
    else if (sort === "newest") products = [...products].reverse();
    return products;
  }, [data, filters, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeFilterCount =
    filters.sizes.length +
    filters.colors.length +
    filters.brands.length +
    (filters.priceMin > 0 || filters.priceMax < 500 ? 1 : 0);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Desktop sidebar */}
          <div className="hidden md:block w-56 flex-shrink-0">
            <FilterPanel
              filters={filters}
              setFilters={(f) => { setFilters(f); setPage(1); }}
              category={category}
              onClear={clearFilters}
            />
          </div>

          <div className="flex-1">
            {shippingBanner && (
              <div className="mb-6 flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-medium px-4 py-2.5 rounded">
                <Truck className="h-4 w-4 flex-shrink-0" />
                <span>{shippingBanner}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold uppercase tracking-tighter">
                  {category ? CATEGORIES.find((c) => c.slug === category)?.name || category : "All Products"}
                </h1>
                <span className="text-sm text-muted-foreground">({filtered.length})</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden flex items-center gap-2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
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

            {/* Mobile bottom-sheet filter */}
            {showFilters && (
              <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={() => setShowFilters(false)}
                />
                {/* Sheet */}
                <div className="relative bg-background rounded-t-2xl shadow-2xl max-h-[80dvh] flex flex-col z-10">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" /> Filters
                      {activeFilterCount > 0 && (
                        <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </h2>
                    <button onClick={() => setShowFilters(false)} className="p-1 rounded-md hover:bg-secondary transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1 px-5 pb-6">
                    <FilterPanel
                      filters={filters}
                      setFilters={(f) => { setFilters(f); setPage(1); }}
                      category={category}
                      onClear={clearFilters}
                    />
                  </div>
                  <div className="px-5 py-4 border-t border-border flex-shrink-0">
                    <Button
                      className="w-full h-12 uppercase font-bold tracking-wider"
                      onClick={() => setShowFilters(false)}
                    >
                      View Results
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.sizes.map((s) => (
                  <button key={s}
                    onClick={() => setFilters((f) => ({ ...f, sizes: f.sizes.filter((x) => x !== s) }))}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    {s} <X className="h-3 w-3" />
                  </button>
                ))}
                {filters.colors.map((c) => (
                  <button key={c}
                    onClick={() => setFilters((f) => ({ ...f, colors: f.colors.filter((x) => x !== c) }))}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    {c} <X className="h-3 w-3" />
                  </button>
                ))}
                {filters.brands.map((b) => (
                  <button key={b}
                    onClick={() => setFilters((f) => ({ ...f, brands: f.brands.filter((x) => x !== b) }))}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    {b} <X className="h-3 w-3" />
                  </button>
                ))}
                {(filters.priceMin > 0 || filters.priceMax < 500) && (
                  <button
                    onClick={() => setFilters((f) => ({ ...f, priceMin: 0, priceMax: 500 }))}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    ${filters.priceMin}–${filters.priceMax} <X className="h-3 w-3" />
                  </button>
                )}
                <button onClick={clearFilters} className="px-3 py-1 text-xs text-muted-foreground hover:text-destructive underline">Clear all</button>
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
                        <span className="font-bold">{Math.round(product.price).toLocaleString("en-US")} IQD</span>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <span className="text-destructive line-through text-sm">{Math.round(product.comparePrice).toLocaleString("en-US")} IQD</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 text-sm font-bold border transition-colors ${p === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
                  >
                    {p}
                  </button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
