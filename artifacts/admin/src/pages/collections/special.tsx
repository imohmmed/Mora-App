import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Tag, TrendingUp, Star, Trash2, Plus, X, Search, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

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
  const { t } = useT();
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
      toast({ title: t("collections.special.productAdded") });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      await removeItem.mutateAsync(productId);
      toast({ title: t("collections.special.productRemoved") });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("collections.special.noProductsYet")}</p>
      ) : (
        <div className="space-y-2">
          {items.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{p.vendor} · {formatIQD(p.price)}</p>
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
        <Plus className="w-4 h-4 me-2" />
        {t("collections.addProduct")}
      </Button>

      {showPicker && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("collections.searchProducts")}
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
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-start transition-colors"
                onClick={() => handleAdd(p.id)}
              >
                <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.vendor}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatIQD(p.price)}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("collections.noProductsFound")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnlyPanel({ slug }: { slug: string }) {
  const { t } = useT();
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
          ? t("collections.special.autoDiscount")
          : t("collections.special.autoUnitsSold")}
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
              <span className="text-sm font-semibold tabular-nums">{formatIQD(p.price)}</span>
              {disc && <Badge variant="destructive" className="text-xs">{t("collections.special.discountOff", { n: disc })}</Badge>}
              {p.sold_count != null && (
                <Badge variant="secondary" className="text-xs">{t("collections.special.soldCount", { n: p.sold_count })}</Badge>
              )}
            </div>
          </div>
        );
      })}
      {data && (
        <p className="text-xs text-muted-foreground pt-1">
          {t("collections.special.showingOf", { shown: products.length, total: data.total })}
        </p>
      )}
    </div>
  );
}

export default function SpecialCollections() {
  const { t } = useT();
  const [open, setOpen] = useState<string | null>(null);

  const COLLECTIONS = [
    { slug: "super-deals",  title: t("collections.special.superDeals.title"),   description: t("collections.special.superDeals.desc"),   editable: false },
    { slug: "brand-deals",  title: t("collections.special.brandDeals.title"),   description: t("collections.special.brandDeals.desc"),   editable: true  },
    { slug: "trends",       title: t("collections.special.trends.title"),       description: t("collections.special.trends.desc"),       editable: false },
    { slug: "hot-seller",   title: t("collections.special.hotSeller.title"),    description: t("collections.special.hotSeller.desc"),    editable: true  },
    { slug: "gift-wrapping",title: t("collections.special.giftWrapping.title"), description: t("collections.special.giftWrapping.desc"), editable: true  },
  ];

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title={t("collections.special.title")}
        subtitle={t("collections.special.subtitle")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLLECTIONS.map(col => {
          const isOpen = open === col.slug;
          const color = COLORS[col.slug]!;
          return (
            <div key={col.slug} className="border rounded-xl overflow-hidden bg-card">
              <button
                className="w-full flex items-center gap-3 p-4 text-start hover:bg-accent/30 transition-colors"
                onClick={() => setOpen(isOpen ? null : col.slug)}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}18`, color }}>
                  {ICONS[col.slug]}
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="font-semibold">{col.title}</p>
                  <p className="text-xs text-muted-foreground">{col.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {col.editable
                    ? <Badge variant="outline" className="text-xs">{t("collections.badge.manual")}</Badge>
                    : <Badge variant="secondary" className="text-xs">{t("collections.badge.auto")}</Badge>
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
    </PageContainer>
  );
}
