import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Tag, TrendingUp, Star, Trash2, Plus, X, Search, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

type Product = {
  id: string;
  title: string;
  vendor: string;
  price: number;
  compare_price?: number;
  images: string[];
  category: string;
  sold_count?: number;
};

type SpecialCollection = {
  slug: string;
  title: string;
  description: string;
  accentColor: string;
  icon: React.ReactNode;
  editable: boolean;
  total: number;
  products: Product[];
};

const ICONS: Record<string, React.ReactNode> = {
  "super-deals":  <Zap className="w-4 h-4" />,
  "brand-deals":  <Tag className="w-4 h-4" />,
  "trends":       <TrendingUp className="w-4 h-4" />,
  "hot-seller":   <Star className="w-4 h-4" />,
  "gift-wrapping":<Gift className="w-4 h-4" />,
};

const COLORS: Record<string, string> = {
  "super-deals":  "#E53935",
  "brand-deals":  "#0274C1",
  "trends":       "#6A1B9A",
  "hot-seller":   "#E65100",
  "gift-wrapping":"#C2185B",
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json() as { data: T; error?: string };
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json.data;
}

function useCollectionItems(slug: string) {
  return useQuery({
    queryKey: ["admin-special-col", slug],
    queryFn: () => adminFetch<Product[]>(`/admin/special-collections/${slug}/items`),
    staleTime: 30_000,
  });
}

function useAllProducts() {
  return useQuery({
    queryKey: ["admin-all-products-special"],
    queryFn: () =>
      fetch(`${API}/admin/products?limit=200`, { credentials: "include" })
        .then(r => r.json())
        .then((j: { data: Product[] }) => j.data),
    staleTime: 60_000,
  });
}

function useAddItem(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      adminFetch(`/admin/special-collections/${slug}/items`, {
        method: "POST",
        body: JSON.stringify({ productId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-special-col", slug] }),
  });
}

function useRemoveItem(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      adminFetch(`/admin/special-collections/${slug}/items/${productId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-special-col", slug] }),
  });
}

function EditablePanel({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const { data: items = [], isLoading } = useCollectionItems(slug);
  const { data: allProducts = [] } = useAllProducts();
  const addItem = useAddItem(slug);
  const removeItem = useRemoveItem(slug);

  const itemIds = new Set(items.map(p => p.id));
  const filtered = allProducts.filter(
    p => !itemIds.has(p.id) && (
      search === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.vendor.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleAdd = async (productId: string) => {
    try {
      await addItem.mutateAsync(productId);
      toast({ title: "Product added to collection" });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      await removeItem.mutateAsync(productId);
      toast({ title: "Product removed from collection" });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">Loading...</div>;

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products yet. Add some below.</p>
      ) : (
        <div className="space-y-2">
          {items.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.vendor} · ${p.price.toFixed(2)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => handleRemove(p.id)}
                disabled={removeItem.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => setShowPicker(!showPicker)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Product
      </Button>

      {showPicker && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-8 text-sm"
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={() => setShowPicker(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filtered.slice(0, 30).map(p => (
              <button
                key={p.id}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                onClick={() => handleAdd(p.id)}
              >
                <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.vendor}</p>
                </div>
                <span className="text-sm font-semibold">${p.price.toFixed(2)}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnlyPanel({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["special-col-preview", slug],
    queryFn: () =>
      fetch(`${API}/store/special-collections/${slug}?limit=5`, { credentials: "include" })
        .then(r => r.json())
        .then((j: { data: { products: Product[]; total: number } }) => j.data),
    staleTime: 30_000,
  });

  const products = data?.products ?? [];

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        {slug === "super-deals"
          ? "Auto-computed — products with ≥25% discount, sorted by discount percentage."
          : "Auto-computed — products sorted by units sold (last 15 days)."}
      </p>
      {products.map(p => {
        const disc = p.compare_price && p.compare_price > p.price
          ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100)
          : null;
        return (
          <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
            <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
              {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.vendor}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-semibold">${p.price.toFixed(2)}</span>
              {disc && <Badge variant="destructive" className="text-xs">{disc}% off</Badge>}
              {p.sold_count != null && (
                <Badge variant="secondary" className="text-xs">{p.sold_count} sold</Badge>
              )}
            </div>
          </div>
        );
      })}
      {data && (
        <p className="text-xs text-muted-foreground pt-1">
          Showing {products.length} of {data.total} qualifying products
        </p>
      )}
    </div>
  );
}

const COLLECTIONS = [
  { slug: "super-deals",  title: "Super Deals",   description: "≥25% discount — auto-computed",              editable: false },
  { slug: "brand-deals",  title: "Brand Deals",   description: "Manually curated brand picks",               editable: true  },
  { slug: "trends",       title: "Trends",        description: "Best-selling this week — auto-computed",     editable: false },
  { slug: "hot-seller",   title: "Hot Seller",    description: "Manually curated bestsellers",               editable: true  },
  { slug: "gift-wrapping",title: "Gift Wrapping", description: "ارسال الطلب كهدية — products added to cart gift section", editable: true  },
];

export default function SpecialCollections() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Special Collections</h1>
        <p className="text-muted-foreground mt-1">
          Manage the 4 featured sections shown on the home screen of the Mora app.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLLECTIONS.map(col => {
          const isOpen = open === col.slug;
          const color = COLORS[col.slug]!;
          return (
            <div key={col.slug} className="border rounded-xl overflow-hidden bg-card">
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
                onClick={() => setOpen(isOpen ? null : col.slug)}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}18`, color }}>
                  {ICONS[col.slug]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{col.title}</p>
                  <p className="text-xs text-muted-foreground">{col.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {col.editable
                    ? <Badge variant="outline" className="text-xs">Manual</Badge>
                    : <Badge variant="secondary" className="text-xs">Auto</Badge>
                  }
                  <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="border-t p-4">
                  {col.editable
                    ? <EditablePanel slug={col.slug} />
                    : <ReadOnlyPanel slug={col.slug} />
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
