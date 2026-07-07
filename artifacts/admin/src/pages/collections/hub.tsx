import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  GripVertical, Plus, Trash2, X, Search, ChevronDown, ChevronRight, ChevronUp,
  BookImage, Layers, Zap, Tag, TrendingUp, Star, Eye, EyeOff, Image as ImageIcon,
  FolderOpen, Pencil, Wand2, LayoutList, Loader2, CheckCircle2, Gift, Settings2,
  User, Droplet, Box, ShoppingBag, Heart, Watch, ShoppingCart, Smile, Sun,
  Scissors, Award, Camera, Grid3x3, Upload,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatIQD } from "@/lib/format";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

// ─── Types ─────────────────────────────────────────────────────────────────

type StoryItem = {
  id: string; rowId: string; title: string; titleAr: string; imageUrl: string;
  linkUrl: string; sortOrder: number; status: string; collectionId?: string | null;
};
type StoryRow = {
  id: string; title: string; titleAr?: string; sortOrder: number; status: string;
  createdAt: string; items: StoryItem[];
};
type Collection = {
  id: string; title: string; description?: string; image?: string;
  productsCount?: number; createdAt?: string;
};
type Product = {
  id: string; title: string; vendor: string; price: number;
  images: string[]; compare_price?: number;
};

// ─── API helpers ────────────────────────────────────────────────────────────

const adminAuthToken = () => { try { return localStorage.getItem("mora_admin_token") || ""; } catch { return ""; } };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${adminAuthToken()}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json() as { data: T; error?: string };
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  return json.data;
}

// ─── Menu Tab Bar ────────────────────────────────────────────────────────────

type TabConfig = {
  id: string;
  label: string;
  arabicLabel?: string;
  filterType: "all" | "gender" | "category" | "sale" | "foryou" | string;
  filterValue?: string;
};

const DEFAULT_MENU_TABS: TabConfig[] = [
  { id: "tab_all",    label: "ALL",     arabicLabel: "الكل",     filterType: "all" },
  { id: "tab_women",  label: "WOMEN",   arabicLabel: "نساء",     filterType: "gender",   filterValue: "women" },
  { id: "tab_men",    label: "MEN",     arabicLabel: "رجال",     filterType: "gender",   filterValue: "men" },
  { id: "tab_beauty", label: "BEAUTY",  arabicLabel: "جمال",     filterType: "category", filterValue: "beauty" },
  { id: "tab_sale",   label: "SALE",    arabicLabel: "تخفيضات",  filterType: "sale" },
  { id: "tab_foryou", label: "FOR YOU", arabicLabel: "لك ✦",     filterType: "foryou" },
];

