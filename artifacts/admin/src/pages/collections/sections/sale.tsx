import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Pencil, Eye, EyeOff, Upload, Search,
  Image as ImageIcon, Loader2, CheckCircle2, X,
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

type SaleCollection = {
  id: string; title: string; titleAr: string;
  description: string; descriptionAr: string;
  image: string; sortOrder: number; active: boolean;
  conditionType: string; conditionValue: string; productCount: number;
};
type Product = {
  id: string; title: string; vendor: string; price: number;
  images: string[]; compare_price?: number;
};

export default function SaleCollectionsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const [cols, setCols] = useState<SaleCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prodSearch, setProdSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [colProducts, setColProducts] = useState<Record<string, Product[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SaleCollection[]>("/admin/sale-collections");
      setCols(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    try {
      const data = await apiFetch<SaleCollection>("/admin/sale-collections", {
        method: "POST",
        body: JSON.stringify({ title: "New Sale Collection", titleAr: "كولكشن تخفيضات" }),
      });
      setCols((p) => [...p, data]);
      setExpandedId(data.id);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sale collection?")) return;
    try {
      await apiFetch(`/admin/sale-collections/${id}`, { method: "DELETE" });
      setCols((p) => p.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleField = (id: string, field: keyof SaleCollection, value: string | boolean) => {
    setCols((p) => p.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async (col: SaleCollection) => {
    setSaving(col.id);
    try {
      await apiFetch(`/admin/sale-collections/${col.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: col.title, titleAr: col.titleAr,
          description: col.description, descriptionAr: col.descriptionAr,
          image: col.image, active: col.active,
          conditionType: col.conditionType, conditionValue: col.conditionValue,
        }),
      });
      toast({ title: t("toast.saved") });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setSaving(null); }
  };

  const handleImageUpload = async (id: string, file: File) => {
    setUploading(id);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST", headers: { Authorization: `Bearer ${adminToken()}` }, body: form,
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!json.data?.url) throw new Error(json.error ?? "Upload failed");
      handleField(id, "image", json.data.url);
      const col = cols.find((c) => c.id === id);
      if (col) await apiFetch(`/admin/sale-collections/${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...col, image: json.data.url }),
      });
      toast({ title: t("toast.saved") });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setUploading(null); }
  };

  const loadColProducts = async (id: string) => {
    try {
      const data = await apiFetch<Product[]>(`/admin/sale-collections/${id}/products`);
      setColProducts((p) => ({ ...p, [id]: data }));
    } catch { /* ignore */ }
  };

  const handleSearchProducts = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await apiFetch<any>(`/admin/products?q=${encodeURIComponent(q)}&limit=10`);
      setSearchResults((data as any).products ?? (Array.isArray(data) ? data : []));
    } catch { /* ignore */ } finally { setSearching(false); }
  };

  const handleAddProduct = async (colId: string, productId: string) => {
    try {
      await apiFetch(`/admin/sale-collections/${colId}/products`, {
        method: "POST", body: JSON.stringify({ productId }),
      });
      await loadColProducts(colId);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleRemoveProduct = async (colId: string, productId: string) => {
    try {
      await apiFetch(`/admin/sale-collections/${colId}/products/${productId}`, { method: "DELETE" });
      setColProducts((p) => ({ ...p, [colId]: (p[colId] ?? []).filter((x) => x.id !== productId) }));
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

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

      <PageHeader title="Home Sale Collections" subtitle="بطاقات تخفيضات تظهر في الصفحة الرئيسية — صورة 9:16" />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : cols.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">لا يوجد كولكشنات. أضف واحد بالزر أدناه.</p>
      ) : (
        <div className="space-y-3">
          {cols.map((col) => {
            const isExpanded = expandedId === col.id;
            return (
              <div key={col.id} className="border rounded-2xl overflow-hidden bg-card">
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
                  {/* 9:16 thumbnail */}
                  <div className="w-10 rounded-xl overflow-hidden bg-muted flex-shrink-0 border" style={{ aspectRatio: "9/16" }}>
                    {col.image
                      ? <img src={col.image} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-3 h-3 text-muted-foreground/40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{col.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground truncate">{col.titleAr || "—"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {col.conditionType === "manual" ? `${col.productCount} products (manual)` :
                       col.conditionType === "tag" ? `Tag: ${col.conditionValue}` : "All products"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleField(col.id, "active", !col.active)}
                      className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        col.active ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground")}
                    >
                      {col.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : col.id);
                        if (!isExpanded) loadColProducts(col.id);
                      }}
                      className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isExpanded ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent")}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(col.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded edit panel */}
                {isExpanded && (
                  <div className="p-4 space-y-4 border-t bg-background">
                    {/* Image + EN/AR title */}
                    <div className="flex gap-4 items-start">
                      <div
                        className="w-24 rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted cursor-pointer hover:border-primary/50 transition-colors relative"
                        style={{ aspectRatio: "9/16" }}
                        onClick={() => document.getElementById(`sale-img-${col.id}`)?.click()}
                      >
                        {col.image
                          ? <img src={col.image} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground/60">
                              <Upload className="w-5 h-5" />
                              <span className="text-[9px] text-center px-1">9:16 Image</span>
                            </div>}
                        {uploading === col.id && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <input
                        id={`sale-img-${col.id}`}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(col.id, f); e.target.value = ""; }}
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label className="text-xs">Title (EN)</Label>
                          <Input value={col.title} onChange={(e) => handleField(col.id, "title", e.target.value)} className="h-8 text-sm mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">العنوان (AR)</Label>
                          <Input value={col.titleAr} onChange={(e) => handleField(col.id, "titleAr", e.target.value)} dir="rtl" className="h-8 text-sm mt-1" />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Description (EN)</Label>
                        <Input value={col.description} onChange={(e) => handleField(col.id, "description", e.target.value)} className="h-8 text-sm mt-1" placeholder="e.g. Under 50,000 IQD" />
                      </div>
                      <div>
                        <Label className="text-xs">الوصف (AR)</Label>
                        <Input value={col.descriptionAr} onChange={(e) => handleField(col.id, "descriptionAr", e.target.value)} dir="rtl" className="h-8 text-sm mt-1" placeholder="الوصف بالعربي" />
                      </div>
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                      <Label className="text-xs">Products Source</Label>
                      <div className="flex gap-2">
                        {(["manual", "tag", "all"] as const).map((ct) => (
                          <button
                            key={ct} type="button"
                            onClick={() => handleField(col.id, "conditionType", ct)}
                            className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                              col.conditionType === ct
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-muted")}
                          >
                            {ct === "manual" ? "Manual" : ct === "tag" ? "By Tag" : "All Products"}
                          </button>
                        ))}
                      </div>
                      {col.conditionType === "tag" && (
                        <div>
                          <Label className="text-xs">Tag Name</Label>
                          <Input
                            value={col.conditionValue}
                            onChange={(e) => handleField(col.id, "conditionValue", e.target.value)}
                            className="h-8 text-sm mt-1" placeholder="e.g. sale, summer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Save */}
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleSave(col)} disabled={saving === col.id} className="gap-1.5">
                        {saving === col.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        {t("action.save")}
                      </Button>
                    </div>

                    {/* Products (manual mode) */}
                    {col.conditionType === "manual" && (
                      <div className="border-t pt-4 space-y-3">
                        <p className="text-sm font-semibold">Products</p>
                        {(colProducts[col.id] ?? []).length > 0 && (
                          <div className="space-y-1">
                            {(colProducts[col.id] ?? []).map((p) => (
                              <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50">
                                <div className="w-8 h-8 rounded bg-muted overflow-hidden flex-shrink-0">
                                  {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{p.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatIQD(p.price)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(col.id, p.id)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:bg-red-50"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Search to add */}
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            value={prodSearch}
                            onChange={(e) => { setProdSearch(e.target.value); handleSearchProducts(e.target.value); }}
                            className="pl-7 h-8 text-sm" placeholder="Search products to add…"
                          />
                        </div>
                        {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
                        {searchResults.length > 0 && (
                          <div className="border rounded-lg overflow-hidden divide-y">
                            {searchResults.slice(0, 6).map((p) => (
                              <button
                                key={p.id} type="button"
                                onClick={() => { handleAddProduct(col.id, p.id); setSearchResults([]); setProdSearch(""); }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-start"
                              >
                                <div className="w-7 h-7 rounded bg-muted overflow-hidden flex-shrink-0">
                                  {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{p.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatIQD(p.price)}</p>
                                </div>
                                <Plus className="w-3 h-3 text-primary flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      <button
        type="button" onClick={handleAdd}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-muted-foreground/30 rounded-2xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Sale Collection
      </button>
    </PageContainer>
  );
}
