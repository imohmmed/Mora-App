import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, X, Search, ChevronDown, ChevronRight,
  Zap, Tag, TrendingUp, Star, Gift, Settings2, Loader2, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const adminToken = () => { try { return localStorage.getItem("mora_admin_token") || ""; } catch { return ""; } };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json", Accept: "application/json",
      Authorization: `Bearer ${adminToken()}`, ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { data: T; error?: string };
  if (!res.ok) throw new Error((json as any).error ?? `Error ${res.status}`);
  return json.data;
}

type Product = { id: string; title: string; vendor: string; price: number; images: string[]; compare_price?: number };
type QuickMeta = { titleEn: string; titleAr: string; image: string; backgroundImage: string };

const QUICK_META: Record<string, { labelKey: string; color: string; icon: React.ReactNode }> = {
  "super-deals":   { labelKey: "collections.quick.superDeals",   color: "#E53935", icon: <Zap className="w-4 h-4" /> },
  "brand-deals":   { labelKey: "collections.quick.brandDeals",   color: "#0274C1", icon: <Tag className="w-4 h-4" /> },
  "trends":        { labelKey: "collections.quick.trends",       color: "#6A1B9A", icon: <TrendingUp className="w-4 h-4" /> },
  "hot-seller":    { labelKey: "collections.quick.hotSeller",    color: "#E65100", icon: <Star className="w-4 h-4" /> },
  "gift-wrapping": { labelKey: "collections.quick.giftWrapping", color: "#C2185B", icon: <Gift className="w-4 h-4" /> },
};

const QUICK_SLOTS = [
  { slug: "super-deals",  editable: false },
  { slug: "brand-deals",  editable: true },
  { slug: "trends",       editable: false },
  { slug: "hot-seller",   editable: true },
  { slug: "gift-wrapping",editable: true },
];

// ─── Quick Preview ────────────────────────────────────────────────────────────

