import { useState } from "react";
import { useAdminCreateProduct } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Search, Star } from "lucide-react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { SortableImageGrid } from "@/components/ui/SortableImageGrid";
import { VariantBuilder, type OptionGroup, type VariantRow } from "@/components/ui/VariantBuilder";
import { CollectionMultiSelect } from "@/components/ui/CollectionMultiSelect";
import { adminFetch } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { useT } from "@/i18n/LanguageContext";

export default function NewProduct() {
  const { t } = useT();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createProduct = useAdminCreateProduct();

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

  const priceNum = parseFloat(price) || 0;
  const costNum = parseFloat(cost) || 0;
  const profit = priceNum - costNum;
  const margin = priceNum > 0 ? (profit / priceNum) * 100 : 0;

  const autoSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "");

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) setTags((p) => [...p, tag]);
    setTagInput("");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: t("products.toast.titleRequired"), variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await new Promise<{ data?: { id?: string } }>((resolve, reject) => {
        createProduct.mutate(
          {
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
              seoTitle: seoTitle || title,
              seoDescription,
              urlSlug: urlSlug || autoSlug(title),
              rating,
              ratingCount,
              videoUrl: reelUrl || undefined,
            } as unknown as Parameters<typeof createProduct.mutate>[0]["data"],
          },
          { onSuccess: resolve, onError: reject }
        );
      });

      const pid = res?.data?.id;
      if (!pid) throw new Error("No product ID returned");

      if (variants.length > 0) {
        await adminFetch(`/admin/products/${pid}/variants/sync`, {
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

      if (selectedCollections.length > 0) {
        await adminFetch(`/admin/products/${pid}/collections`, {
          method: "PUT",
          body: JSON.stringify({ collectionIds: selectedCollections }),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: t("products.toast.created") });
      navigate(`/products/${pid}`);
    } catch {
      toast({ title: t("toast.error"), description: t("products.toast.createError"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex-1 truncate">{t("products.new.title")}</h1>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t("action.saving") : t("products.new.save")}
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
                  placeholder={t("products.placeholder.title")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("products.field.description")}</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={t("products.placeholder.description")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>{t("products.section.media")}</CardTitle>
              <CardDescription>{t("products.media.descNew")}</CardDescription>
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
              />
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
                  <Label htmlFor="price">{t("products.field.sellingPriceIQD")}</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      step="1"
                      min="0"
                      className="pe-12 tabular-nums"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="compareAtPrice">{t("products.field.comparePriceIQD")}</Label>
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
                {t("products.pricing.compareHintNew")}
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
              <CardDescription>{t("products.variants.descNew")}</CardDescription>
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
              <CardDescription>
                {t("products.seo.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="seoTitle">{t("products.field.metaTitle")}</Label>
                <Input
                  id="seoTitle"
                  placeholder={title || t("products.field.title")}
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

          <div className="space-y-2">
            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving ? t("action.saving") : t("products.new.save")}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/products")}>
              {t("products.new.discard")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
