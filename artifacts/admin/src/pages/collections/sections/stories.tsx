import { useState, useCallback, useRef } from "react";
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
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, X, ChevronDown, ChevronRight, CheckCircle2,
  BookImage, Pencil, GripVertical, Loader2, Image as ImageIcon, Upload,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData(); fd.append("image", file);
  const res = await fetch(`${API}/admin/uploads`, {
    method: "POST", headers: { Authorization: `Bearer ${adminToken()}` }, body: fd,
  });
  const json = (await res.json()) as { data?: { url?: string } };
  if (!json.data?.url) throw new Error("Upload failed");
  return json.data.url;
}

type StoryItem = {
  id: string; rowId: string; title: string; titleAr: string;
  imageUrl: string; linkUrl: string; sortOrder: number; status: string;
  collectionId?: string | null;
};

type StoryRow = {
  id: string; title: string; titleAr: string;
  descriptionEn: string; descriptionAr: string;
  backgroundImage: string; image: string;
  conditionType: string; conditionValue: string;
  sortOrder: number; status: string; createdAt: string;
  items: StoryItem[];
};

// ─── Story Preview ───────────────────────────────────────────────────────────

function StoriesPreview({ rows }: { rows: StoryRow[] }) {
  const allItems = rows.flatMap((r) => r.items ?? []).slice(0, 8);
  if (!allItems.length) return null;
  return (
    <div className="bg-card rounded-2xl border overflow-hidden shadow-sm mb-6">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        <BookImage className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
      </div>
      <div className="px-4 py-3 flex gap-3 overflow-x-auto">
        {allItems.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-14">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/30 bg-muted">
              {item.imageUrl
                ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/30" /></div>}
            </div>
            <p className="text-[9px] text-center text-muted-foreground truncate w-full">{item.titleAr || item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Story Item Edit Dialog ───────────────────────────────────────────────────

function StoryItemEditDialog({
  item, open, onClose, onSaved, onDeleted,
}: {
  item: StoryItem | null; open: boolean;
  onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [form, setForm] = useState<StoryItem | null>(item);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback((it: StoryItem | null) => setForm(it ? { ...it } : null), []);
  if (open && item && form?.id !== item?.id) reset(item);
  if (!form) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm((f) => f ? { ...f, imageUrl: url } : f);
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/story-items/${form.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title, titleAr: form.titleAr,
          imageUrl: form.imageUrl, linkUrl: form.linkUrl,
          status: form.status, collectionId: form.collectionId || null,
        }),
      });
      onSaved();
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(t("collections.story.deleteItemConfirm"))) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/story-items/${form.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setDeleting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{t("collections.story.editItem")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted flex-shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {form.imageUrl
                ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Upload className="w-5 h-5 text-muted-foreground/40" /></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              {form.imageUrl ? t("collections.change") : t("collections.uploadImage")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">الاسم (AR)</Label>
              <Input className="h-8 text-sm" dir="rtl"
                value={form.titleAr} onChange={(e) => setForm((f) => f ? { ...f, titleAr: e.target.value } : f)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name (EN)</Label>
              <Input className="h-8 text-sm"
                value={form.title} onChange={(e) => setForm((f) => f ? { ...f, title: e.target.value } : f)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("collections.story.linkUrl")}</Label>
            <Input className="h-8 text-sm"
              value={form.linkUrl} onChange={(e) => setForm((f) => f ? { ...f, linkUrl: e.target.value } : f)}
              placeholder="https://…" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={save} disabled={saving || uploading}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} {t("action.save")}
            </Button>
            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={del} disabled={deleting}>
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row Metadata Edit Panel ─────────────────────────────────────────────────

function RowMetaPanel({
  row, onUpdate,
}: {
  row: StoryRow;
  onUpdate: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: row.title, titleAr: row.titleAr,
    descriptionEn: row.descriptionEn, descriptionAr: row.descriptionAr,
    backgroundImage: row.backgroundImage, image: row.image,
    conditionType: row.conditionType || "manual",
    conditionValue: row.conditionValue,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<"image" | "bg" | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File, field: "image" | "bg") => {
    setUploadingImg(field);
    try {
      const url = await uploadFile(file);
      setForm((f) => field === "image" ? { ...f, image: url } : { ...f, backgroundImage: url });
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploadingImg(null);
      if (imgRef.current) imgRef.current.value = "";
      if (bgRef.current) bgRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/story-rows/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title, titleAr: form.titleAr,
          descriptionEn: form.descriptionEn, descriptionAr: form.descriptionAr,
          backgroundImage: form.backgroundImage, image: form.image,
          conditionType: form.conditionType, conditionValue: form.conditionValue,
        }),
      });
      setSaved(true);
      toast({ title: t("toast.saved") });
      setTimeout(() => setSaved(false), 3000);
      onUpdate();
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const CONDITION_OPTIONS = [
    { value: "manual",  label: "Manual" },
    { value: "tag",     label: "By Tag" },
    { value: "all",     label: "All Products" },
  ];

  return (
    <div className="border-t p-3 bg-muted/5 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Settings2 className="w-3.5 h-3.5" /> Row Settings
      </p>

      {/* Names */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] mb-1 block">الاسم (AR)</Label>
          <Input value={form.titleAr} onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))}
            className="h-8 text-sm" dir="rtl" placeholder="مجموعة ستوريات" />
        </div>
        <div>
          <Label className="text-[11px] mb-1 block">Name (EN)</Label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="h-8 text-sm" placeholder="Story row name" />
        </div>
      </div>

      {/* Descriptions */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] mb-1 block">الوصف (AR)</Label>
          <Input value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
            className="h-8 text-sm" dir="rtl" placeholder="وصف يظهر للعميل" />
        </div>
        <div>
          <Label className="text-[11px] mb-1 block">Description (EN)</Label>
          <Input value={form.descriptionEn} onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
            className="h-8 text-sm" placeholder="Shown to customers" />
        </div>
      </div>

      {/* Images */}
      <div className="grid grid-cols-2 gap-2">
        {/* Cover image (circle preview) */}
        <div>
          <Label className="text-[11px] mb-1 block">صورة الستوري (دائري)</Label>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted flex-shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => imgRef.current?.click()}
            >
              {form.image
                ? <img src={form.image} alt="" className="w-full h-full object-cover" />
                : uploadingImg === "image"
                ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /></div>
                : <div className="w-full h-full flex items-center justify-center"><Upload className="w-3 h-3 text-muted-foreground/50" /></div>}
            </div>
            <input ref={imgRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "image")} />
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1"
              onClick={() => imgRef.current?.click()} disabled={uploadingImg !== null}>
              {form.image ? t("collections.change") : t("collections.uploadImage")}
            </Button>
          </div>
        </div>

        {/* Background image */}
        <div>
          <Label className="text-[11px] mb-1 block">صورة الخلفية</Label>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted flex-shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => bgRef.current?.click()}
            >
              {form.backgroundImage
                ? <img src={form.backgroundImage} alt="" className="w-full h-full object-cover" />
                : uploadingImg === "bg"
                ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /></div>
                : <div className="w-full h-full flex items-center justify-center"><Upload className="w-3 h-3 text-muted-foreground/50" /></div>}
            </div>
            <input ref={bgRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "bg")} />
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1"
              onClick={() => bgRef.current?.click()} disabled={uploadingImg !== null}>
              {form.backgroundImage ? t("collections.change") : t("collections.uploadImage")}
            </Button>
          </div>
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <Label className="text-[11px]">مصدر المنتجات</Label>
        <div className="flex gap-2">
          {CONDITION_OPTIONS.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => setForm((f) => ({ ...f, conditionType: opt.value }))}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                form.conditionType === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {form.conditionType === "tag" && (
          <div>
            <Label className="text-[11px] mb-1 block">Tag</Label>
            <Input value={form.conditionValue}
              onChange={(e) => setForm((f) => ({ ...f, conditionValue: e.target.value }))}
              className="h-8 text-sm" placeholder="e.g. summer, sale, women" />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={save} disabled={saving || uploadingImg !== null}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> :
           saved  ? <CheckCircle2 className="w-3 h-3" /> : null}
          {saving ? t("action.saving") : saved ? t("toast.saved") : t("action.save")}
        </Button>
      </div>
    </div>
  );
}

