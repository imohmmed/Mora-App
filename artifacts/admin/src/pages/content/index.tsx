import { useAdminListBlogPosts, useAdminListMenus } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, List as ListIcon, Plus, Boxes, File, ChevronRight, HardDrive, Image as ImageIcon, Pencil, Trash2, X, Layers, ChevronDown, ChevronUp, GripVertical, Settings2, Star } from "lucide-react";
import { format } from "date-fns";
import { useSearch, useLocation } from "wouter";
import { useState } from "react";

const AUTH_HEADER = { Authorization: "Bearer dev-token-mora", "Content-Type": "application/json" };

type MetaobjectEntry = { id: string; type: string; fields: Record<string, string> };
type FileEntry = { id: string; filename: string; size: number; mimeType: string; url: string; createdAt: string };

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  bgColor: string;
  linkUrl: string;
  hasButton: boolean;
  buttonText: string;
  buttonAlign: string;
  sortOrder: number;
  status: string;
  createdAt: string;
};

const EMPTY_BANNER: Omit<Banner, "id" | "createdAt" | "sortOrder"> = {
  title: "",
  subtitle: "",
  imageUrl: "",
  bgColor: "#0274C1",
  linkUrl: "",
  hasButton: true,
  buttonText: "SHOP NOW",
  buttonAlign: "left",
  status: "active",
};

