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
  ArrowLeft, Plus, Trash2, X, ChevronDown, ChevronRight, ChevronUp,
  BookImage, Pencil, GripVertical, Loader2, Image as ImageIcon, Upload,
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

type StoryItem = {
  id: string; rowId: string; title: string; titleAr: string;
  imageUrl: string; linkUrl: string; sortOrder: number; status: string;
  collectionId?: string | null;
};
type StoryRow = {
  id: string; title: string; titleAr?: string; sortOrder: number;
  status: string; createdAt: string; items: StoryItem[];
};

// ─── Story Preview ───────────────────────────────────────────────────────────

function StoriesPreview({ rows }: { rows: StoryRow[] }) {
  const { t } = useT();
  const allItems = rows.flatMap((r) => r.items ?? []).slice(0, 8);
  if (!allItems.length) return null;
  return (
    <div className="bg-white rounded-2xl border-2 border-border overflow-hidden shadow-sm mb-6">
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

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST", headers: { Authorization: `Bearer ${adminToken()}` }, body: fd,
      });
      const json = (await res.json()) as { data?: { url?: string } };
      if (json.data?.url) setForm((f) => f ? { ...f, imageUrl: json.data!.url! } : f);
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
          {/* Image */}
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
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              {form.imageUrl ? t("collections.change") : t("collections.uploadImage")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("collections.field.arabicName")}</Label>
              <Input className="h-8 text-sm text-start" dir="rtl"
                value={form.titleAr} onChange={(e) => setForm((f) => f ? { ...f, titleAr: e.target.value } : f)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("collections.field.english")}</Label>
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
  const [editItem, setEditItem] = useState<StoryItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", titleAr: "", imageUrl: "", linkUrl: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`${API}/admin/uploads`, {
        method: "POST", headers: { Authorization: `Bearer ${adminToken()}` }, body: fd,
      });
      const json = (await res.json()) as { data?: { url?: string } };
      if (json.data?.url) setNewItem((n) => ({ ...n, imageUrl: json.data!.url! }));
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
    <div ref={setNodeRef} style={style} className="border rounded-xl overflow-hidden bg-background">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20">
        <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold">{row.title}</p>
          {row.titleAr && <p className="text-xs text-muted-foreground">{row.titleAr}</p>}
        </div>
        <Badge variant="outline" className="text-xs">{row.items?.length ?? 0} items</Badge>
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => onDelete(row.id)}
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="border-t p-3 space-y-3">
          {/* Items grid */}
          {(row.items ?? []).length > 0 && (
            <div className="flex flex-wrap gap-3">
              {row.items.map((item) => (
                <button
                  key={item.id} type="button"
                  onClick={() => setEditItem(item)}
                  className="flex flex-col items-center gap-1 group"
                >
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

          {/* Add item form */}
          {showItemForm && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/10">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("collections.field.arabicName")}</Label>
                  <Input className="h-8 text-sm text-start" dir="rtl" placeholder={t("collections.placeholder.arNameExample")}
                    value={newItem.titleAr} onChange={(e) => setNewItem((n) => ({ ...n, titleAr: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("collections.field.english")}</Label>
                  <Input className="h-8 text-sm" placeholder={t("collections.placeholder.summerExample")}
                    value={newItem.title} onChange={(e) => setNewItem((n) => ({ ...n, title: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("collections.story.storyImage")} <span className="text-muted-foreground">(دائري)</span></Label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
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
        <div className="border rounded-xl p-4 space-y-3 bg-muted/10 mt-3">
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
        <Button type="button" variant="outline" className="gap-2 mt-3" onClick={() => setShowAddRow(true)}>
          <Plus className="w-4 h-4" /> {t("collections.story.addStoryRow")}
        </Button>
      )}
    </PageContainer>
  );
}
