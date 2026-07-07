import { useState, useEffect } from "react";
import {
  useAdminGetProduct,
  useAdminUpdateProduct,
  getAdminGetProductQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, X, Search, Star, Upload, Image as ImageIcon, Loader2 as Loader2Icon } from "lucide-react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { SortableImageGrid } from "@/components/ui/SortableImageGrid";
import { VariantBuilder, type OptionGroup, type VariantRow } from "@/components/ui/VariantBuilder";
import { CollectionMultiSelect } from "@/components/ui/CollectionMultiSelect";
import { adminFetch, getAdminToken } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

type ApiVariant = {
  id: string; option1?: string | null; option2?: string | null;
  price: number; cost?: number | null; inventory: number; sku: string; comparePrice?: number | null;
};

function variantsToRows(apiVariants: ApiVariant[]): VariantRow[] {
  return apiVariants.map((v) => ({
    option1: v.option1 ?? null,
    option2: v.option2 ?? null,
    price: String(v.price),
    comparePrice: v.comparePrice != null ? String(v.comparePrice) : "",
    sku: v.sku ?? "",
    inventory: String(v.inventory),
    cost: v.cost != null ? String(v.cost) : "",
  }));
}

function deriveOptionGroups(apiVariants: ApiVariant[]): OptionGroup[] {
  if (!apiVariants.length) return [];
  const o1Values = [...new Set(apiVariants.map((v) => v.option1).filter(Boolean) as string[])];
  const o2Values = [...new Set(apiVariants.map((v) => v.option2).filter(Boolean) as string[])];
  const groups: OptionGroup[] = [];
  if (o1Values.length) groups.push({ nameEn: "Option 1", values: o1Values });
  if (o2Values.length) groups.push({ nameEn: "Option 2", values: o2Values });
  return groups;
}

// Migrate legacy single-name option groups into bilingual nameEn/nameAr fields.
function normalizeOptionGroups(groups: OptionGroup[]): OptionGroup[] {
  return groups.map((g) => {
    if (g.nameEn || g.nameAr) return g;
    const nm = (g.name || "").trim();
    if (!nm) return g;
    const isArabic = /[\u0600-\u06FF]/.test(nm);
    return { ...g, nameEn: isArabic ? "" : nm, nameAr: isArabic ? nm : "" };
  });
}

