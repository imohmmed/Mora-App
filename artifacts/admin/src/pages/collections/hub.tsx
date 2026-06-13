import { useState, useCallback } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  GripVertical, Plus, Trash2, X, Search, ChevronDown, ChevronRight,
  BookImage, Layers, Zap, Tag, TrendingUp, Star, Eye, EyeOff, Image as ImageIcon,
  FolderOpen, Pencil, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

// ─── Types ─────────────────────────────────────────────────────────────────

type StoryItem = {
  id: string; rowId: string; title: string; imageUrl: string;
  linkUrl: string; sortOrder: number; status: string;
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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json() as { data: T; error?: string };
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  return json.data;
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
  "super-deals": { label: "Super Deals", color: "#E53935", icon: <Zap className="w-4 h-4" /> },
  "brand-deals": { label: "Brand Deals", color: "#0274C1", icon: <Tag className="w-4 h-4" /> },
  "trends":      { label: "Trends",      color: "#6A1B9A", icon: <TrendingUp className="w-4 h-4" /> },
  "hot-seller":  { label: "Hot Seller",  color: "#E65100", icon: <Star className="w-4 h-4" /> },
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

// ─── Sortable Row ────────────────────────────────────────────────────────────

function SortableStoryRow({
  row, onDelete, onUpdate, onAddItem, onDeleteItem,
}: {
  row: StoryRow;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<StoryRow>) => void;
  onAddItem: (rowId: string, data: Partial<StoryItem>) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", imageUrl: "", linkUrl: "" });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const saveTitle = () => {
    if (title.trim() !== row.title) onUpdate(row.id, { title });
    setEditTitle(false);
  };

  const addItem = () => {
    if (!newItem.title.trim() && !newItem.imageUrl.trim()) return;
    onAddItem(row.id, newItem);
    setNewItem({ title: "", imageUrl: "", linkUrl: "" });
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
              <div key={item.id} className="flex flex-col items-center gap-1 relative group">
                <div className={cn(
                  "w-12 h-12 rounded-full overflow-hidden border-2 bg-muted flex items-center justify-center",
                  item.status === "active" ? "border-primary" : "border-border opacity-50"
                )}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
                  )}
                </div>
                <span className="text-[9px] max-w-[48px] truncate text-center">{item.title}</span>
                <button
                  type="button"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={() => onDeleteItem(item.id)}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>

          {showItemForm && (
            <div className="border rounded-lg p-3 space-y-2 bg-background">
              <p className="text-xs font-semibold">New Story Item</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input className="h-8 text-sm" placeholder="e.g. Summer" value={newItem.title}
                    onChange={(e) => setNewItem((n) => ({ ...n, title: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Image URL</Label>
                  <Input className="h-8 text-sm" placeholder="https://..." value={newItem.imageUrl}
                    onChange={(e) => setNewItem((n) => ({ ...n, imageUrl: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Link URL (optional)</Label>
                  <Input className="h-8 text-sm" placeholder="https://..." value={newItem.linkUrl}
                    onChange={(e) => setNewItem((n) => ({ ...n, linkUrl: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="h-7 text-xs" onClick={addItem}>Add Item</Button>
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

function QuickPanel({ slug, editable }: { slug: string; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const meta = QUICK_META[slug]!;

  const { data: items = [] } = useQuery<Product[]>({
    queryKey: ["admin-special-col", slug],
    queryFn: () => apiFetch<Product[]>(`/admin/special-collections/${slug}/items`),
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["admin-all-products"],
    queryFn: () => fetch(`${API}/admin/products?limit=200`, { credentials: "include" })
      .then((r) => r.json()).then((j: { data: Product[] }) => j.data),
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
  { slug: "super-deals", editable: false },
  { slug: "brand-deals", editable: true },
  { slug: "trends",      editable: false },
  { slug: "hot-seller",  editable: true },
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

      <StoriesSection />
      <QuickSectionsSection />
      <CollectionsSection />
    </div>
  );
}