function safeFormat(dateStr: string | undefined | null, fmt: string): string {
  try {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch { return "—"; }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function BannerForm({
  open, initial, onClose, onSaved,
}: { open: boolean; initial?: Banner | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState<typeof EMPTY_BANNER>(initial
    ? { title: initial.title, subtitle: initial.subtitle, imageUrl: initial.imageUrl, bgColor: initial.bgColor, linkUrl: initial.linkUrl, hasButton: initial.hasButton, buttonText: initial.buttonText, buttonAlign: initial.buttonAlign, status: initial.status }
    : { ...EMPTY_BANNER });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof EMPTY_BANNER, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const url = isEdit ? `/api/admin/banners/${initial!.id}` : "/api/admin/banners";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: AUTH_HEADER, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Banner" : "New Banner"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="New Season Arrived" />
            <p className="text-xs text-muted-foreground">Use \n for a line break</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Subtitle</Label>
            <Input value={form.subtitle} onChange={e => set("subtitle", e.target.value)} placeholder="Up to 40% off selected styles" />
          </div>
          <div className="grid gap-1.5">
            <Label>Image URL</Label>
            <Input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder="https://images.unsplash.com/..." />
            {form.imageUrl && (
              <div className="relative h-28 rounded-md overflow-hidden border bg-muted">
                <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>Background Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.bgColor} onChange={e => set("bgColor", e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
              <Input value={form.bgColor} onChange={e => set("bgColor", e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Link URL</Label>
            <Input value={form.linkUrl} onChange={e => set("linkUrl", e.target.value)} placeholder="/products?category=women" />
          </div>

          <div className="flex items-center gap-3 py-1">
            <Switch
              checked={form.hasButton}
              onCheckedChange={v => set("hasButton", v)}
              id="has-button"
            />
            <Label htmlFor="has-button">Show Button</Label>
            {!form.hasButton && (
              <span className="text-xs text-muted-foreground ml-1">(click anywhere links)</span>
            )}
          </div>

          {form.hasButton && (
            <>
              <div className="grid gap-1.5">
                <Label>Button Text</Label>
                <Input value={form.buttonText} onChange={e => set("buttonText", e.target.value)} placeholder="SHOP NOW" />
              </div>
              <div className="grid gap-1.5">
                <Label>Button Alignment</Label>
                <Select value={form.buttonAlign} onValueChange={v => set("buttonAlign", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Banner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BannersTab() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: bannersRes, isLoading } = useQuery<{ data: Banner[] }>({
    queryKey: ["/api/admin/banners"],
    queryFn: () => fetch("/api/admin/banners", { headers: AUTH_HEADER }).then(r => r.json()),
  });

  const banners = bannersRes?.data ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/admin/banners"] });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/banners/${id}`, { method: "DELETE", headers: AUTH_HEADER });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Hero banners shown in the mobile app and store front.
        </p>
        <Button data-testid="btn-add-banner" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : banners.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm">No banners yet. Add one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch gap-0">
                  <div
                    className="w-28 flex-shrink-0 relative flex items-center justify-center"
                    style={{ backgroundColor: banner.bgColor, minHeight: 80 }}
                  >
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover absolute inset-0 opacity-40" />
                    ) : null}
                    <span className="text-white text-xs font-bold relative z-10 text-center px-2 leading-tight">
                      {banner.title.replace(/\\n/g, "\n")}
                    </span>
                  </div>
                  <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{banner.title.replace(/\\n/g, " ")}</p>
                      <Badge variant={banner.status === "active" ? "default" : "secondary"} className="text-xs">
                        {banner.status}
                      </Badge>
                    </div>
                    {banner.subtitle && (
                      <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {banner.hasButton
                        ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Button: {banner.buttonText} ({banner.buttonAlign})</span>
                        : <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" />Click-anywhere link</span>
                      }
                      {banner.linkUrl && <span className="truncate max-w-32 font-mono opacity-70">{banner.linkUrl}</span>}
                      <span>#{banner.sortOrder + 1}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pr-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditing(banner); setFormOpen(true); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(banner.id)}
                      disabled={deletingId === banner.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BannerForm
        open={formOpen}
        initial={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={refresh}
      />
    </div>
  );
}

// ─── Stories Tab ───────────────────────────────────────────────────────────────

type StoryItem = { id: string; rowId: string; title: string; imageUrl: string; linkUrl: string; sortOrder: number; status: string };
type StoryRow  = { id: string; title: string; sortOrder: number; status: string; items: StoryItem[] };

const EMPTY_STORY_ITEM = { title: "", imageUrl: "", linkUrl: "", status: "active" };

function StoryItemForm({
  open, rowId, initial, rows, onClose, onSaved,
}: { open: boolean; rowId: string; initial?: StoryItem | null; rows: StoryRow[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({ ...EMPTY_STORY_ITEM, rowId, ...(initial ? { title: initial.title, imageUrl: initial.imageUrl, linkUrl: initial.linkUrl, status: initial.status, rowId: initial.rowId } : {}) });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setErr("Title is required"); return; }
    setSaving(true); setErr("");
    try {
      const url  = isEdit ? `/api/admin/story-items/${initial!.id}` : "/api/admin/story-items";
      const body = isEdit ? { title: form.title, imageUrl: form.imageUrl, linkUrl: form.linkUrl, status: form.status, rowId: form.rowId } : { ...form };
      const res  = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: AUTH_HEADER, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      onSaved(); onClose();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Item" : "Add Story Item"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label>Row</Label>
            <Select value={form.rowId} onValueChange={v => set("rowId", v)}>
              <SelectTrigger><SelectValue placeholder="Select row" /></SelectTrigger>
              <SelectContent>
                {rows.map(r => <SelectItem key={r.id} value={r.id}>{r.title || `Row ${r.sortOrder + 1}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Tops, T-shirts…" />
          </div>
          <div className="grid gap-1.5">
            <Label>Image URL</Label>
            <Input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder="https://images.unsplash.com/…" />
            {form.imageUrl && (
              <div className="w-16 h-16 rounded-full overflow-hidden border">
                <img src={form.imageUrl} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>Link URL</Label>
            <Input value={form.linkUrl} onChange={e => set("linkUrl", e.target.value)} placeholder="/products?category=women" />
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {err && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Add Item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StoriesTab() {
  const qc = useQueryClient();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editRowTitle, setEditRowTitle] = useState("");
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemFormRowId, setItemFormRowId] = useState("");
  const [editItem, setEditItem] = useState<StoryItem | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const [newRowTitle, setNewRowTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: rowsRes, isLoading } = useQuery<{ data: StoryRow[] }>({
    queryKey: ["/api/admin/story-rows"],
    queryFn: () => fetch("/api/admin/story-rows", { headers: AUTH_HEADER }).then(r => r.json()),
  });

  const rows = rowsRes?.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/admin/story-rows"] });

  const handleAddRow = async () => {
    if (!newRowTitle.trim()) return;
    setSavingRow(true);
    try {
      await fetch("/api/admin/story-rows", { method: "POST", headers: AUTH_HEADER, body: JSON.stringify({ title: newRowTitle }) });
      setNewRowTitle(""); setAddRowOpen(false); await refresh();
    } finally { setSavingRow(false); }
  };

  const handleSaveRowTitle = async (rowId: string) => {
    await fetch(`/api/admin/story-rows/${rowId}`, { method: "PUT", headers: AUTH_HEADER, body: JSON.stringify({ title: editRowTitle }) });
    setEditRowId(null); await refresh();
  };

  const handleToggleRowStatus = async (row: StoryRow) => {
    await fetch(`/api/admin/story-rows/${row.id}`, { method: "PUT", headers: AUTH_HEADER, body: JSON.stringify({ status: row.status === "active" ? "inactive" : "active" }) });
    await refresh();
  };

  const handleDeleteRow = async (id: string) => {
    setDeletingId(id);
    try { await fetch(`/api/admin/story-rows/${id}`, { method: "DELETE", headers: AUTH_HEADER }); await refresh(); }
    finally { setDeletingId(null); }
  };

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    try { await fetch(`/api/admin/story-items/${id}`, { method: "DELETE", headers: AUTH_HEADER }); await refresh(); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage story rows shown below the banner. Each row is a horizontal scroll of circles.
        </p>
        <Button onClick={() => setAddRowOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Row
        </Button>
      </div>

      {/* Add Row Dialog */}
      <Dialog open={addRowOpen} onOpenChange={o => !o && setAddRowOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Story Row</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label>Row Title</Label>
              <Input
                value={newRowTitle}
                onChange={e => setNewRowTitle(e.target.value)}
                placeholder="e.g. Shop by Category"
                onKeyDown={e => e.key === "Enter" && handleAddRow()}
              />
              <p className="text-xs text-muted-foreground">Optional — shown as a small heading above the row.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRowOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRow} disabled={savingRow || !newRowTitle.trim()}>{savingRow ? "Adding…" : "Add Row"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story Item Form */}
      {itemFormOpen && (
        <StoryItemForm
          open={itemFormOpen}
          rowId={itemFormRowId}
          initial={editItem}
          rows={rows}
          onClose={() => { setItemFormOpen(false); setEditItem(null); }}
          onSaved={refresh}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Layers className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm">No story rows yet. Add a row to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIdx) => {
            const isExpanded = expandedRow === row.id;
            return (
              <Card key={row.id} className={row.status === "inactive" ? "opacity-60" : ""}>
                <CardContent className="p-0">
                  {/* Row Header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editRowId === row.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            className="h-7 text-sm"
                            value={editRowTitle}
                            onChange={e => setEditRowTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveRowTitle(row.id); if (e.key === "Escape") setEditRowId(null); }}
                            autoFocus
                          />
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleSaveRowTitle(row.id)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditRowId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{row.title || `Row ${rowIdx + 1}`}</span>
                          <Badge variant={row.status === "active" ? "default" : "secondary"} className="text-xs cursor-pointer" onClick={() => handleToggleRowStatus(row)}>
                            {row.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{row.items.length} items</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRowId(row.id); setEditRowTitle(row.title); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRow(row.id)} disabled={deletingId === row.id}
                      ><Trash2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedRow(isExpanded ? null : row.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Items preview bar (always visible) */}
                  {!isExpanded && row.items.length > 0 && (
                    <div className="flex items-center gap-2 px-10 pb-3 overflow-x-auto">
                      {row.items.slice(0, 8).map(item => (
                        <div key={item.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 bg-muted">
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
                          </div>
                          <span className="text-xs text-muted-foreground max-w-10 truncate">{item.title}</span>
                        </div>
                      ))}
                      {row.items.length > 8 && <span className="text-xs text-muted-foreground">+{row.items.length - 8}</span>}
                    </div>
                  )}

                  {/* Expanded items list */}
                  {isExpanded && (
                    <div className="border-t">
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items in this row</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setItemFormRowId(row.id); setEditItem(null); setItemFormOpen(true); }}>
                          <Plus className="w-3 h-3 mr-1" /> Add Item
                        </Button>
                      </div>
                      {row.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                          <ImageIcon className="w-6 h-6 opacity-40" />
                          <p className="text-sm">No items yet.</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {row.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                              <div className="w-9 h-9 rounded-full overflow-hidden border border-border bg-muted flex-shrink-0">
                                {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.title}</p>
                                {item.linkUrl && <p className="text-xs text-muted-foreground font-mono truncate">{item.linkUrl}</p>}
                              </div>
                              <Badge variant={item.status === "active" ? "outline" : "secondary"} className="text-xs flex-shrink-0">{item.status}</Badge>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(item); setItemFormRowId(item.rowId); setItemFormOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)} disabled={deletingId === item.id}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ContentHub() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const defaultTab = params.get("tab") ?? "blog";

  const { data: postsRes, isLoading: loadingPosts } = useAdminListBlogPosts();
  const { data: menusRes, isLoading: loadingMenus } = useAdminListMenus();

  const { data: metaobjectsRes, isLoading: loadingMeta } = useQuery<{ data: MetaobjectEntry[] }>({
    queryKey: ["/api/admin/content/metaobjects"],
    queryFn: () => fetch("/api/admin/content/metaobjects", { headers: AUTH_HEADER }).then(r => r.json()),
  });

  const { data: filesRes, isLoading: loadingFiles } = useQuery<{ data: FileEntry[] }>({
    queryKey: ["/api/admin/content/files"],
    queryFn: () => fetch("/api/admin/content/files", { headers: AUTH_HEADER }).then(r => r.json()),
  });

  const metaobjects = metaobjectsRes?.data ?? [];
  const files = filesRes?.data ?? [];
  const posts = postsRes?.data ?? [];
  const menus = menusRes?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content</h1>
        <p className="text-muted-foreground mt-1">Manage blog posts, banners, menus, custom objects, and files.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="blog" className="gap-2">
            <FileText className="w-4 h-4" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-2" data-testid="tab-banners">
            <ImageIcon className="w-4 h-4" />
            Banners
          </TabsTrigger>
          <TabsTrigger value="menus" className="gap-2">
            <ListIcon className="w-4 h-4" />
            Menus
          </TabsTrigger>
          <TabsTrigger value="metaobjects" className="gap-2">
            <Boxes className="w-4 h-4" />
            Metaobjects
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-2">
            <Layers className="w-4 h-4" />
            Stories
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <File className="w-4 h-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Sections
          </TabsTrigger>
        </TabsList>

        {/* BLOG POSTS */}
        <TabsContent value="blog" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="btn-add-post" onClick={() => navigate("/content/blog/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Write Post
            </Button>
          </div>

          <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPosts ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p>No blog posts yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : posts.map((post) => (
                  <TableRow key={post.id} className="cursor-pointer">
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                    </TableCell>
                    <TableCell>{post.author}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {safeFormat(post.publishedAt, "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {loadingPosts ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{post.title}</p>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {post.author} · {post.publishedAt ? safeFormat(post.publishedAt, "MMM d, yyyy") : "Draft"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* BANNERS */}
        <TabsContent value="banners">
          <BannersTab />
        </TabsContent>

        {/* STORIES */}
        <TabsContent value="stories">
          <StoriesTab />
        </TabsContent>

        {/* MENUS */}
        <TabsContent value="menus" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="btn-add-menu" onClick={() => navigate("/content/menus/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Menu
            </Button>
          </div>
          <div className="space-y-3">
            {loadingMenus ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : menus.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <ListIcon className="h-8 w-8 opacity-50" />
                  <p>No menus yet.</p>
                </CardContent>
              </Card>
            ) : menus.map((menu) => (
              <Card
                key={menu.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/content/menus/${menu.id}`)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{menu.title}</p>
                      <p className="text-sm font-mono text-muted-foreground">{menu.handle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{menu.items?.length ?? 0} links</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {menu.items && menu.items.length > 0 && (
                    <div className="mt-3 pl-3 border-l space-y-1">
                      {(menu.items as { title: string; url: string }[]).slice(0, 3).map((item, i) => (
                        <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                          <span>{item.title}</span>
                          <span className="text-xs text-muted-foreground/60">{item.url}</span>
                        </div>
                      ))}
                      {menu.items.length > 3 && (
                        <p className="text-xs text-muted-foreground/60">+{menu.items.length - 3} more</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* METAOBJECTS */}
        <TabsContent value="metaobjects" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Custom content types like FAQs, size guides, and testimonials.
            </p>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Definition
            </Button>
          </div>

          {loadingMeta ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : metaobjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Boxes className="h-8 w-8 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm">No metaobject definitions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {metaobjects.map((obj) => (
                    <tr key={obj.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm font-medium">{obj.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{obj.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(obj.fields).map(k => (
                            <Badge key={k} variant="secondary" className="text-xs font-normal">{k}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Images, PDFs, and documents used across your store.
            </p>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>

          {loadingFiles ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : files.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <File className="h-8 w-8 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm">No files uploaded yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Filename</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Size</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {files.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {f.mimeType.startsWith("image/")
                            ? <File className="w-4 h-4 text-blue-500" />
                            : <HardDrive className="w-4 h-4 text-muted-foreground" />}
                          <span className="font-medium text-sm">{f.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs font-mono">{f.mimeType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {formatBytes(f.size)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {safeFormat(f.createdAt, "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </TabsContent>
        {/* CONTENT SECTIONS */}
        <TabsContent value="sections" className="space-y-4">
          <ContentSectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Content Sections Tab ──────────────────────────────────────────────────────

type CSItem = { id: string; name: string; description?: string; text?: string; type?: string; rating?: number };
type CSRow  = { id: string; key: string; title: string; items: CSItem[]; status: string };

function ContentSectionsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-content-sections"],
    queryFn: async () => {
      const r = await fetch("/api/admin/content-sections", { headers: AUTH_HEADER });
      const j = await r.json() as { data: CSRow[] };
      return j.data;
    },
  });

  const [editing, setEditing] = useState<CSRow | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/admin/content-sections/${editing.id}`, {
      method: "PUT",
      headers: AUTH_HEADER,
      body: JSON.stringify({ title: editing.title, items: editing.items, status: editing.status }),
    });
    await qc.invalidateQueries({ queryKey: ["admin-content-sections"] });
    setSaving(false);
    setEditing(null);
  };

  const updItem = (idx: number, field: keyof CSItem, val: string | number) =>
    setEditing(prev => prev ? {
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, [field]: val } : it),
    } : prev);

  const addItem = () =>
    setEditing(prev => prev ? {
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), name: "", text: "", description: "", rating: 5, type: "silver" }],
    } : prev);

  const removeItem = (idx: number) =>
    setEditing(prev => prev ? { ...prev, items: prev.items.filter((_, i) => i !== idx) } : prev);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      {(data ?? []).map(section => (
        <Card key={section.id}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {section.key === "testimonials" ? <Star className="w-5 h-5 text-yellow-500" /> : <Settings2 className="w-5 h-5 text-blue-500" />}
                <div>
                  <p className="font-semibold">{section.title || section.key}</p>
                  <p className="text-xs text-muted-foreground font-mono">{section.key} · {section.items.length} items</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing({ ...section, items: section.items.map(i => ({ ...i })) })}>
                <Pencil className="w-3 h-3 mr-1" /> Edit
              </Button>
            </div>
            <div className="space-y-2">
              {section.items.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description || item.text}</p>
                  </div>
                  {item.type && <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>}
                  {item.rating != null && (
                    <Badge variant="outline" className="text-xs">{"★".repeat(item.rating)}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Dialog */}
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Section — {editing.key}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Section Title</Label>
                <Input
                  value={editing.title}
                  onChange={e => setEditing(p => p ? { ...p, title: e.target.value } : p)}
                  placeholder="Section title"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="cs-status">Active</Label>
                <Switch
                  id="cs-status"
                  checked={editing.status === "active"}
                  onCheckedChange={v => setEditing(p => p ? { ...p, status: v ? "active" : "inactive" } : p)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button size="sm" variant="outline" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>

                {editing.items.map((item, idx) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item {idx + 1}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input value={item.name} onChange={e => updItem(idx, "name", e.target.value)} placeholder="Name" />
                      </div>
                      {editing.key === "warranty" && (
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select value={item.type ?? "silver"} onValueChange={v => updItem(idx, "type", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gold">Gold</SelectItem>
                              <SelectItem value="silver">Silver</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {editing.key === "testimonials" && (
                        <div>
                          <Label className="text-xs">Rating (1–5)</Label>
                          <Input
                            type="number" min={1} max={5}
                            value={item.rating ?? 5}
                            onChange={e => updItem(idx, "rating", Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                    {editing.key === "warranty" ? (
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input value={item.description ?? ""} onChange={e => updItem(idx, "description", e.target.value)} placeholder="Warranty description…" />
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs">Review Text</Label>
                        <Input value={item.text ?? ""} onChange={e => updItem(idx, "text", e.target.value)} placeholder="Customer review…" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
