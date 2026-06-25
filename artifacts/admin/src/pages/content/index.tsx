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
import { useState, useRef } from "react";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

const adminToken = () => { try { return localStorage.getItem("mora_admin_token") || ""; } catch { return ""; } };
const AUTH_HEADER = () => ({ Authorization: `Bearer ${adminToken()}`, "Content-Type": "application/json" });

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
  const { t } = useT();
  const isEdit = !!initial;
  const [form, setForm] = useState<typeof EMPTY_BANNER>(initial
    ? { title: initial.title, subtitle: initial.subtitle, imageUrl: initial.imageUrl, bgColor: initial.bgColor, linkUrl: initial.linkUrl, hasButton: initial.hasButton, buttonText: initial.buttonText, buttonAlign: initial.buttonAlign, status: initial.status }
    : { ...EMPTY_BANNER });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof EMPTY_BANNER, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError(t("content.err.titleRequired")); return; }
    setSaving(true);
    setError("");
    try {
      const url = isEdit ? `/api/admin/banners/${initial!.id}` : "/api/admin/banners";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: AUTH_HEADER(), body: JSON.stringify(form) });
      if (!res.ok) throw new Error(t("content.err.saveFailed"));
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
          <DialogTitle>{isEdit ? t("content.banners.editTitle") : t("content.banners.newTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label>{t("content.banners.f.title")} *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder={t("content.banners.titlePh")} />
            <p className="text-xs text-muted-foreground">{t("content.banners.titleHint")}</p>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("content.banners.f.subtitle")}</Label>
            <Input value={form.subtitle} onChange={e => set("subtitle", e.target.value)} placeholder={t("content.banners.subtitlePh")} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("content.banners.f.imageUrl")}</Label>
            <Input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder="https://images.unsplash.com/..." />
            {form.imageUrl && (
              <div className="relative h-28 rounded-md overflow-hidden border bg-muted">
                <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>{t("content.banners.f.bgColor")}</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.bgColor} onChange={e => set("bgColor", e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
              <Input value={form.bgColor} onChange={e => set("bgColor", e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("content.banners.f.linkUrl")}</Label>
            <Input value={form.linkUrl} onChange={e => set("linkUrl", e.target.value)} placeholder="/products?category=women" />
          </div>

          <div className="flex items-center gap-3 py-1">
            <Switch
              checked={form.hasButton}
              onCheckedChange={v => set("hasButton", v)}
              id="has-button"
            />
            <Label htmlFor="has-button">{t("content.banners.showButton")}</Label>
            {!form.hasButton && (
              <span className="text-xs text-muted-foreground ms-1">{t("content.banners.clickAnywhereHint")}</span>
            )}
          </div>

          {form.hasButton && (
            <>
              <div className="grid gap-1.5">
                <Label>{t("content.banners.f.buttonText")}</Label>
                <Input value={form.buttonText} onChange={e => set("buttonText", e.target.value)} placeholder={t("content.banners.buttonTextPh")} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("content.banners.f.buttonAlign")}</Label>
                <Select value={form.buttonAlign} onValueChange={v => set("buttonAlign", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">{t("content.align.left")}</SelectItem>
                    <SelectItem value="center">{t("content.align.center")}</SelectItem>
                    <SelectItem value="right">{t("content.align.right")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="grid gap-1.5">
            <Label>{t("common.status")}</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("action.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("action.saving") : isEdit ? t("action.saveChanges") : t("content.banners.createBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BannersTab() {
  const { t } = useT();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: bannersRes, isLoading } = useQuery<{ data: Banner[] }>({
    queryKey: ["/api/admin/banners"],
    queryFn: () => fetch("/api/admin/banners", { headers: AUTH_HEADER() }).then(r => r.json()),
  });

  const banners = bannersRes?.data ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/admin/banners"] });

  const alignLabel = (a: string) =>
    a === "left" ? t("content.align.left") : a === "center" ? t("content.align.center") : t("content.align.right");

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/banners/${id}`, { method: "DELETE", headers: AUTH_HEADER() });
      await refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("content.banners.desc")}
        </p>
        <Button data-testid="btn-add-banner" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 me-2" />
          {t("content.banners.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : banners.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState icon={ImageIcon} title={t("content.banners.empty")} />
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
                  <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{banner.title.replace(/\\n/g, " ")}</p>
                      <Badge variant={banner.status === "active" ? "default" : "secondary"} className="text-xs">
                        {banner.status === "active" ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </div>
                    {banner.subtitle && (
                      <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {banner.hasButton
                        ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />{t("content.banners.buttonInfo", { text: banner.buttonText, align: alignLabel(banner.buttonAlign) })}</span>
                        : <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" />{t("content.banners.clickAnywhere")}</span>
                      }
                      {banner.linkUrl && <span className="truncate max-w-32 font-mono opacity-70">{banner.linkUrl}</span>}
                      <span>#{banner.sortOrder + 1}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pe-3">
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

type StoryItem = { id: string; rowId: string; title: string; imageUrl: string; linkUrl: string; sortOrder: number; status: string; gender: string; collectionId: string | null };
type StoryRow  = { id: string; title: string; sortOrder: number; status: string; items: StoryItem[] };

const EMPTY_STORY_ITEM = { title: "", imageUrl: "", status: "active", gender: "all", collectionId: "" };

type Collection = { id: string; title: string };

function StoryItemForm({
  open, rowId, initial, rows, onClose, onSaved,
}: { open: boolean; rowId: string; initial?: StoryItem | null; rows: StoryRow[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useT();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    ...EMPTY_STORY_ITEM, rowId,
    ...(initial ? {
      title: initial.title, imageUrl: initial.imageUrl,
      status: initial.status, rowId: initial.rowId,
      gender: initial.gender ?? "all",
      collectionId: initial.collectionId ?? "",
    } : {}),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", headers: { Authorization: AUTH_HEADER().Authorization }, body: fd });
      const json = await res.json();
      if (!res.ok || !json.data?.url) throw new Error(json.error ?? t("content.err.uploadFailed"));
      set("imageUrl", json.data.url);
    } catch (e) { setErr((e as Error).message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const { data: collectionsRes } = useQuery<{ data: Collection[] }>({
    queryKey: ["/api/admin/collections"],
    queryFn: () => fetch("/api/admin/collections", { headers: AUTH_HEADER() }).then(r => r.json()),
    staleTime: 60_000,
  });
  const collections = collectionsRes?.data ?? [];

  const handleSave = async () => {
    if (!form.title.trim()) { setErr(t("content.err.titleRequired")); return; }
    setSaving(true); setErr("");
    try {
      const url  = isEdit ? `/api/admin/story-items/${initial!.id}` : "/api/admin/story-items";
      const body = {
        title: form.title, imageUrl: form.imageUrl,
        status: form.status, rowId: form.rowId,
        gender: form.gender,
        collectionId: form.collectionId || null,
      };
      const res  = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: AUTH_HEADER(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error(t("content.err.saveFailed"));
      onSaved(); onClose();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? t("content.stories.item.editTitle") : t("content.stories.item.newTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label>{t("content.stories.f.row")}</Label>
            <Select value={form.rowId} onValueChange={v => set("rowId", v)}>
              <SelectTrigger><SelectValue placeholder={t("content.stories.selectRow")} /></SelectTrigger>
              <SelectContent>
                {rows.map(r => <SelectItem key={r.id} value={r.id}>{r.title || t("content.stories.rowN", { n: r.sortOrder + 1 })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("content.stories.f.title")} *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder={t("content.stories.titlePh")} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("content.stories.f.image")}</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
            <div className="flex items-center gap-3">
              {form.imageUrl ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border shrink-0">
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                  <button type="button" onClick={() => set("imageUrl", "")} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 bg-muted/30">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
              <Button type="button" variant="outline" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? t("content.stories.uploading") : form.imageUrl ? t("content.stories.changeImage") : t("content.stories.uploadImage")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("content.stories.imageHint")}</p>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("content.stories.f.collection")} <span className="text-muted-foreground font-normal text-xs">{t("content.stories.collectionHelp")}</span></Label>
            <Select value={form.collectionId || "__none__"} onValueChange={v => set("collectionId", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("content.stories.autoCreate")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("content.stories.autoCreate")}</SelectItem>
                {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {!form.collectionId && !isEdit && form.title.trim() && (
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                {t("content.stories.willCreatePre")} "<strong>{form.title}</strong>" {t("content.stories.willCreatePost")}
              </p>
            )}
            {form.collectionId && (
              <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
                {t("content.stories.linkedExisting")}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>{t("content.stories.f.gender")} <span className="text-muted-foreground font-normal text-xs">{t("content.stories.genderHelp")}</span></Label>
            <Select value={form.gender} onValueChange={v => set("gender", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="women">{t("content.gender.women")}</SelectItem>
                <SelectItem value="men">{t("content.gender.men")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("common.status")}</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {err && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("action.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t("action.saving") : isEdit ? t("action.save") : t("content.stories.addItem")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StoriesTab() {
  const { t } = useT();
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
    queryFn: () => fetch("/api/admin/story-rows", { headers: AUTH_HEADER() }).then(r => r.json()),
  });

  const rows = rowsRes?.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/admin/story-rows"] });

  const genderLabel = (g: string) => g === "women" ? t("content.gender.women") : g === "men" ? t("content.gender.men") : t("common.all");

  const handleAddRow = async () => {
    if (!newRowTitle.trim()) return;
    setSavingRow(true);
    try {
      await fetch("/api/admin/story-rows", { method: "POST", headers: AUTH_HEADER(), body: JSON.stringify({ title: newRowTitle }) });
      setNewRowTitle(""); setAddRowOpen(false); await refresh();
    } finally { setSavingRow(false); }
  };

  const handleSaveRowTitle = async (rowId: string) => {
    await fetch(`/api/admin/story-rows/${rowId}`, { method: "PUT", headers: AUTH_HEADER(), body: JSON.stringify({ title: editRowTitle }) });
    setEditRowId(null); await refresh();
  };

  const handleToggleRowStatus = async (row: StoryRow) => {
    await fetch(`/api/admin/story-rows/${row.id}`, { method: "PUT", headers: AUTH_HEADER(), body: JSON.stringify({ status: row.status === "active" ? "inactive" : "active" }) });
    await refresh();
  };

  const handleDeleteRow = async (id: string) => {
    setDeletingId(id);
    try { await fetch(`/api/admin/story-rows/${id}`, { method: "DELETE", headers: AUTH_HEADER() }); await refresh(); }
    finally { setDeletingId(null); }
  };

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    try { await fetch(`/api/admin/story-items/${id}`, { method: "DELETE", headers: AUTH_HEADER() }); await refresh(); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("content.stories.desc")}
        </p>
        <Button onClick={() => setAddRowOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          {t("content.stories.addRow")}
        </Button>
      </div>

      {/* Add Row Dialog */}
      <Dialog open={addRowOpen} onOpenChange={o => !o && setAddRowOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("content.stories.newRowTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label>{t("content.stories.f.rowTitle")}</Label>
              <Input
                value={newRowTitle}
                onChange={e => setNewRowTitle(e.target.value)}
                placeholder={t("content.stories.rowTitlePh")}
                onKeyDown={e => e.key === "Enter" && handleAddRow()}
              />
              <p className="text-xs text-muted-foreground">{t("content.stories.rowTitleHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRowOpen(false)}>{t("action.cancel")}</Button>
            <Button onClick={handleAddRow} disabled={savingRow || !newRowTitle.trim()}>{savingRow ? t("content.stories.adding") : t("content.stories.addRow")}</Button>
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
          <EmptyState icon={Layers} title={t("content.stories.empty")} />
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
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleSaveRowTitle(row.id)}>{t("action.save")}</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditRowId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{row.title || t("content.stories.rowN", { n: rowIdx + 1 })}</span>
                          <Badge variant={row.status === "active" ? "default" : "secondary"} className="text-xs cursor-pointer" onClick={() => handleToggleRowStatus(row)}>
                            {row.status === "active" ? t("common.active") : t("common.inactive")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{t("content.stories.itemsCount", { n: row.items.length })}</span>
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
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("content.stories.itemsInRow")}</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setItemFormRowId(row.id); setEditItem(null); setItemFormOpen(true); }}>
                          <Plus className="w-3 h-3 me-1" /> {t("content.stories.addItem")}
                        </Button>
                      </div>
                      {row.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                          <ImageIcon className="w-6 h-6 opacity-40" />
                          <p className="text-sm">{t("content.stories.noItems")}</p>
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
                                {item.collectionId && <p className="text-xs text-muted-foreground truncate">{t("content.stories.linkedCollection")}</p>}
                              </div>
                              {item.gender && item.gender !== "all" && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">{genderLabel(item.gender)}</Badge>
                              )}
                              <Badge variant={item.status === "active" ? "outline" : "secondary"} className="text-xs flex-shrink-0">{item.status === "active" ? t("common.active") : t("common.inactive")}</Badge>
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
  const { t } = useT();
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const defaultTab = params.get("tab") ?? "blog";

  const { data: postsRes, isLoading: loadingPosts } = useAdminListBlogPosts();
  const { data: menusRes, isLoading: loadingMenus } = useAdminListMenus();

  const { data: metaobjectsRes, isLoading: loadingMeta } = useQuery<{ data: MetaobjectEntry[] }>({
    queryKey: ["/api/admin/content/metaobjects"],
    queryFn: () => fetch("/api/admin/content/metaobjects", { headers: AUTH_HEADER() }).then(r => r.json()),
  });

  const { data: filesRes, isLoading: loadingFiles } = useQuery<{ data: FileEntry[] }>({
    queryKey: ["/api/admin/content/files"],
    queryFn: () => fetch("/api/admin/content/files", { headers: AUTH_HEADER() }).then(r => r.json()),
  });

  const metaobjects = metaobjectsRes?.data ?? [];
  const files = filesRes?.data ?? [];
  const posts = postsRes?.data ?? [];
  const menus = menusRes?.data ?? [];

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader title={t("content.title")} subtitle={t("content.subtitle")} />

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="blog" className="gap-2">
            <FileText className="w-4 h-4" />
            {t("content.tab.blog")}
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-2" data-testid="tab-banners">
            <ImageIcon className="w-4 h-4" />
            {t("content.tab.banners")}
          </TabsTrigger>
          <TabsTrigger value="menus" className="gap-2">
            <ListIcon className="w-4 h-4" />
            {t("content.tab.menus")}
          </TabsTrigger>
          <TabsTrigger value="metaobjects" className="gap-2">
            <Boxes className="w-4 h-4" />
            {t("content.tab.metaobjects")}
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-2">
            <Layers className="w-4 h-4" />
            {t("content.tab.stories")}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <File className="w-4 h-4" />
            {t("content.tab.files")}
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2">
            <Settings2 className="w-4 h-4" />
            {t("content.tab.sections")}
          </TabsTrigger>
        </TabsList>

        {/* BLOG POSTS */}
        <TabsContent value="blog" className="space-y-4">
          <div className="flex justify-end">
            <Button data-testid="btn-add-post" onClick={() => navigate("/content/blog/new")}>
              <Plus className="w-4 h-4 me-2" />
              {t("content.blog.write")}
            </Button>
          </div>

          <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("content.blog.col.title")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("content.blog.col.author")}</TableHead>
                  <TableHead>{t("content.blog.col.published")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPosts ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">{t("common.loading")}</TableCell></TableRow>
                ) : posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p>{t("content.blog.empty")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : posts.map((post) => (
                  <TableRow key={post.id} className="cursor-pointer">
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status === "published" ? t("common.published") : t("common.draft")}</Badge>
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
              <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
            ) : posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{post.title}</p>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status === "published" ? t("common.published") : t("common.draft")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {post.author} · {post.publishedAt ? safeFormat(post.publishedAt, "MMM d, yyyy") : t("common.draft")}
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
              <Plus className="w-4 h-4 me-2" />
              {t("content.menus.create")}
            </Button>
          </div>
          <div className="space-y-3">
            {loadingMenus ? (
              <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
            ) : menus.length === 0 ? (
              <Card className="border-dashed">
                <EmptyState icon={ListIcon} title={t("content.menus.empty")} />
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
                      <span className="text-sm text-muted-foreground">{t("content.menus.links", { n: menu.items?.length ?? 0 })}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                    </div>
                  </div>
                  {menu.items && menu.items.length > 0 && (
                    <div className="mt-3 ps-3 border-s space-y-1">
                      {(menu.items as { title: string; url: string }[]).slice(0, 3).map((item, i) => (
                        <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                          <span>{item.title}</span>
                          <span className="text-xs text-muted-foreground/60">{item.url}</span>
                        </div>
                      ))}
                      {menu.items.length > 3 && (
                        <p className="text-xs text-muted-foreground/60">{t("content.menus.more", { n: menu.items.length - 3 })}</p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("content.meta.desc")}
            </p>
            <Button size="sm">
              <Plus className="w-4 h-4 me-2" />
              {t("content.meta.create")}
            </Button>
          </div>

          {loadingMeta ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : metaobjects.length === 0 ? (
            <Card className="border-dashed">
              <EmptyState icon={Boxes} title={t("content.meta.empty")} />
            </Card>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-start px-4 py-3 text-sm font-medium text-muted-foreground">{t("content.meta.col.type")}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-muted-foreground">{t("content.meta.col.id")}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-muted-foreground">{t("content.meta.col.fields")}</th>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("content.files.desc")}
            </p>
            <Button size="sm">
              <Plus className="w-4 h-4 me-2" />
              {t("content.files.upload")}
            </Button>
          </div>

          {loadingFiles ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : files.length === 0 ? (
            <Card className="border-dashed">
              <EmptyState icon={File} title={t("content.files.empty")} />
            </Card>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-start px-4 py-3 text-sm font-medium text-muted-foreground">{t("content.files.col.filename")}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-muted-foreground">{t("content.files.col.type")}</th>
                    <th className="text-end px-4 py-3 text-sm font-medium text-muted-foreground">{t("content.files.col.size")}</th>
                    <th className="text-end px-4 py-3 text-sm font-medium text-muted-foreground">{t("content.files.col.uploaded")}</th>
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
                      <td className="px-4 py-3 text-end text-sm text-muted-foreground">
                        {formatBytes(f.size)}
                      </td>
                      <td className="px-4 py-3 text-end text-sm text-muted-foreground">
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
    </PageContainer>
  );
}

// ─── Content Sections Tab ──────────────────────────────────────────────────────

type CSItem = { id: string; name: string; description?: string; text?: string; type?: string; rating?: number };
type CSRow  = { id: string; key: string; title: string; items: CSItem[]; status: string };

function ContentSectionsTab() {
  const { t } = useT();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-content-sections"],
    queryFn: async () => {
      const r = await fetch("/api/admin/content-sections", { headers: AUTH_HEADER() });
      const j = await r.json() as { data: CSRow[] };
      return j.data;
    },
  });

  const [editing, setEditing] = useState<CSRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("active");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/admin/content-sections/${editing.id}`, {
      method: "PUT",
      headers: AUTH_HEADER(),
      body: JSON.stringify({ title: editing.title, items: editing.items, status: editing.status }),
    });
    await qc.invalidateQueries({ queryKey: ["admin-content-sections"] });
    setSaving(false);
    setEditing(null);
  };

  const handleCreate = async () => {
    if (!newKey.trim()) { setCreateErr(t("content.sections.keyRequired")); return; }
    setCreating(true);
    setCreateErr("");
    try {
      const res = await fetch("/api/admin/content-sections", {
        method: "POST",
        headers: AUTH_HEADER(),
        body: JSON.stringify({ key: newKey.trim(), title: newTitle, items: [], status: newStatus }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(j?.error || t("content.sections.createFailed"));
      }
      await qc.invalidateQueries({ queryKey: ["admin-content-sections"] });
      setNewKey(""); setNewTitle(""); setNewStatus("active");
      setAddOpen(false);
    } catch (e) {
      setCreateErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("content.sections.confirmDelete"))) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/content-sections/${id}`, { method: "DELETE", headers: AUTH_HEADER() });
      await qc.invalidateQueries({ queryKey: ["admin-content-sections"] });
    } finally {
      setDeletingId(null);
    }
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

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">{t("content.sections.loading")}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("content.sections.desc")}
        </p>
        <Button data-testid="btn-add-section" onClick={() => { setCreateErr(""); setAddOpen(true); }}>
          <Plus className="w-4 h-4 me-2" />
          {t("content.sections.add")}
        </Button>
      </div>

      {(data ?? []).map(section => (
        <Card key={section.id}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {section.key === "testimonials" ? <Star className="w-5 h-5 text-yellow-500" /> : <Settings2 className="w-5 h-5 text-blue-500" />}
                <div>
                  <p className="font-semibold">{section.title || section.key}</p>
                  <p className="text-xs text-muted-foreground font-mono">{section.key} · {t("content.sections.itemsCount", { n: section.items.length })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...section, items: section.items.map(i => ({ ...i })) })}>
                  <Pencil className="w-3 h-3 me-1" /> {t("action.edit")}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(section.id)}
                  disabled={deletingId === section.id}
                  data-testid={`btn-delete-section-${section.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
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
              <DialogTitle>{t("content.sections.editTitle", { key: editing.key })}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("content.sections.f.title")}</Label>
                <Input
                  value={editing.title}
                  onChange={e => setEditing(p => p ? { ...p, title: e.target.value } : p)}
                  placeholder={t("content.sections.titlePh")}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="cs-status">{t("content.sections.active")}</Label>
                <Switch
                  id="cs-status"
                  checked={editing.status === "active"}
                  onCheckedChange={v => setEditing(p => p ? { ...p, status: v ? "active" : "inactive" } : p)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("content.sections.items")}</Label>
                  <Button size="sm" variant="outline" onClick={addItem}>
                    <Plus className="w-3 h-3 me-1" /> {t("content.sections.addItem")}
                  </Button>
                </div>

                {editing.items.map((item, idx) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{t("content.sections.itemN", { n: idx + 1 })}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{t("content.sections.f.name")}</Label>
                        <Input value={item.name} onChange={e => updItem(idx, "name", e.target.value)} placeholder={t("content.sections.namePh")} />
                      </div>
                      {editing.key === "warranty" && (
                        <div>
                          <Label className="text-xs">{t("content.sections.f.type")}</Label>
                          <Select value={item.type ?? "silver"} onValueChange={v => updItem(idx, "type", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gold">{t("content.sections.type.gold")}</SelectItem>
                              <SelectItem value="silver">{t("content.sections.type.silver")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {editing.key === "testimonials" && (
                        <div>
                          <Label className="text-xs">{t("content.sections.f.rating")}</Label>
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
                        <Label className="text-xs">{t("content.sections.f.description")}</Label>
                        <Input value={item.description ?? ""} onChange={e => updItem(idx, "description", e.target.value)} placeholder={t("content.sections.descriptionPh")} />
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs">{t("content.sections.f.review")}</Label>
                        <Input value={item.text ?? ""} onChange={e => updItem(idx, "text", e.target.value)} placeholder={t("content.sections.reviewPh")} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>{t("action.cancel")}</Button>
              <Button onClick={save} disabled={saving}>{saving ? t("action.saving") : t("action.saveChanges")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Section Dialog */}
      <Dialog open={addOpen} onOpenChange={o => !o && setAddOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("content.sections.newTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label>{t("content.sections.f.key")} *</Label>
              <Input
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder={t("content.sections.keyPh")}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{t("content.sections.keyHint")}</p>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("content.menus.f.title")}</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t("content.sections.titlePh")} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.status")}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createErr && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{createErr}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>{t("action.cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating || !newKey.trim()}>
              {creating ? t("content.sections.creating") : t("content.sections.createBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