// ─── Sortable Story Row ───────────────────────────────────────────────────────

function SortableStoryRow({
  row, onDelete, onUpdate, onAddItem, onDeleteItem, onUpdateItem,
}: {
  row: StoryRow;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: object) => void;
  onAddItem: (rowId: string, data: object) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const [open, setOpen] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [editItem, setEditItem] = useState<StoryItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", titleAr: "", imageUrl: "", linkUrl: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setNewItem((n) => ({ ...n, imageUrl: url }));
    } catch (e) {
      toast({ title: t("toast.error"), description: (e as Error).message, variant: "destructive" });
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const addItem = () => {
    if (!newItem.titleAr && !newItem.title) return;
    onAddItem(row.id, {
      title: newItem.title, titleAr: newItem.titleAr,
      imageUrl: newItem.imageUrl, linkUrl: newItem.linkUrl,
      status: "active", sortOrder: (row.items?.length ?? 0) + 1,
    });
    setNewItem({ title: "", titleAr: "", imageUrl: "", linkUrl: "" });
    setShowItemForm(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-2xl overflow-hidden bg-card">
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/10">
        <button type="button" {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Cover image preview (circle) */}
        {row.image ? (
          <div className="w-8 h-8 rounded-full overflow-hidden border flex-shrink-0">
            <img src={row.image} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full border border-dashed bg-muted flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/30" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{row.titleAr || row.title}</p>
          {row.descriptionAr && (
            <p className="text-xs text-muted-foreground truncate">{row.descriptionAr}</p>
          )}
        </div>

        <Badge variant="outline" className="text-xs flex-shrink-0">{row.items?.length ?? 0} items</Badge>

        {/* Settings toggle */}
        <button type="button" onClick={() => { setShowMeta((s) => !s); if (!open) setOpen(true); }}
          className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
            showMeta ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        {/* Expand items */}
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <button type="button" onClick={() => onDelete(row.id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metadata edit panel */}
      {showMeta && (
        <RowMetaPanel row={row} onUpdate={onUpdateItem} />
      )}

      {/* Items panel */}
      {open && !showMeta && (
        <div className="border-t p-3 space-y-3">
          {(row.items ?? []).length > 0 && (
            <div className="flex flex-wrap gap-3">
              {row.items.map((item) => (
                <button key={item.id} type="button" onClick={() => setEditItem(item)}
                  className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary/40 transition-colors bg-muted relative">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/30" /></div>}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                      <Pencil className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate w-12 text-center">{item.titleAr || item.title}</p>
                </button>
              ))}
            </div>
          )}

          {showItemForm && (
            <div className="border rounded-xl p-3 space-y-2 bg-muted/10">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">الاسم (AR)</Label>
                  <Input className="h-8 text-sm mt-1" dir="rtl"
                    value={newItem.titleAr} onChange={(e) => setNewItem((n) => ({ ...n, titleAr: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Name (EN)</Label>
                  <Input className="h-8 text-sm mt-1"
                    value={newItem.title} onChange={(e) => setNewItem((n) => ({ ...n, title: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">صورة الستوري <span className="text-muted-foreground">(دائري)</span></Label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                <div className="flex items-center gap-2">
                  {newItem.imageUrl ? (
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border flex-shrink-0">
                      <img src={newItem.imageUrl} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setNewItem((n) => ({ ...n, imageUrl: "" }))}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0 bg-muted/30">
                      <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-1"
                    onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? t("collections.uploading") : newItem.imageUrl ? t("collections.change") : t("collections.uploadImage")}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-7 text-xs" onClick={addItem} disabled={uploading}>
                  {t("collections.addItem")}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowItemForm(false)}>
                  {t("action.cancel")}
                </Button>
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
        item={editItem} open={!!editItem}
        onClose={() => setEditItem(null)}
        onSaved={() => { onUpdateItem(); setEditItem(null); }}
        onDeleted={() => { onUpdateItem(); setEditItem(null); }}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StoriesPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();

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

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-story-rows"] }); setLocalRows([]); };

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
    <PageContainer className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/collections">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("action.back")}
          </button>
        </Link>
      </div>

      <PageHeader title={t("collections.stories.title")} subtitle={t("collections.stories.hint")} />

      <StoriesPreview rows={displayRows.length ? displayRows : rows} />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {displayRows.map((row) => (
                <SortableStoryRow
                  key={row.id} row={row}
                  onDelete={(id) => deleteRow.mutate(id)}
                  onUpdate={(id, data) => updateRow.mutate({ id, data })}
                  onAddItem={(rowId, data) => addItem.mutate({ rowId, ...data })}
                  onDeleteItem={(id) => deleteItem.mutate(id)}
                  onUpdateItem={refresh}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showAddRow ? (
        <div className="border rounded-2xl p-4 space-y-3 bg-muted/10 mt-3">
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
                  setNewRowTitle(""); setShowAddRow(false);
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={!newRowTitle.trim() || createRow.isPending}
              onClick={() => { createRow.mutate(newRowTitle.trim()); setNewRowTitle(""); setShowAddRow(false); }}>
              {createRow.isPending ? t("collections.adding") : t("collections.story.addRow")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddRow(false)}>{t("action.cancel")}</Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="gap-2 mt-3 rounded-xl" onClick={() => setShowAddRow(true)}>
          <Plus className="w-4 h-4" /> {t("collections.story.addStoryRow")}
        </Button>
      )}
    </PageContainer>
  );
}