export default function ProductDetail() {
  const { t } = useT();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: response, isLoading } = useAdminGetProduct(id!);
  const updateProduct = useAdminUpdateProduct();

  const product = response?.data;
  const apiVariants = (product?.variants ?? []) as unknown as ApiVariant[];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState("draft");
  const [category, setCategory] = useState("women");
  const [gender, setGender] = useState("all");
  const [vendor, setVendor] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [reelUrl, setReelUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [urlSlug, setUrlSlug] = useState("");
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [browseSections, setBrowseSections] = useState<{ slug: string; titleEn: string; titleAr: string; image: string }[]>([]);
  const [productInBrowse, setProductInBrowse] = useState<string[]>([]);
  const [browseToggling, setBrowseToggling] = useState<string | null>(null);
  const [completeTheSetIds, setCompleteTheSetIds] = useState<string[]>([]);
  const [csProductsMap, setCsProductsMap] = useState<Record<string, { title: string; image?: string }>>({});
  const [csLoaded, setCsLoaded] = useState(false);
  const [csQuery, setCsQuery] = useState("");
  const [csResults, setCsResults] = useState<{ id: string; title: string; images: string[] }[]>([]);
  const [csSearching, setCsSearching] = useState(false);

  useEffect(() => {
    if (!product) return;
    setTitle(product.title || "");
    setDescription(product.description || "");
    setImages(product.images ?? []);
    setPrice(product.price?.toString() ?? "");
    setCompareAtPrice(product.comparePrice != null ? String(product.comparePrice) : "");
    setCost(product.cost != null ? String(product.cost) : "");
    setStatus(product.status || "draft");
    setCategory(product.category || "women");
    setGender((product as unknown as Record<string, string>).gender ?? "all");
    setVendor(product.vendor || "");
    setRating((product as unknown as Record<string, number>).rating ?? 0);
    setRatingCount((product as unknown as Record<string, number>).ratingCount ?? 0);
    setReelUrl((product as unknown as Record<string, string>).videoUrl ?? "");
    setTags(product.tags ?? []);
    setSeoTitle((product as unknown as Record<string, string>).seoTitle ?? "");
    setSeoDescription((product as unknown as Record<string, string>).seoDescription ?? "");
    setUrlSlug((product as unknown as Record<string, string>).urlSlug ?? "");

    const rawOpts = (product as unknown as Record<string, unknown>).optionDefinitions;
    const parsedOpts: OptionGroup[] = Array.isArray(rawOpts) ? rawOpts as OptionGroup[] : [];
    if (parsedOpts.length > 0) {
      setOptionGroups(normalizeOptionGroups(parsedOpts));
    } else if (apiVariants.length > 0) {
      setOptionGroups(deriveOptionGroups(apiVariants));
    }
  }, [product?.id]);

  useEffect(() => {
    if (apiVariants.length > 0) {
      setVariants(variantsToRows(apiVariants));
    }
  }, [product?.id]);

  useEffect(() => {
    if (!id || collectionsLoaded) return;
    adminFetch<Array<{ id: string }>>(`/admin/products/${id}/collections`).then((r) => {
      setSelectedCollections((r.data ?? []).map((c) => c.id));
      setCollectionsLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      adminFetch<{ slug: string; titleEn: string; titleAr: string; image: string }[]>("/admin/browse-collections"),
      adminFetch<string[]>(`/admin/browse-collections/by-product/${id}`),
    ]).then(([sectionsRes, inRes]) => {
      setBrowseSections(sectionsRes.data ?? []);
      setProductInBrowse(inRes.data ?? []);
    }).catch(() => {});
  }, [id]);

  const handleBrowseToggle = async (slug: string) => {
    if (!id || browseToggling) return;
    const isIn = productInBrowse.includes(slug);
    setBrowseToggling(slug);
    try {
      if (isIn) {
        await adminFetch(`/admin/browse-collections/${slug}/products/${id}`, { method: "DELETE" });
        setProductInBrowse((prev) => prev.filter((s) => s !== slug));
      } else {
        await adminFetch(`/admin/browse-collections/${slug}/products`, {
          method: "POST",
          body: JSON.stringify({ productId: id }),
        });
        setProductInBrowse((prev) => [...prev, slug]);
      }
    } catch { /* ignore */ }
    finally { setBrowseToggling(null); }
  };

  useEffect(() => {
    if (!id || csLoaded) return;
    adminFetch<Array<{ id: string; title: string; images: string[] }>>(`/admin/products/${id}/complete-the-set`).then((r) => {
      const items = r.data ?? [];
      setCompleteTheSetIds(items.map((p) => p.id));
      const map: Record<string, { title: string; image?: string }> = {};
      items.forEach((p) => { map[p.id] = { title: p.title, image: (p.images ?? [])[0] }; });
      setCsProductsMap(map);
      setCsLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    const q = csQuery.trim();
    if (!q) { setCsResults([]); return; }
    const timer = setTimeout(async () => {
      setCsSearching(true);
      try {
        const r = await adminFetch<Array<{ id: string; title: string; images: string[] }>>(`/admin/products?q=${encodeURIComponent(q)}`);
        setCsResults(r.data ?? []);
      } catch {}
      setCsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [csQuery]);

  const priceNum = parseFloat(price) || 0;
  const costNum = parseFloat(cost) || 0;
  const profit = priceNum - costNum;
  const margin = priceNum > 0 ? (profit / priceNum) * 100 : 0;

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  };

  const invalidate = () => {
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: getAdminGetProductQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await new Promise<void>((resolve, reject) => {
        updateProduct.mutate(
          {
            id,
            data: {
              title,
              vendor,
              category,
              gender,
              description,
              price: parseFloat(price) || 0,
              compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
              cost: cost ? parseFloat(cost) : null,
              images,
              tags,
              status,
              optionDefinitions: optionGroups,
              seoTitle,
              seoDescription,
              urlSlug,
              rating,
              ratingCount,
              videoUrl: reelUrl || undefined,
            } as unknown as Parameters<typeof updateProduct.mutate>[0]["data"],
          },
          { onSuccess: () => resolve(), onError: reject }
        );
      });

      if (variants.length > 0) {
        await adminFetch(`/admin/products/${id}/variants/sync`, {
          method: "POST",
          body: JSON.stringify({
            variants: variants.map((v) => ({
              option1: v.option1,
              option2: v.option2,
              price: parseFloat(v.price) || 0,
              comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : null,
              cost: v.cost ? parseFloat(v.cost) : null,
              sku: v.sku,
              inventory: parseInt(v.inventory) || 0,
            })),
          }),
        });
      }

      await adminFetch(`/admin/products/${id}/collections`, {
        method: "PUT",
        body: JSON.stringify({ collectionIds: selectedCollections }),
      });

      await adminFetch(`/admin/products/${id}/complete-the-set`, {
        method: "PUT",
        body: JSON.stringify({ relatedIds: completeTheSetIds }),
      });

      invalidate();
      toast({ title: t("products.toast.saved") });
    } catch {
      toast({ title: t("toast.error"), description: t("products.toast.saveError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">{t("products.detail.loading")}</div>;
  if (!product) return <div className="p-8 text-muted-foreground">{t("products.detail.notFound")}</div>;

  const autoSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "");

  const statusLabel = (s: string) => {
    if (s === "active") return t("products.status.active");
    if (s === "draft") return t("products.status.draft");
    if (s === "archived") return t("products.status.archived");
    return s;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{product.title}</h1>
          <Badge variant={product.status === "active" ? "default" : "secondary"} className="flex-shrink-0">
            {statusLabel(product.status)}
          </Badge>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 me-2" />
          {isSaving ? t("action.saving") : t("action.save")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="md:col-span-2 space-y-6">

          {/* Title + Description */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">{t("products.field.title")}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("products.field.description")}</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                />
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>{t("products.section.media")}</CardTitle>
              <CardDescription>{t("products.media.descEdit")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SortableImageGrid images={images} onChange={setImages} />
            </CardContent>
          </Card>

          {/* Collections */}
          <Card>
            <CardHeader>
              <CardTitle>{t("products.section.collections")}</CardTitle>
              <CardDescription>{t("products.collections.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <CollectionMultiSelect
                selected={selectedCollections}
                onChange={setSelectedCollections}
                productId={id ?? ""}
              />
            </CardContent>
          </Card>

          {/* Browse Sections */}
          {browseSections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("products.section.browseSections") ?? "Browse Sections"}</CardTitle>
                <CardDescription>
                  {t("products.browseSections.desc") ?? "Add this product to search-page browse sections"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {browseSections.map((sec) => {
                    const isIn = productInBrowse.includes(sec.slug);
                    const isToggling = browseToggling === sec.slug;
                    return (
                      <button
                        key={sec.slug}
                        type="button"
                        onClick={() => handleBrowseToggle(sec.slug)}
                        disabled={!!browseToggling}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-start ${
                          isIn
                            ? "bg-primary/5 border-primary/30 hover:bg-primary/10"
                            : "bg-background border-border hover:bg-muted/50"
                        } disabled:opacity-60`}
                      >
                        {sec.image ? (
                          <img src={sec.image} alt={sec.titleEn} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sec.titleAr || sec.titleEn}</p>
                          {sec.titleAr && sec.titleEn && (
                            <p className="text-xs text-muted-foreground truncate">{sec.titleEn}</p>
                          )}
                        </div>
                        {isToggling ? (
                          <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isIn ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}>
                            {isIn && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete the Set */}
          <Card>
            <CardHeader>
              <CardTitle>{t("products.section.completeSet")}</CardTitle>
              <CardDescription>{t("products.completeSet.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  placeholder={t("products.completeSet.searchPlaceholder")}
                  value={csQuery}
                  onChange={(e) => setCsQuery(e.target.value)}
                  onBlur={() => setTimeout(() => setCsResults([]), 150)}
                />
                {csSearching && (
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">...</span>
                )}
                {csResults.length > 0 && csQuery && (
                  <div className="absolute z-50 w-full mt-1 border rounded-md bg-popover shadow-md max-h-60 overflow-auto">
                    {csResults
                      .filter((p) => !completeTheSetIds.includes(p.id) && p.id !== id)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-start"
                          onMouseDown={() => {
                            setCompleteTheSetIds((prev) => [...prev, p.id]);
                            setCsProductsMap((prev) => ({ ...prev, [p.id]: { title: p.title, image: (p.images ?? [])[0] } }));
                            setCsQuery("");
                            setCsResults([]);
                          }}
                        >
                          {(p.images ?? [])[0] && (
                            <img src={(p.images ?? [])[0]} alt="" className="w-8 h-10 object-cover rounded flex-shrink-0" />
                          )}
                          <span className="truncate">{p.title}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {completeTheSetIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("products.completeSet.empty")}</p>
              ) : (
                <div className="space-y-2">
                  {completeTheSetIds.map((pid) => {
                    const p = csProductsMap[pid];
                    return (
                      <div key={pid} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                        {p?.image && (
                          <img src={p.image} alt="" className="w-8 h-10 object-cover rounded flex-shrink-0" />
                        )}
                        <span className="flex-1 text-sm truncate">{p?.title ?? pid}</span>
                        <button
                          type="button"
                          onClick={() => setCompleteTheSetIds((prev) => prev.filter((i) => i !== pid))}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>{t("products.section.pricing")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">{t("products.field.sellingPrice")}</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      step="1"
                      min="0"
                      className="pe-12 tabular-nums"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="compareAtPrice">{t("products.field.comparePrice")}</Label>
                  <div className="relative">
                    <Input
                      id="compareAtPrice"
                      type="number"
                      step="1"
                      min="0"
                      className="pe-12 tabular-nums"
                      placeholder="0"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("products.pricing.compareHint")}
              </p>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="cost">{t("products.field.cost")}</Label>
                <div className="relative">
                  <Input
                    id="cost"
                    type="number"
                    step="1"
                    min="0"
                    className="pe-12 tabular-nums"
                    placeholder="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                </div>
              </div>
              {cost && (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 border">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("products.field.profit")}</p>
                    <p className="font-semibold text-sm tabular-nums">{formatIQD(profit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("products.field.margin")}</p>
                    <p className="font-semibold text-sm tabular-nums">{priceNum > 0 ? `${margin.toFixed(1)}%` : "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <CardTitle>{t("products.section.variants")}</CardTitle>
              <CardDescription>{t("products.variants.descEdit")}</CardDescription>
            </CardHeader>
            <CardContent>
              <VariantBuilder
                optionGroups={optionGroups}
                onOptionGroupsChange={setOptionGroups}
                variants={variants}
                onVariantsChange={setVariants}
                basePrice={price}
              />
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                {t("products.section.seo")}
              </CardTitle>
              <CardDescription>{t("products.seo.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="seoTitle">{t("products.field.metaTitle")}</Label>
                <Input
                  id="seoTitle"
                  placeholder={title}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("products.seo.titleChars", { n: (seoTitle || title).length })}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="seoDesc">{t("products.field.metaDescription")}</Label>
                <Textarea
                  id="seoDesc"
                  rows={3}
                  placeholder={t("products.seo.descPlaceholder")}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("products.seo.descChars", { n: seoDescription.length })}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="urlSlug">{t("products.field.urlHandle")}</Label>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">moramoda.tech/products/</span>
                  <Input
                    id="urlSlug"
                    placeholder={autoSlug(title) || t("products.placeholder.urlHandle")}
                    value={urlSlug}
                    onChange={(e) => setUrlSlug(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t("common.status")}</CardTitle></CardHeader>
            <CardContent>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("products.status.active")}</SelectItem>
                  <SelectItem value="draft">{t("products.status.draft")}</SelectItem>
                  <SelectItem value="archived">{t("products.status.archived")}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("products.section.organization")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>{t("products.category")}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="women">{t("products.cat.women")}</SelectItem>
                    <SelectItem value="men">{t("products.cat.men")}</SelectItem>
                    <SelectItem value="beauty">{t("products.cat.beauty")}</SelectItem>
                    <SelectItem value="new_in">{t("products.cat.newIn")}</SelectItem>
                    <SelectItem value="sale">{t("products.cat.sale")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("products.field.audience")}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("products.audience.all")}</SelectItem>
                    <SelectItem value="women">{t("products.cat.women")}</SelectItem>
                    <SelectItem value="men">{t("products.cat.men")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor">{t("products.field.vendor")}</Label>
                <Input
                  id="vendor"
                  placeholder={t("products.placeholder.vendor")}
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </div>

              {/* ── Rating ── */}
              <div className="grid gap-2">
                <Label>{t("products.field.rating")}</Label>
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Star picker */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        onClick={() => setRating(star)}
                        className="p-0.5 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            star <= (ratingHover || rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {/* Decimal override */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0" max="5" step="0.1"
                      className="w-20 h-8 text-sm text-center tabular-nums"
                      value={rating === 0 ? "" : rating}
                      placeholder="4.8"
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setRating(isNaN(v) ? 0 : Math.min(5, Math.max(0, v)));
                      }}
                    />
                    <span className="text-sm text-muted-foreground">/ 5</span>
                  </div>
                  {/* Review count */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      className="w-28 h-8 text-sm tabular-nums"
                      value={ratingCount === 0 ? "" : ratingCount}
                      placeholder={t("products.rating.reviewsPlaceholder")}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setRatingCount(isNaN(v) ? 0 : Math.max(0, v));
                      }}
                    />
                    <span className="text-sm text-muted-foreground">{t("products.rating.reviews")}</span>
                  </div>
                </div>
                {rating > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="text-amber-500">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
                    {rating.toFixed(1)} {t("products.rating.outOf")}
                    {ratingCount > 0 && <> · <strong>{ratingCount.toLocaleString()}</strong> {t("products.rating.reviews")}</>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Instagram Reel ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-[#E1306C] text-base leading-none">◉</span>
                {t("products.section.reel")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {t("products.reel.desc")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 border border-input rounded-md px-3 h-10 focus-within:ring-2 focus-within:ring-ring focus-within:border-ring">
                  <span className="text-[#E1306C] text-xs font-black shrink-0 tracking-tight">IG</span>
                  <input
                    className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground/60 text-foreground"
                    placeholder="https://www.instagram.com/reel/DC6TLCwucXR"
                    value={reelUrl}
                    onChange={(e) => setReelUrl(e.target.value)}
                  />
                  {reelUrl && (
                    <button type="button" onClick={() => setReelUrl("")} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {reelUrl && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t("products.reel.success")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("products.section.tags")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder={t("products.tags.placeholder")}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pe-1 text-xs">
                      {tag}
                      <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== tag))} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