function MenuTabBarSection() {
  const { t } = useT();
  const [sectionOpen, setSectionOpen] = useState(true);
  const [tabs, setTabs] = useState<TabConfig[]>(DEFAULT_MENU_TABS);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const { data: sections, isLoading } = useQuery<{ id: string; key: string; items: TabConfig[] }[]>({
    queryKey: ["admin-content-sections"],
    queryFn: () => apiFetch<{ id: string; key: string; items: TabConfig[] }[]>("/admin/content-sections"),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!sections) return;
    const section = sections.find((s) => s.key === "menu_tabs");
    if (section) {
      setSectionId(section.id);
      if (section.items?.length) setTabs(section.items as TabConfig[]);
    }
  }, [sections]);

  const update = (index: number, field: keyof TabConfig, value: string) => {
    setTabs((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
    setSaved(false);
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setTabs((prev) => { const n = [...prev]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });
    setSaved(false);
  };

  const moveDown = (i: number) => {
    if (i === tabs.length - 1) return;
    setTabs((prev) => { const n = [...prev]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n; });
    setSaved(false);
  };

  const removeTab = (i: number) => {
    setTabs((prev) => prev.filter((_, idx) => idx !== i));
    setSaved(false);
  };

  const addTab = () => {
    setTabs((prev) => [...prev, { id: `tab_${Date.now()}`, label: "NEW", arabicLabel: "جديد", filterType: "all" }]);
    setSaved(false);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      if (sectionId) {
        await apiFetch(`/admin/content-sections/${sectionId}`, {
          method: "PUT",
          body: JSON.stringify({ items: tabs }),
        });
      } else {
        const result = await apiFetch<{ id: string }>("/admin/content-sections", {
          method: "POST",
          body: JSON.stringify({ key: "menu_tabs", title: "Menu Tab Bar", items: tabs, status: "active" }),
        });
        if ((result as any)?.id) setSectionId((result as any).id);
      }
      setSaved(true);
      toast({ title: t("toast.saved"), description: t("collections.menuSaved.desc") });
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 flex-shrink-0">
          <LayoutList className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 text-start">
          <p className="font-bold text-base">{t("collections.menuTabBar.title")}</p>
          <p className="text-xs text-muted-foreground">{t("collections.menuTabBar.hint")}</p>
        </div>
        <Badge variant="outline">{t("collections.tabsCount", { n: tabs.length })}</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />}
      </button>

      {sectionOpen && (
        <div className="border-t p-5 space-y-4">
          {/* Live preview */}
          <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
            <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t("collections.preview.homeTabBar")}</span>
            </div>
            <div className="px-4 py-3 flex gap-4 overflow-x-auto">
              {tabs.map((tab, i) => (
                <div key={tab.id} className={cn("flex flex-col items-center gap-0.5 pb-1.5 flex-shrink-0 relative", i === 0 && "after:absolute after:bottom-0 after:start-0 after:end-0 after:h-0.5 after:bg-foreground after:rounded-full")}>
                  {tab.arabicLabel && <span className="text-[11px] font-bold leading-tight">{tab.arabicLabel}</span>}
                  <span className={cn("text-[9px] leading-tight", tab.arabicLabel ? "text-muted-foreground" : "text-[11px] font-bold text-foreground")}>{tab.label}</span>
                </div>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[auto_1fr_1fr_10rem_auto] gap-2 px-1 pb-1">
                <div />
                <span className="text-xs font-medium text-muted-foreground">{t("collections.field.arabicName")}</span>
                <span className="text-xs font-medium text-muted-foreground">{t("collections.field.english")}</span>
                <span className="text-xs font-medium text-muted-foreground">{t("collections.field.filter")}</span>
                <div />
              </div>
              {tabs.map((tab, i) => (
                <div key={tab.id} className="grid grid-cols-[auto_1fr_1fr_10rem_auto] items-center gap-2 p-2 border rounded-xl bg-background">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40" />

                  <Input
                    value={tab.arabicLabel ?? ""}
                    onChange={(e) => update(i, "arabicLabel", e.target.value)}
                    className="h-8 text-sm text-start font-medium"
                    placeholder={t("collections.placeholder.womenExample")}
                    dir="rtl"
                  />

                  <Input
                    value={tab.label}
                    onChange={(e) => update(i, "label", e.target.value.toUpperCase())}
                    className="h-8 text-sm font-mono font-semibold"
                    placeholder={t("collections.placeholder.womenEnExample")}
                  />

                  <Select value={tab.filterType} onValueChange={(v) => {
                    update(i, "filterType", v);
                    if (v === "gender" && !tab.filterValue) update(i, "filterValue", "women");
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("collections.filter.allProducts")}</SelectItem>
                      <SelectItem value="gender">{t("collections.filter.gender")}</SelectItem>
                      <SelectItem value="category">{t("collections.filter.category")}</SelectItem>
                      <SelectItem value="sale">{t("collections.filter.saleDeals")}</SelectItem>
                      <SelectItem value="foryou">{t("collections.filter.forYou")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    {(tab.filterType === "gender" || tab.filterType === "category") && (
                      tab.filterType === "gender" ? (
                        <Select value={tab.filterValue ?? "women"} onValueChange={(v) => update(i, "filterValue", v)}>
                          <SelectTrigger className="h-8 w-20 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="women">{t("collections.gender.women")}</SelectItem>
                            <SelectItem value="men">{t("collections.gender.men")}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={tab.filterValue ?? ""}
                          onChange={(e) => update(i, "filterValue", e.target.value)}
                          className="h-8 w-20 text-xs"
                          placeholder={t("collections.category.placeholder")}
                        />
                      )
                    )}
                    <button type="button" disabled={i === 0} onClick={() => moveUp(i)}
                      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" disabled={i === tabs.length - 1} onClick={() => moveDown(i)}
                      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => removeTab(i)}
                      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={addTab}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors">
              <Plus className="w-4 h-4" /> {t("collections.addTab")}
            </button>
            <button type="button" onClick={saveAll} disabled={saving}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors",
                saving ? "bg-primary/70 text-primary-foreground cursor-wait" :
                saved  ? "bg-green-500/10 text-green-700 border border-green-200" :
                         "bg-primary text-primary-foreground hover:bg-primary/90"
              )}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("action.saving")}</> :
               saved  ? <><CheckCircle2 className="w-4 h-4" /> {t("toast.saved")}</> :
                        t("action.saveChanges")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Search Collections (Browse Sections shown on app search page) ────────────

type BrowseSection = {
  slug: string;
  titleEn: string;
  titleAr: string;
  image: string;
  productCount: number;
};

function SearchCollectionsSection() {
  const { t } = useT();
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sections, setSections] = useState<BrowseSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<BrowseSection[]>("/admin/browse-collections");
      setSections(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (sectionOpen) loadSections();
  }, [sectionOpen, loadSections]);

  const handleAdd = async () => {
    try {
      const data = await apiFetch<BrowseSection>("/admin/browse-collections", {
        method: "POST",
        body: JSON.stringify({ titleEn: "New Section", titleAr: "قسم جديد" }),
      });
      setSections((prev) => [...prev, { ...data, productCount: 0 }]);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      await apiFetch(`/admin/browse-collections/${slug}`, { method: "DELETE" });
      setSections((prev) => prev.filter((s) => s.slug !== slug));
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleFieldChange = (slug: string, field: "titleEn" | "titleAr", value: string) => {
    setSections((prev) => prev.map((s) => s.slug === slug ? { ...s, [field]: value } : s));
  };

  const handleSave = async (slug: string) => {
    const sec = sections.find((s) => s.slug === slug);
    if (!sec) return;
    setSavingSlug(slug);
    try {
      await apiFetch(`/admin/browse-collections/${slug}/meta`, {
        method: "PUT",
        body: JSON.stringify({ titleEn: sec.titleEn, titleAr: sec.titleAr, image: sec.image }),
      });
      toast({ title: t("toast.saved") });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setSavingSlug(null); }
  };

  const handleImageUpload = async (slug: string, file: File) => {
    setUploadingSlug(slug);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminAuthToken()}` },
        body: form,
      });
      const json = await res.json() as { data?: { url: string }; error?: string };
      if (!json.data?.url) throw new Error(json.error ?? "Upload failed");
      const url = json.data.url;
      setSections((prev) => prev.map((s) => s.slug === slug ? { ...s, image: url } : s));
      const sec = sections.find((s) => s.slug === slug);
      await apiFetch(`/admin/browse-collections/${slug}/meta`, {
        method: "PUT",
        body: JSON.stringify({ titleEn: sec?.titleEn, titleAr: sec?.titleAr, image: url }),
      });
      toast({ title: t("toast.saved") });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setUploadingSlug(null); }
  };

  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 flex-shrink-0">
          <Grid3x3 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 text-start">
          <p className="font-bold text-base">{t("searchCol.title")}</p>
          <p className="text-xs text-muted-foreground">{t("searchCol.hint")}</p>
        </div>
        <Badge variant="outline">{t("collections.tabsCount", { n: sections.length })}</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />}
      </button>

      {sectionOpen && (
        <div className="border-t p-5 space-y-4">
          {/* Preview grid */}
          {sections.length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
              <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{t("searchCol.preview")}</span>
              </div>
              <div className="px-4 py-3 grid grid-cols-3 gap-3">
                {sections.map((s) => (
                  <div key={s.slug} className="rounded-xl overflow-hidden aspect-[4/3] bg-muted relative">
                    {s.image ? (
                      <img src={s.image} alt={s.titleEn} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/60 px-2 py-1.5">
                      <p className="text-[10px] text-white font-semibold truncate">{s.titleAr || s.titleEn}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((s) => (
                <div key={s.slug} className="border rounded-xl p-3 space-y-2.5 bg-background">
                  <div className="flex gap-2">
                    <Input
                      value={s.titleAr}
                      onChange={(e) => handleFieldChange(s.slug, "titleAr", e.target.value)}
                      className="h-8 text-sm text-start flex-1"
                      placeholder="اسم عربي"
                      dir="rtl"
                    />
                    <Input
                      value={s.titleEn}
                      onChange={(e) => handleFieldChange(s.slug, "titleEn", e.target.value)}
                      className="h-8 text-sm flex-1"
                      placeholder="English name"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.image ? (
                      <img src={s.image} className="w-14 h-14 rounded-lg object-cover border" alt="" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center border border-dashed">
                        <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(s.slug, f);
                          e.target.value = "";
                        }}
                      />
                      {uploadingSlug === s.slug ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingSlug === s.slug ? t("action.uploading") : t("action.uploadImage")}
                    </label>
                    <div className="ms-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSave(s.slug)}
                        disabled={savingSlug === s.slug}
                        className={cn(
                          "flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors",
                          savingSlug === s.slug
                            ? "bg-primary/70 text-primary-foreground cursor-wait"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {savingSlug === s.slug ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        {t("action.saveChanges")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.slug)}
                        className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {s.productCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {s.productCount} product{s.productCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors"
          >
            <Plus className="w-4 h-4" /> {t("searchCol.addCard")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Live Preview — Stories ─────────────────────────────────────────────────

function StoriesPreview({ rows }: { rows: StoryRow[] }) {
  const { t } = useT();
  const activeRows = rows.filter((r) => r.status === "active");
  return (
    <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{t("collections.preview.stories")}</span>
      </div>
      <div className="p-3">
        {activeRows.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            {t("collections.stories.noActivePreview")}
          </div>
        ) : (
          <div className="space-y-3">
            {activeRows.map((row) => (
              <div key={row.id}>
                {row.title && (
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {row.title}
                  </p>
                )}
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {row.items.filter((i) => i.status === "active").length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">{t("collections.stories.noItems")}</div>
                  ) : (
                    row.items.filter((i) => i.status === "active").map((item) => (
                      <div key={item.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary bg-muted flex items-center justify-center">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                          )}
                        </div>
                        <span className="text-[9px] text-center max-w-[48px] truncate">{item.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Preview — Quick Sections ──────────────────────────────────────────

const QUICK_META: Record<string, { labelKey: string; color: string; icon: React.ReactNode }> = {
  "super-deals":  { labelKey: "collections.special.superDeals.title",   color: "#E53935", icon: <Zap className="w-4 h-4" /> },
  "brand-deals":  { labelKey: "collections.special.brandDeals.title",   color: "#0274C1", icon: <Tag className="w-4 h-4" /> },
  "trends":       { labelKey: "collections.special.trends.title",       color: "#6A1B9A", icon: <TrendingUp className="w-4 h-4" /> },
  "hot-seller":   { labelKey: "collections.special.hotSeller.title",    color: "#E65100", icon: <Star className="w-4 h-4" /> },
  "gift-wrapping":{ labelKey: "collections.special.giftWrapping.title", color: "#C2185B", icon: <Gift className="w-4 h-4" /> },
};

function QuickPreview({ counts }: { counts: Record<string, number> }) {
  const { t } = useT();
  return (
    <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{t("collections.preview.quickSections")}</span>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {Object.entries(QUICK_META).map(([slug, meta]) => (
          <div
            key={slug}
            className="rounded-xl p-3 flex flex-col gap-1"
            style={{ backgroundColor: `${meta.color}14` }}
          >
            <div className="flex items-center gap-1.5" style={{ color: meta.color }}>
              {meta.icon}
              <span className="text-xs font-semibold">{t(meta.labelKey)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{t("collections.productsCount", { n: counts[slug] ?? 0 })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live Preview — Collections ──────────────────────────────────────────────

function CollectionsPreview({ collections }: { collections: Collection[] }) {
  const { t } = useT();
  return (
    <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{t("collections.preview.collections")}</span>
      </div>
      <div className="p-3 flex gap-3 overflow-x-auto">
        {collections.length === 0 ? (
          <div className="text-xs text-muted-foreground italic py-4 mx-auto">{t("collections.preview.noCollections")}</div>
        ) : (
          collections.map((col) => (
            <div key={col.id} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden border flex items-center justify-center">
                {col.image ? (
                  <img src={col.image} alt={col.title} className="w-full h-full object-cover" />
                ) : (
                  <FolderOpen className="w-5 h-5 text-muted-foreground/50" />
                )}
              </div>
              <span className="text-[9px] text-center max-w-[56px] truncate font-medium">{col.title}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Story Item Edit Dialog ──────────────────────────────────────────────────

function StoryItemEditDialog({
  item, open, onClose, onSaved, onDeleted,
}: {
  item: StoryItem | null; open: boolean;
  onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [title, setTitle]       = useState("");
  const [titleAr, setTitleAr]   = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bgImage, setBgImage]   = useState("");
  const [uploading, setUploading] = useState<"story" | "bg" | null>(null);
  const [saving, setSaving]     = useState(false);
  const storyRef = useRef<HTMLInputElement>(null);
  const bgRef    = useRef<HTMLInputElement>(null);

  const { data: colData } = useQuery<Record<string, unknown>>({
    queryKey: ["col-for-story-item", item?.collectionId],
    queryFn: () => apiFetch(`/admin/collections/${item?.collectionId}`),
    enabled: open && !!item?.collectionId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (item) { setTitle(item.title); setTitleAr(item.titleAr ?? ""); setImageUrl(item.imageUrl); }
  }, [item?.id]);

  useEffect(() => {
    if (colData) setBgImage((colData["backgroundImage"] as string) ?? "");
  }, [colData]);

  const uploadFile = async (file: File, field: "story" | "bg") => {
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST", headers: { Authorization: `Bearer ${adminAuthToken()}` }, body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.data?.url) throw new Error(json.error ?? "Upload failed");
      if (field === "story") setImageUrl(json.data.url);
      else setBgImage(json.data.url);
    } catch (err) {
      toast({ title: t("collections.uploadFailed"), description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(null);
      if (storyRef.current) storyRef.current.value = "";
      if (bgRef.current) bgRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      // PUT auto-creates a collection if one doesn't exist yet, and returns collectionId
      const saved = await apiFetch<{ collectionId?: string | null }>(`/admin/story-items/${item.id}`, {
        method: "PUT", body: JSON.stringify({ title, titleAr, imageUrl }),
      });
      const colId = (saved as any)?.data?.collectionId ?? item.collectionId;
      if (colId) {
        const prevBg = (colData?.["backgroundImage"] as string) ?? "";
        if (bgImage !== prevBg) {
          await apiFetch(`/admin/collections/${colId}`, {
            method: "PUT", body: JSON.stringify({ backgroundImage: bgImage }),
          });
        }
      }
      toast({ title: t("toast.saved") });
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: t("toast.error"), description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !confirm(t("collections.story.deleteConfirm"))) return;
    try {
      await apiFetch(`/admin/story-items/${item.id}`, { method: "DELETE" });
      onDeleted(); onClose();
    } catch (err) {
      toast({ title: t("toast.error"), description: (err as Error).message, variant: "destructive" });
    }
  };

  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>{t("collections.story.editTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Story circle image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t("collections.story.circleImage")}</Label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary bg-muted flex-shrink-0 flex items-center justify-center">
                {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" alt="" />
                  : <ImageIcon className="w-4 h-4 text-muted-foreground/50" />}
              </div>
              <input ref={storyRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "story")} />
              <Button type="button" variant="outline" size="sm" className="flex-1 h-8"
                onClick={() => storyRef.current?.click()} disabled={uploading !== null}>
                {uploading === "story" ? t("collections.uploading") : imageUrl ? t("collections.change") : t("collections.uploadImage")}
              </Button>
            </div>
          </div>
          {/* Bilingual names */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("collections.field.arabicName")}</Label>
              <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)}
                className="h-8 text-sm text-start" dir="rtl" placeholder={t("collections.placeholder.arNameExample")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("collections.field.englishName")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm" placeholder={t("collections.placeholder.enNameExample")} />
            </div>
          </div>
          {/* Collection background image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t("collections.story.bgImage")}</Label>
            <div className="flex items-center gap-3">
              <div className="w-24 h-14 rounded-lg overflow-hidden border bg-muted flex-shrink-0 flex items-center justify-center">
                {bgImage ? <img src={bgImage} className="w-full h-full object-cover" alt="" />
                  : <ImageIcon className="w-4 h-4 text-muted-foreground/50" />}
              </div>
              <input ref={bgRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "bg")} />
              <Button type="button" variant="outline" size="sm" className="flex-1 h-8"
                onClick={() => bgRef.current?.click()} disabled={uploading !== null}>
                {uploading === "bg" ? t("collections.uploading") : bgImage ? t("collections.changeBackground") : t("collections.uploadBackground")}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
            <Trash2 className="w-3.5 h-3.5 me-1" />{t("collections.delete")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>{t("action.cancel")}</Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || uploading !== null}>
              {saving ? t("action.saving") : t("action.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sortable Row ────────────────────────────────────────────────────────────

function SortableStoryRow({
  row, onDelete, onUpdate, onAddItem, onDeleteItem, onUpdateItem,
}: {
  row: StoryRow;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<StoryRow>) => void;
  onAddItem: (rowId: string, data: Partial<StoryItem>) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [titleAr, setTitleArRow] = useState(row.titleAr ?? "");
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", titleAr: "", imageUrl: "" });
  const [editItem, setEditItem] = useState<StoryItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const saveTitle = () => {
    const updates: Partial<StoryRow> = {};
    if (title.trim() !== row.title) updates.title = title;
    if (titleAr.trim() !== (row.titleAr ?? "")) updates.titleAr = titleAr;
    if (Object.keys(updates).length > 0) onUpdate(row.id, updates);
    setEditTitle(false);
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminAuthToken()}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.data?.url) throw new Error(json.error ?? "Upload failed");
      setNewItem((n) => ({ ...n, imageUrl: json.data.url }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addItem = () => {
    if (!newItem.title.trim() && !newItem.titleAr.trim() && !newItem.imageUrl.trim()) return;
    onAddItem(row.id, newItem);
    setNewItem({ title: "", titleAr: "", imageUrl: "" });
    setShowItemForm(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("border rounded-xl bg-card overflow-hidden", isDragging && "shadow-lg")}>
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          {...attributes} {...listeners}
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <button
          type="button"
          className="flex-1 flex items-center gap-2 text-start"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rtl:rotate-180" />}
          {editTitle ? (
            <div className="flex gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={titleAr}
                onChange={(e) => setTitleArRow(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }}
                className="h-7 text-sm text-start flex-1"
                dir="rtl"
                placeholder={t("collections.field.arabicName")}
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }}
                className="h-7 text-sm flex-1"
                autoFocus
                placeholder={t("collections.placeholder.englishName")}
              />
            </div>
          ) : (
            <span
              className="font-medium text-sm flex-1 hover:underline cursor-text"
              onDoubleClick={(e) => { e.stopPropagation(); setEditTitle(true); }}
            >
              {row.titleAr ? `${row.titleAr} / ${row.title}` : row.title || <span className="text-muted-foreground italic">{t("collections.story.untitledRow")}</span>}
            </span>
          )}
          <Badge variant="secondary" className="text-xs ms-auto flex-shrink-0">
            {t("collections.itemsCount", { n: row.items.length })}
          </Badge>
        </button>

        <button
          type="button"
          className="text-muted-foreground hover:text-primary flex-shrink-0"
          onClick={() => onUpdate(row.id, { status: row.status === "active" ? "hidden" : "active" })}
          title={row.status === "active" ? t("collections.hide") : t("collections.show")}
        >
          {row.status === "active" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        <button
          type="button"
          className="text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={() => onDelete(row.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/5">
          {row.items.length === 0 && !showItemForm && (
            <p className="text-xs text-muted-foreground">{t("collections.story.noItemsYet")}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {row.items.map((item) => (
              <div key={item.id} className="flex flex-col items-center gap-1 relative group cursor-pointer"
                onClick={() => setEditItem(item)}>
                <div className={cn(
                  "w-12 h-12 rounded-full overflow-hidden border-2 bg-muted flex items-center justify-center relative",
                  item.status === "active" ? "border-primary" : "border-border opacity-50"
                )}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
                  )}
                  <div className="absolute inset-0 bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil className="w-3 h-3 text-white" />
                  </div>
                </div>
                <span className="text-[9px] max-w-[48px] truncate text-center">
                  {item.titleAr || item.title}
                </span>
              </div>
            ))}
          </div>

          {showItemForm && (
            <div className="border rounded-lg p-3 space-y-2 bg-background">
              <p className="text-xs font-semibold">{t("collections.story.newItem")}</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.field.arabicName")}</Label>
                    <Input className="h-8 text-sm text-start" dir="rtl" placeholder={t("collections.placeholder.arNameExample")}
                      value={newItem.titleAr}
                      onChange={(e) => setNewItem((n) => ({ ...n, titleAr: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.field.english")}</Label>
                    <Input className="h-8 text-sm" placeholder={t("collections.placeholder.summerExample")}
                      value={newItem.title}
                      onChange={(e) => setNewItem((n) => ({ ...n, title: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("collections.story.storyImage")}</Label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  <div className="flex items-center gap-2">
                    {newItem.imageUrl ? (
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border shrink-0">
                        <img src={newItem.imageUrl} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setNewItem((n) => ({ ...n, imageUrl: "" }))}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 bg-muted/30">
                        <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1"
                      onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? t("collections.uploading") : newItem.imageUrl ? t("collections.change") : t("collections.uploadImage")}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-7 text-xs" onClick={addItem} disabled={uploading}>{t("collections.addItem")}</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowItemForm(false)}>{t("action.cancel")}</Button>
              </div>
            </div>
          )}

          {!showItemForm && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowItemForm(true)}>
              <Plus className="w-3.5 h-3.5" /> {t("collections.addItem")}
            </Button>
          )}
        </div>
      )}

      <StoryItemEditDialog
        item={editItem}
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSaved={() => { onUpdateItem(); setEditItem(null); }}
        onDeleted={() => { onUpdateItem(); setEditItem(null); }}
      />
    </div>
  );
}

// ─── Stories Section ─────────────────────────────────────────────────────────

function StoriesSection() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sectionOpen, setSectionOpen] = useState(true);

  const { data: rows = [], isLoading } = useQuery<StoryRow[]>({
    queryKey: ["admin-story-rows"],
    queryFn: () => apiFetch<StoryRow[]>("/admin/story-rows"),
    staleTime: 10_000,
  });

  const [localRows, setLocalRows] = useState<StoryRow[]>([]);
  const displayRows = localRows.length ? localRows : rows;

  const createRow = useMutation({
    mutationFn: (title: string) => apiFetch<StoryRow>("/admin/story-rows", {
      method: "POST", body: JSON.stringify({ title, status: "active" }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-story-rows"] }); setLocalRows([]); },
    onError: (e) => toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" }),
  });

  const updateRow = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      apiFetch(`/admin/story-rows/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-story-rows"] }); setLocalRows([]); },
  });

  const deleteRow = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/story-rows/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-story-rows"] }); setLocalRows([]); },
  });

  const addItem = useMutation({
    mutationFn: (data: object) => apiFetch("/admin/story-items", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-story-rows"] }); setLocalRows([]); },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/story-items/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-story-rows"] }); setLocalRows([]); },
  });

  const refreshItems = () => { qc.invalidateQueries({ queryKey: ["admin-story-rows"] }); setLocalRows([]); };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayRows.findIndex((r) => r.id === active.id);
    const newIndex = displayRows.findIndex((r) => r.id === over.id);
    const reordered = arrayMove(displayRows, oldIndex, newIndex);
    setLocalRows(reordered);
    reordered.forEach((r, i) => {
      if (r.sortOrder !== i + 1) updateRow.mutate({ id: r.id, data: { sortOrder: i + 1 } });
    });
  }, [displayRows, updateRow]);

  const [newRowTitle, setNewRowTitle] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);

  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <BookImage className="w-5 h-5" />
        </div>
        <div className="flex-1 text-start">
          <p className="font-bold text-base">{t("collections.stories.title")}</p>
          <p className="text-xs text-muted-foreground">{t("collections.stories.hint")}</p>
        </div>
        <Badge variant="outline">{t("collections.rowsCount", { n: rows.length })}</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />}
      </button>

      {sectionOpen && (
        <div className="border-t p-5 space-y-5">
          <StoriesPreview rows={displayRows.length ? displayRows : rows} />

          {isLoading ? (
            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={displayRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {displayRows.map((row) => (
                    <SortableStoryRow
                      key={row.id}
                      row={row}
                      onDelete={(id) => deleteRow.mutate(id)}
                      onUpdate={(id, data) => updateRow.mutate({ id, data })}
                      onAddItem={(rowId, data) => addItem.mutate({ rowId, ...data })}
                      onDeleteItem={(id) => deleteItem.mutate(id)}
                      onUpdateItem={refreshItems}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {showAddRow ? (
            <div className="border rounded-xl p-4 space-y-3 bg-muted/10">
              <p className="text-sm font-semibold">{t("collections.story.newRow")}</p>
              <div className="space-y-1">
                <Label className="text-xs">{t("collections.story.rowLabel")}</Label>
                <Input
                  className="h-9"
                  placeholder={t("collections.story.rowTitlePlaceholder")}
                  value={newRowTitle}
                  onChange={(e) => setNewRowTitle(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newRowTitle.trim()) {
                      createRow.mutate(newRowTitle.trim());
                      setNewRowTitle("");
                      setShowAddRow(false);
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button" size="sm"
                  disabled={!newRowTitle.trim() || createRow.isPending}
                  onClick={() => {
                    createRow.mutate(newRowTitle.trim());
                    setNewRowTitle("");
                    setShowAddRow(false);
                  }}
                >
                  {createRow.isPending ? t("collections.adding") : t("collections.story.addRow")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddRow(false)}>{t("action.cancel")}</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="gap-2" onClick={() => setShowAddRow(true)}>
              <Plus className="w-4 h-4" /> {t("collections.story.addStoryRow")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quick Section Panel ─────────────────────────────────────────────────────

type QuickMeta = { titleEn: string; titleAr: string; image: string; backgroundImage: string };

function QuickPanel({ slug, editable }: { slug: string; editable: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [metaForm, setMetaForm] = useState<QuickMeta>({ titleEn: "", titleAr: "", image: "", backgroundImage: "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const [uploadingField, setUploadingField] = useState<"image" | "bg" | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();
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

  useEffect(() => {
    if (metaData) setMetaForm(metaData);
  }, [metaData]);

  const uploadFile = async (file: File, field: "image" | "bg") => {
    setUploadingField(field);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST", headers: { Authorization: `Bearer ${adminAuthToken()}` }, body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.data?.url) throw new Error(json.error ?? "Upload failed");
      setMetaForm((f) => field === "image" ? { ...f, image: json.data.url } : { ...f, backgroundImage: json.data.url });
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
      headers: { Authorization: `Bearer ${adminAuthToken()}` },
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
    <div className="border rounded-xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-accent/20 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
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
          : <Badge variant="secondary" className="text-xs">{t("collections.badge.auto")}</Badge>
        }
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rtl:rotate-180" />}
      </button>

      {open && (
        <div className="border-t p-4 space-y-3">
          {/* ── Meta edit: AR/EN names + images ── */}
          <div className="border rounded-lg overflow-hidden bg-muted/10">
            <button type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-start text-xs font-semibold hover:bg-accent/20 transition-colors"
              onClick={() => setShowMeta((s) => !s)}
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t("collections.quick.namesImages")}</span>
              {showMeta ? <ChevronDown className="w-3 h-3 ms-auto text-muted-foreground" /> : <ChevronRight className="w-3 h-3 ms-auto text-muted-foreground rtl:rotate-180" />}
            </button>
            {showMeta && (
              <div className="border-t p-3 space-y-3 bg-background">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.field.arabicName")}</Label>
                    <Input className="h-8 text-sm text-start" dir="rtl" placeholder={t("collections.placeholder.arNameExample")}
                      value={metaForm.titleAr}
                      onChange={(e) => setMetaForm((f) => ({ ...f, titleAr: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.field.englishName")}</Label>
                    <Input className="h-8 text-sm" placeholder={t("collections.placeholder.brandDealsExample")}
                      value={metaForm.titleEn}
                      onChange={(e) => setMetaForm((f) => ({ ...f, titleEn: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("collections.quick.sectionImage")}</Label>
                    <div className="flex items-center gap-2">
                      {metaForm.image && (
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
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
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
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
              {slug === "super-deals"
                ? t("collections.auto.superDeals")
                : t("collections.auto.unitsSold")}
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
                <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
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

// ─── Quick Sections Section ───────────────────────────────────────────────────

const QUICK_SLOTS = [
  { slug: "super-deals",  editable: false },
  { slug: "brand-deals",  editable: true },
  { slug: "trends",       editable: false },
  { slug: "hot-seller",   editable: true },
  { slug: "gift-wrapping",editable: true },
];

function QuickSectionsSection() {
  const { t } = useT();
  const [sectionOpen, setSectionOpen] = useState(false);
  const { data: counts } = useQuery<Record<string, number>>({
    queryKey: ["admin-quick-counts"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      await Promise.all(QUICK_SLOTS.map(async ({ slug }) => {
        const items = await apiFetch<Product[]>(`/admin/special-collections/${slug}/items`);
        results[slug] = Array.isArray(items) ? items.length : 0;
      }));
      return results;
    },
    staleTime: 30_000,
  });

  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1 text-start">
          <p className="font-bold text-base">{t("collections.quick.title")}</p>
          <p className="text-xs text-muted-foreground">{t("collections.quick.hint")}</p>
        </div>
        <Badge variant="outline">{t("collections.slots")}</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />}
      </button>

      {sectionOpen && (
        <div className="border-t p-5 space-y-4">
          <QuickPreview counts={counts ?? {}} />
          <div className="space-y-2">
            {QUICK_SLOTS.map(({ slug, editable }) => (
              <QuickPanel key={slug} slug={slug} editable={editable} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Regular Collections Section ─────────────────────────────────────────────

function CollectionsSection() {
  const { t } = useT();
  const [sectionOpen, setSectionOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "manual" | "smart">("all");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: cols = [], isLoading } = useQuery<(Collection & { collectionType?: string; titleAr?: string; productsCount?: number })[]>({
    queryKey: ["admin-collections-hub"],
    queryFn: () => apiFetch<(Collection & { collectionType?: string; titleAr?: string; productsCount?: number })[]>("/admin/collections"),
    staleTime: 30_000,
  });

  const deleteCol = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collections-hub"] }),
    onError: (e) => toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" }),
  });

  const filtered = cols.filter((c) => {
    const matchType = typeFilter === "all" || (c.collectionType ?? "manual") === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = q === "" || c.title.toLowerCase().includes(q) || (c.titleAr ?? "").includes(q);
    return matchType && matchSearch;
  });

  const smartCols  = filtered.filter((c) => c.collectionType === "smart");
  const manualCols = filtered.filter((c) => c.collectionType !== "smart");

  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 flex-shrink-0">
          <FolderOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 text-start">
          <p className="font-bold text-base">{t("collections.title")}</p>
          <p className="text-xs text-muted-foreground">{t("collections.section.hint")}</p>
        </div>
        <Badge variant="outline" className="text-xs">{cols.length}</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />}
      </button>

      {sectionOpen && (
        <div className="border-t">
          {/* Toolbar */}
          <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b bg-muted/20">
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={t("collections.searchCollections")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {(["all", "manual", "smart"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTypeFilter(tf)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    typeFilter === tf
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {tf === "all" ? t("common.all") : tf === "smart" ? t("collections.filter.smart") : t("collections.filter.manual")}
                </button>
              ))}
            </div>
            <Link href="/collections/new">
              <Button size="sm" className="h-7 text-xs gap-1 flex-shrink-0">
                <Plus className="w-3.5 h-3.5" /> {t("collections.new")}
              </Button>
            </Link>
          </div>

          <div className="p-5 space-y-5">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("common.loading")}</p>
            )}

            {/* Smart collections group */}
            {smartCols.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5 text-violet-500" />
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">{t("collections.group.smart")}</p>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{smartCols.length}</span>
                </div>
                <div className="grid gap-2">
                  {smartCols.map((col) => (
                    <CollectionRow key={col.id} col={col} onDelete={() => deleteCol.mutate(col.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Manual collections group */}
            {manualCols.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{t("collections.group.manual")}</p>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{manualCols.length}</span>
                </div>
                <div className="grid gap-2">
                  {manualCols.map((col) => (
                    <CollectionRow key={col.id} col={col} onDelete={() => deleteCol.mutate(col.id)} />
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{search ? t("collections.empty.noMatch") : t("collections.empty.noneYet")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CollectionRow({
  col,
  onDelete,
}: {
  col: Collection & { collectionType?: string; titleAr?: string; productsCount?: number };
  onDelete: () => void;
}) {
  const { t } = useT();
  const isSmart = col.collectionType === "smart";
  return (
    <div className="flex items-center gap-3 p-3 border rounded-xl bg-background hover:bg-accent/5 transition-colors">
      {/* Image / icon */}
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
        {col.image
          ? <img src={col.image} alt={col.title} className="w-full h-full object-cover" />
          : <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-semibold text-sm leading-tight truncate max-w-[200px]">{col.title}</p>
          {col.titleAr && <span className="text-xs text-muted-foreground dir-rtl">{col.titleAr}</span>}
          {isSmart
            ? <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5">{t("collections.badge.smart")}</span>
            : <span className="inline-flex text-[10px] font-medium text-muted-foreground bg-muted border rounded px-1.5 py-0.5">{t("collections.badge.manual")}</span>
          }
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {col.productsCount != null && (
            <span className="text-xs text-muted-foreground">{t("collections.productsCount", { n: col.productsCount })}</span>
          )}
          {col.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[220px]">{col.description}</span>
          )}
        </div>
      </div>

      {/* Actions — always visible */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Link href={`/collections/${col.id}/edit`}>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Pencil className="w-3 h-3" /> {t("action.edit")}
          </Button>
        </Link>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Hub ────────────────────────────────────────────────────────────────

export default function CollectionsHub() {
  const { t } = useT();
  return (
    <PageContainer className="max-w-3xl">
      <PageHeader title={t("collections.title")} subtitle={t("collections.hub.subtitle")} />

      <MenuTabBarSection />
      <SearchCollectionsSection />
      <StoriesSection />
      <QuickSectionsSection />
      <CollectionsSection />
    </PageContainer>
  );
}