function QuickPreview({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm mb-6">
      <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground border-b">Preview</div>
      <div className="grid grid-cols-4 gap-2 p-4">
        {Object.entries(QUICK_META).slice(0, 4).map(([slug, meta]) => (
          <div key={slug} className="flex flex-col items-center gap-1.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
            >
              {meta.icon}
            </div>
            <p className="text-[10px] text-center text-muted-foreground tabular-nums">
              {counts[slug] ?? 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick Panel ─────────────────────────────────────────────────────────────

function QuickPanel({ slug, editable }: { slug: string; editable: boolean }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [metaForm, setMetaForm] = useState<QuickMeta>({ titleEn: "", titleAr: "", image: "", backgroundImage: "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const [uploadingField, setUploadingField] = useState<"image" | "bg" | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const meta = QUICK_META[slug]!;

  const { data: items = [] } = useQuery<Product[]>({
    queryKey: ["admin-special-col", slug],
    queryFn: () => apiFetch<Product[]>(`/admin/special-collections/${slug}/items`),
  });

  const { data: metaData } = useQuery<QuickMeta>({
    queryKey: ["admin-quick-meta", slug],
    queryFn: () => apiFetch<QuickMeta>(`/admin/special-collections/${slug}/meta`),
    enabled: open,
    staleTime: 30_000,
  });

  useEffect(() => { if (metaData) setMetaForm(metaData); }, [metaData]);

  const uploadFile = async (file: File, field: "image" | "bg") => {
    setUploadingField(field);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST", headers: { Authorization: `Bearer ${adminToken()}` }, body: fd,
      });
      const json = (await res.json()) as { data?: { url?: string } };
      if (!res.ok || !json.data?.url) throw new Error("Upload failed");
      setMetaForm((f) => field === "image" ? { ...f, image: json.data!.url! } : { ...f, backgroundImage: json.data!.url! });
    } catch (err) {
      toast({ title: t("collections.uploadFailed"), description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploadingField(null);
      if (imgRef.current) imgRef.current.value = "";
      if (bgRef.current) bgRef.current.value = "";
    }
  };

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      await apiFetch(`/admin/special-collections/${slug}/meta`, { method: "PUT", body: JSON.stringify(metaForm) });
      qc.invalidateQueries({ queryKey: ["admin-quick-meta", slug] });
      toast({ title: t("toast.saved") }); setShowMeta(false);
    } catch (err) {
      toast({ title: t("toast.error"), description: (err as Error).message, variant: "destructive" });
    } finally { setSavingMeta(false); }
  };

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["admin-all-products"],
    queryFn: () => fetch(`${API}/admin/products?limit=200`, {
      headers: { Authorization: `Bearer ${adminToken()}` },
    }).then((r) => r.json()).then((j: { data: Product[] }) => j.data),
    staleTime: 60_000,
    enabled: showPicker,
  });

  const addItem = useMutation({
    mutationFn: (productId: string) =>
      apiFetch(`/admin/special-collections/${slug}/items`, { method: "POST", body: JSON.stringify({ productId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-special-col", slug] }),
    onError: (e) => toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" }),
  });

  const removeItem = useMutation({
    mutationFn: (productId: string) =>
      apiFetch(`/admin/special-collections/${slug}/items/${productId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-special-col", slug] }),
  });

  const itemIds = new Set(items.map((p) => p.id));
  const filtered = allProducts.filter(
    (p) => !itemIds.has(p.id) && (
      search === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.vendor.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-accent/20 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          {meta.icon}
        </div>
        <div className="flex-1 text-start">
          <p className="font-semibold text-sm">{t(meta.labelKey)}</p>
          <p className="text-xs text-muted-foreground">{t("collections.productsCount", { n: items.length })}</p>
        </div>
        {editable
          ? <Badge variant="outline" className="text-xs">{t("collections.badge.manual")}</Badge>
          : <Badge variant="secondary" className="text-xs">{t("collections.badge.auto")}</Badge>}
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t p-4 space-y-3">
          {/* Meta edit (names + images) */}
          <div className="border rounded-xl overflow-hidden bg-muted/10">
            <button type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-start text-xs font-semibold hover:bg-accent/20 transition-colors"
              onClick={() => setShowMeta((s) => !s)}
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t("collections.quick.namesImages")}</span>
              {showMeta
                ? <ChevronDown className="w-3 h-3 ms-auto text-muted-foreground" />
                : <ChevronRight className="w-3 h-3 ms-auto text-muted-foreground" />}
            </button>
            {showMeta && (
              <div className="border-t p-3 space-y-3 bg-background">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.field.arabicName")}</Label>
                    <Input className="h-8 text-sm text-start" dir="rtl"
                      value={metaForm.titleAr} onChange={(e) => setMetaForm((f) => ({ ...f, titleAr: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.field.englishName")}</Label>
                    <Input className="h-8 text-sm"
                      value={metaForm.titleEn} onChange={(e) => setMetaForm((f) => ({ ...f, titleEn: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.quick.sectionImage")}</Label>
                    <div className="flex items-center gap-2">
                      {metaForm.image && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border">
                          <img src={metaForm.image} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                      <input ref={imgRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "image")} />
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1"
                        onClick={() => imgRef.current?.click()} disabled={uploadingField !== null}>
                        {uploadingField === "image" ? t("collections.uploading") : t("collections.uploadImage")}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.quick.bgImage")}</Label>
                    <div className="flex items-center gap-2">
                      {metaForm.backgroundImage && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border">
                          <img src={metaForm.backgroundImage} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                      <input ref={bgRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "bg")} />
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1"
                        onClick={() => bgRef.current?.click()} disabled={uploadingField !== null}>
                        {uploadingField === "bg" ? t("collections.uploading") : t("collections.uploadImage")}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowMeta(false)}>{t("action.cancel")}</Button>
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={saveMeta} disabled={savingMeta || uploadingField !== null}>
                    {savingMeta ? t("action.saving") : t("action.save")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!editable && (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              {slug === "super-deals" ? t("collections.auto.superDeals") : t("collections.auto.unitsSold")}
            </p>
          )}

          {items.length > 0 && (
            <div className="space-y-1.5">
              {items.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border bg-background hover:bg-accent/20 transition-colors">
                  <div className="w-9 h-9 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.vendor}</p>
                  </div>
                  {editable && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem.mutate(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {editable && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowPicker((s) => !s)}>
                <Plus className="w-3.5 h-3.5" /> {t("collections.addProduct")}
              </Button>

              {showPicker && (
                <div className="border rounded-xl p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("collections.searchProducts")} className="h-8 text-sm" autoFocus />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPicker(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filtered.slice(0, 30).map((p) => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-start transition-colors"
                        onClick={() => addItem.mutate(p.id)}
                      >
                        <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                          {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
                        </div>
                        <p className="text-sm font-medium truncate flex-1">{p.title}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">{formatIQD(p.price ?? 0)}</span>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-3">{t("collections.noProductsFound")}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuickSectionsPage() {
  const { t } = useT();

  const { data: counts } = useQuery<Record<string, number>>({
    queryKey: ["admin-quick-counts"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      await Promise.all(QUICK_SLOTS.map(async ({ slug }) => {
        const items = await apiFetch<Product[]>(`/admin/special-collections/${slug}/items`).catch(() => []);
        results[slug] = Array.isArray(items) ? items.length : 0;
      }));
      return results;
    },
    staleTime: 30_000,
  });

  return (
    <PageContainer className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/collections">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("action.back")}
          </button>
        </Link>
      </div>

      <PageHeader title={t("collections.quick.title")} subtitle={t("collections.quick.hint")} />

      <QuickPreview counts={counts ?? {}} />

      <div className="space-y-2">
        {QUICK_SLOTS.map(({ slug, editable }) => (
          <QuickPanel key={slug} slug={slug} editable={editable} />
        ))}
      </div>
    </PageContainer>
  );
}
