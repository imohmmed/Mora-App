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
import { ArrowLeft, Save, Plus, X, Search, Star } from "lucide-react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { SortableImageGrid } from "@/components/ui/SortableImageGrid";
import { VariantBuilder, type OptionGroup, type VariantRow } from "@/components/ui/VariantBuilder";
import { CollectionMultiSelect } from "@/components/ui/CollectionMultiSelect";
import { adminFetch } from "@/lib/api";

const fmtIQD = (n: number) => `${Math.round(n).toLocaleString("en-US")} IQD`;

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
  if (o1Values.length) groups.push({ name: "Option 1", values: o1Values });
  if (o2Values.length) groups.push({ name: "Option 2", values: o2Values });
  return groups;
}

export default function ProductDetail() {
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [urlSlug, setUrlSlug] = useState("");
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

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
    setTags(product.tags ?? []);
    setSeoTitle((product as unknown as Record<string, string>).seoTitle ?? "");
    setSeoDescription((product as unknown as Record<string, string>).seoDescription ?? "");
    setUrlSlug((product as unknown as Record<string, string>).urlSlug ?? "");

    const rawOpts = (product as unknown as Record<string, unknown>).optionDefinitions;
    const parsedOpts: OptionGroup[] = Array.isArray(rawOpts) ? rawOpts as OptionGroup[] : [];
    if (parsedOpts.length > 0) {
      setOptionGroups(parsedOpts);
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

      invalidate();
      toast({ title: "Product saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save product.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading product...</div>;
  if (!product) return <div className="p-8 text-muted-foreground">Product not found.</div>;

  const autoSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
          <Badge variant={product.status === "active" ? "default" : "secondary"}>
            {product.status}
          </Badge>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="md:col-span-2 space-y-6">

          {/* Title + Description */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
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
              <CardTitle>Media</CardTitle>
              <CardDescription>Drag to reorder — first image is the main cover.</CardDescription>
            </CardHeader>
            <CardContent>
              <SortableImageGrid images={images} onChange={setImages} />
            </CardContent>
          </Card>

          {/* Collections */}
          <Card>
            <CardHeader>
              <CardTitle>Collections</CardTitle>
              <CardDescription>Add this product to one or more collections.</CardDescription>
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
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Selling Price</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      step="1"
                      min="0"
                      className="pr-12"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="compareAtPrice">Compare-at Price</Label>
                  <div className="relative">
                    <Input
                      id="compareAtPrice"
                      type="number"
                      step="1"
                      min="0"
                      className="pr-12"
                      placeholder="0"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set Compare-at higher than the selling price to show a discount.
              </p>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="cost">Cost per item</Label>
                <div className="relative">
                  <Input
                    id="cost"
                    type="number"
                    step="1"
                    min="0"
                    className="pr-12"
                    placeholder="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">IQD</span>
                </div>
              </div>
              {cost && (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 border">
                  <div>
                    <p className="text-xs text-muted-foreground">Profit per item</p>
                    <p className="font-semibold text-sm">{fmtIQD(profit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margin</p>
                    <p className="font-semibold text-sm">{priceNum > 0 ? `${margin.toFixed(1)}%` : "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>Define options like size or color. Each combination becomes a purchasable variant.</CardDescription>
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
                Search Engine Listing
              </CardTitle>
              <CardDescription>Customize how this product appears in search results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="seoTitle">Meta title</Label>
                <Input
                  id="seoTitle"
                  placeholder={title}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{(seoTitle || title).length} / 70 characters</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="seoDesc">Meta description</Label>
                <Textarea
                  id="seoDesc"
                  rows={3}
                  placeholder="Brief product summary for search results..."
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{seoDescription.length} / 160 characters</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="urlSlug">URL handle</Label>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">moramoda.tech/products/</span>
                  <Input
                    id="urlSlug"
                    placeholder={autoSlug(title) || "product-handle"}
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
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="new_in">New In</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Audience</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Men &amp; Women)</SelectItem>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  placeholder="e.g. Mora Brand"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </div>

              {/* ── Rating ── */}
              <div className="grid gap-2">
                <Label>Product Rating</Label>
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
                      className="w-20 h-8 text-sm text-center"
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
                      className="w-28 h-8 text-sm"
                      value={ratingCount === 0 ? "" : ratingCount}
                      placeholder="# reviews"
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setRatingCount(isNaN(v) ? 0 : Math.max(0, v));
                      }}
                    />
                    <span className="text-sm text-muted-foreground">reviews</span>
                  </div>
                </div>
                {rating > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="text-amber-500">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
                    {rating.toFixed(1)} out of 5
                    {ratingCount > 0 && <> · <strong>{ratingCount.toLocaleString()}</strong> reviews</>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
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
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 pr-1 text-xs">
                      {t}
                      <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="hover:text-destructive">
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
