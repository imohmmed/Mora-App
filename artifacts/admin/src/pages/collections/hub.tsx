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
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

// ─── Types ─────────────────────────────────────────────────────────────────

type StoryItem = {
  id: string; rowId: string; title: string; titleAr: string; imageUrl: string;
  linkUrl: string; sortOrder: number; status: string; collectionId?: string | null;
};
type StoryRow = {
  id: string; title: string; sortOrder: number; status: string;
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
      toast({ title: "Saved ✓", description: "Menu tabs updated. Changes are live." });
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 flex-shrink-0">
          <LayoutList className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-base">Menu Tab Bar</p>
          <p className="text-xs text-muted-foreground">التابات أعلى الهوم سكرين — top of app home screen</p>
        </div>
        <Badge variant="outline">{tabs.length} tabs</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {sectionOpen && (
        <div className="border-t p-5 space-y-4">
          {/* Live preview */}
          <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
            <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Live preview — home tab bar</span>
            </div>
            <div className="px-4 py-3 flex gap-4 overflow-x-auto">
              {tabs.map((tab, i) => (
                <div key={tab.id} className={cn("flex flex-col items-center gap-0.5 pb-1.5 flex-shrink-0 relative", i === 0 && "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground after:rounded-full")}>
                  {tab.arabicLabel && <span className="text-[11px] font-bold leading-tight">{tab.arabicLabel}</span>}
                  <span className={cn("text-[9px] leading-tight", tab.arabicLabel ? "text-muted-foreground" : "text-[11px] font-bold text-foreground")}>{tab.label}</span>
                </div>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[auto_1fr_1fr_10rem_auto] gap-2 px-1 pb-1">
                <div />
                <span className="text-xs font-medium text-muted-foreground">اسم عربي</span>
                <span className="text-xs font-medium text-muted-foreground">English</span>
                <span className="text-xs font-medium text-muted-foreground">Filter</span>
                <div />
              </div>
              {tabs.map((tab, i) => (
                <div key={tab.id} className="grid grid-cols-[auto_1fr_1fr_10rem_auto] items-center gap-2 p-2 border rounded-xl bg-background">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40" />

                  <Input
                    value={tab.arabicLabel ?? ""}
                    onChange={(e) => update(i, "arabicLabel", e.target.value)}
                    className="h-8 text-sm text-right font-medium"
                    placeholder="مثال: نساء"
                    dir="rtl"
                  />

                  <Input
                    value={tab.label}
                    onChange={(e) => update(i, "label", e.target.value.toUpperCase())}
                    className="h-8 text-sm font-mono font-semibold"
                    placeholder="WOMEN"
                  />

                  <Select value={tab.filterType} onValueChange={(v) => {
                    update(i, "filterType", v);
                    if (v === "gender" && !tab.filterValue) update(i, "filterValue", "women");
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="gender">Gender ♀♂</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="sale">Sale / Deals</SelectItem>
                      <SelectItem value="foryou">For You ✦</SelectItem>
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
                            <SelectItem value="women">Women</SelectItem>
                            <SelectItem value="men">Men</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={tab.filterValue ?? ""}
                          onChange={(e) => update(i, "filterValue", e.target.value)}
                          className="h-8 w-20 text-xs"
                          placeholder="beauty"
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
              <Plus className="w-4 h-4" /> Add Tab
            </button>
            <button type="button" onClick={saveAll} disabled={saving}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors",
                saving ? "bg-primary/70 text-primary-foreground cursor-wait" :
                saved  ? "bg-green-500/10 text-green-700 border border-green-200" :
                         "bg-primary text-primary-foreground hover:bg-primary/90"
              )}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
               saved  ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
                        "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live Preview — Stories ─────────────────────────────────────────────────

function StoriesPreview({ rows }: { rows: StoryRow[] }) {
  const activeRows = rows.filter((r) => r.status === "active");
  return (
    <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Live preview — Stories</span>
      </div>
      <div className="p-3">
        {activeRows.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No active stories to preview
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
                    <div className="text-xs text-muted-foreground italic">No items</div>
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

const QUICK_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  "super-deals":  { label: "Super Deals",  color: "#E53935", icon: <Zap className="w-4 h-4" /> },
  "brand-deals":  { label: "Brand Deals",  color: "#0274C1", icon: <Tag className="w-4 h-4" /> },
  "trends":       { label: "Trends",       color: "#6A1B9A", icon: <TrendingUp className="w-4 h-4" /> },
  "hot-seller":   { label: "Hot Seller",   color: "#E65100", icon: <Star className="w-4 h-4" /> },
  "gift-wrapping":{ label: "Gift Wrapping",color: "#C2185B", icon: <Gift className="w-4 h-4" /> },
};

function QuickPreview({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Live preview — Quick Sections</span>
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
              <span className="text-xs font-semibold">{meta.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{counts[slug] ?? 0} products</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live Preview — Collections ──────────────────────────────────────────────

function CollectionsPreview({ collections }: { collections: Collection[] }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Live preview — Collections</span>
      </div>
      <div className="p-3 flex gap-3 overflow-x-auto">
        {collections.length === 0 ? (
          <div className="text-xs text-muted-foreground italic py-4 mx-auto">No collections yet</div>
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
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
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
      await apiFetch(`/admin/story-items/${item.id}`, {
        method: "PUT", body: JSON.stringify({ title, titleAr, imageUrl }),
      });
      if (item.collectionId) {
        const prevBg = (colData?.["backgroundImage"] as string) ?? "";
        if (bgImage !== prevBg) {
          await apiFetch(`/admin/collections/${item.collectionId}`, {
            method: "PUT", body: JSON.stringify({ backgroundImage: bgImage }),
          });
        }
      }
      toast({ title: "Saved ✓" });
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !confirm("Delete this story item?")) return;
    try {
      await apiFetch(`/admin/story-items/${item.id}`, { method: "DELETE" });
      onDeleted(); onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>تعديل الستوري</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Story circle image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">صورة الستوري (الدائرة)</Label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary bg-muted flex-shrink-0 flex items-center justify-center">
                {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" alt="" />
                  : <ImageIcon className="w-4 h-4 text-muted-foreground/50" />}
              </div>
              <input ref={storyRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "story")} />
              <Button type="button" variant="outline" size="sm" className="flex-1 h-8"
                onClick={() => storyRef.current?.click()} disabled={uploading !== null}>
                {uploading === "story" ? "جاري الرفع..." : imageUrl ? "تغيير" : "رفع صورة"}
              </Button>
            </div>
          </div>
          {/* Bilingual names */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">اسم عربي</Label>
              <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)}
                className="h-8 text-sm text-right" dir="rtl" placeholder="أحذية مورا" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">English Name</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm" placeholder="Mora Shoes" />
            </div>
          </div>
          {/* Collection background image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              صورة خلفية القسم
              {!item.collectionId && <span className="text-muted-foreground font-normal mr-2">(لا يوجد قسم مرتبط)</span>}
            </Label>
            {item.collectionId && (
              <div className="flex items-center gap-3">
                <div className="w-24 h-14 rounded-lg overflow-hidden border bg-muted flex-shrink-0 flex items-center justify-center">
                  {bgImage ? <img src={bgImage} className="w-full h-full object-cover" alt="" />
                    : <ImageIcon className="w-4 h-4 text-muted-foreground/50" />}
                </div>
                <input ref={bgRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "bg")} />
                <Button type="button" variant="outline" size="sm" className="flex-1 h-8"
                  onClick={() => bgRef.current?.click()} disabled={uploading !== null}>
                  {uploading === "bg" ? "جاري الرفع..." : bgImage ? "تغيير الخلفية" : "رفع خلفية"}
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />حذف
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>إلغاء</Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || uploading !== null}>
              {saving ? "جاري الحفظ..." : "حفظ"}
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
  const [open, setOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", titleAr: "", imageUrl: "" });
  const [editItem, setEditItem] = useState<StoryItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const saveTitle = () => {
    if (title.trim() !== row.title) onUpdate(row.id, { title });
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
          className="flex-1 flex items-center gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          {editTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }}
              className="h-7 text-sm"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="font-medium text-sm flex-1 hover:underline cursor-text"
              onDoubleClick={(e) => { e.stopPropagation(); setEditTitle(true); }}
            >
              {row.title || <span className="text-muted-foreground italic">Untitled row</span>}
            </span>
          )}
          <Badge variant="secondary" className="text-xs ml-auto flex-shrink-0">
            {row.items.length} items
          </Badge>
        </button>

        <button
          type="button"
          className="text-muted-foreground hover:text-primary flex-shrink-0"
          onClick={() => onUpdate(row.id, { status: row.status === "active" ? "hidden" : "active" })}
          title={row.status === "active" ? "Hide" : "Show"}
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
            <p className="text-xs text-muted-foreground">No items yet. Add story items below.</p>
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
              <p className="text-xs font-semibold">New Story Item</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">اسم عربي</Label>
                    <Input className="h-8 text-sm text-right" dir="rtl" placeholder="أحذية مورا"
                      value={newItem.titleAr}
                      onChange={(e) => setNewItem((n) => ({ ...n, titleAr: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">English</Label>
                    <Input className="h-8 text-sm" placeholder="e.g. Summer"
                      value={newItem.title}
                      onChange={(e) => setNewItem((n) => ({ ...n, title: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">صورة الستوري</Label>
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
                      {uploading ? "جاري الرفع…" : newItem.imageUrl ? "تغيير" : "رفع صورة"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-7 text-xs" onClick={addItem} disabled={uploading}>Add Item</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowItemForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {!showItemForm && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowItemForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Item
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
    onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
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
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <BookImage className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-base">Stories</p>
          <p className="text-xs text-muted-foreground">الدوائر تحت البانر — Drag to reorder rows</p>
        </div>
        <Badge variant="outline">{rows.length} rows</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {sectionOpen && (
        <div className="border-t p-5 space-y-5">
          <StoriesPreview rows={displayRows.length ? displayRows : rows} />

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
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
              <p className="text-sm font-semibold">New Story Row</p>
              <div className="space-y-1">
                <Label className="text-xs">Row Label (e.g. "New Arrivals")</Label>
                <Input
                  className="h-9"
                  placeholder="Enter a title for this row..."
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
                  {createRow.isPending ? "Adding..." : "Add Row"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddRow(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="gap-2" onClick={() => setShowAddRow(true)}>
              <Plus className="w-4 h-4" /> Add Story Row
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
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
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
      toast({ title: "Saved ✓" }); setShowMeta(false);
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
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
    onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
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
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          {meta.icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{meta.label}</p>
          <p className="text-xs text-muted-foreground">{items.length} products</p>
        </div>
        {editable
          ? <Badge variant="outline" className="text-xs">Manual</Badge>
          : <Badge variant="secondary" className="text-xs">Auto</Badge>
        }
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t p-4 space-y-3">
          {/* ── Meta edit: AR/EN names + images ── */}
          <div className="border rounded-lg overflow-hidden bg-muted/10">
            <button type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-accent/20 transition-colors"
              onClick={() => setShowMeta((s) => !s)}
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>الأسماء والصور</span>
              {showMeta ? <ChevronDown className="w-3 h-3 ml-auto text-muted-foreground" /> : <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />}
            </button>
            {showMeta && (
              <div className="border-t p-3 space-y-3 bg-background">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">اسم عربي</Label>
                    <Input className="h-8 text-sm text-right" dir="rtl" placeholder="أحذية مورا"
                      value={metaForm.titleAr}
                      onChange={(e) => setMetaForm((f) => ({ ...f, titleAr: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">English Name</Label>
                    <Input className="h-8 text-sm" placeholder="Brand Deals"
                      value={metaForm.titleEn}
                      onChange={(e) => setMetaForm((f) => ({ ...f, titleEn: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">صورة القسم</Label>
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
                        {uploadingField === "image" ? "..." : "رفع"}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">صورة الخلفية</Label>
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
                        {uploadingField === "bg" ? "..." : "رفع"}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowMeta(false)}>إلغاء</Button>
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={saveMeta} disabled={savingMeta || uploadingField !== null}>
                    {savingMeta ? "حفظ..." : "حفظ"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!editable && (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              {slug === "super-deals"
                ? "Auto-computed — products with ≥25% discount, sorted by discount %."
                : "Auto-computed — products sorted by units sold (last 15 days)."}
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
                <Plus className="w-3.5 h-3.5" /> Add Product
              </Button>

              {showPicker && (
                <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products..." className="h-8 text-sm" autoFocus />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPicker(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filtered.slice(0, 30).map((p) => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                        onClick={() => addItem.mutate(p.id)}
                      >
                        <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                          {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
                        </div>
                        <p className="text-sm font-medium truncate flex-1">{p.title}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{(p.price ?? 0).toLocaleString()} IQD</span>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-3">No products found</p>
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
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-base">Quick Sections</p>
          <p className="text-xs text-muted-foreground">الأقسام السريعة الـ4 — under the stories</p>
        </div>
        <Badge variant="outline">4 slots</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
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
  const [sectionOpen, setSectionOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: cols = [] } = useQuery<(Collection & { collectionType?: string })[]>({
    queryKey: ["admin-collections-hub"],
    queryFn: () => apiFetch<(Collection & { collectionType?: string })[]>("/admin/collections"),
    staleTime: 30_000,
  });

  const deleteCol = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collections-hub"] }),
    onError: (e) => toast({ title: "Error", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <div className="border rounded-2xl overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/20 transition-colors"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 flex-shrink-0">
          <FolderOpen className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-base">Collections</p>
          <p className="text-xs text-muted-foreground">الكولكشنات العادية — group products together</p>
        </div>
        <Badge variant="outline">{cols.length}</Badge>
        {sectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {sectionOpen && (
        <div className="border-t p-5 space-y-4">
          <CollectionsPreview collections={cols} />

          <div className="space-y-2">
            {cols.map((col) => (
              <div key={col.id} className="flex items-center gap-3 p-3 border rounded-xl bg-background hover:bg-accent/10 transition-colors group">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {col.image
                    ? <img src={col.image} alt={col.title} className="w-full h-full object-cover" />
                    : <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{col.title}</p>
                    {col.collectionType === "smart" ? (
                      <Badge variant="secondary" className="text-[10px] gap-0.5 flex-shrink-0">
                        <Wand2 className="w-2.5 h-2.5" /> Smart
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">Manual</Badge>
                    )}
                  </div>
                  {col.description && (
                    <p className="text-xs text-muted-foreground truncate">{col.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/collections/${col.id}/edit`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteCol.mutate(col.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {cols.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No collections yet.</p>
            )}
          </div>

          <Link href="/collections/new">
            <Button type="button" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> New Collection
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main Hub ────────────────────────────────────────────────────────────────

export default function CollectionsHub() {
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
        <p className="text-muted-foreground mt-1">
          Manage all 3 types of content sections shown on the store and app.
        </p>
      </div>

      <MenuTabBarSection />
      <StoriesSection />
      <QuickSectionsSection />
      <CollectionsSection />
    </div>
  );
}
