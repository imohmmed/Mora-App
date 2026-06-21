import { useState, useEffect } from "react";
import { useAdminListCollections } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderTree, Plus, Image as ImageIcon, LayoutList, ChevronUp, ChevronDown, Trash2, GripVertical, Loader2, CheckCircle2 } from "lucide-react";
import { fmt } from "@/lib/date";
import { adminFetch } from "@/lib/api";

type TabConfig = {
  id: string;
  label: string;
  filterType: "all" | "gender" | "category" | "sale" | "foryou" | string;
  filterValue?: string;
};

const FILTER_TYPE_LABELS: Record<string, string> = {
  all: "All Products",
  gender: "Gender",
  category: "Category",
  sale: "Sale / Discounted",
  foryou: "For You (Personalized)",
};

const FILTER_TYPE_COLOR: Record<string, string> = {
  all: "secondary",
  gender: "default",
  category: "outline",
  sale: "destructive",
  foryou: "secondary",
};

const DEFAULT_TABS: TabConfig[] = [
  { id: "tab_all",    label: "ALL",     filterType: "all" },
  { id: "tab_women",  label: "WOMEN",   filterType: "gender",   filterValue: "women" },
  { id: "tab_men",    label: "MEN",     filterType: "gender",   filterValue: "men" },
  { id: "tab_beauty", label: "BEAUTY",  filterType: "category", filterValue: "beauty" },
  { id: "tab_sale",   label: "SALE",    filterType: "sale" },
  { id: "tab_foryou", label: "FOR YOU", filterType: "foryou" },
];

function MenuTabBar() {
  const [tabs, setTabs] = useState<TabConfig[]>(DEFAULT_TABS);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminFetch<{ id: string; key: string; items: TabConfig[] }[]>("/admin/content-sections")
      .then(({ data }) => {
        const section = data?.find((s) => s.key === "menu_tabs");
        if (section) {
          setSectionId(section.id);
          if (section.items?.length) setTabs(section.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    setTabs((prev) => [...prev, { id: `tab_${Date.now()}`, label: "NEW TAB", filterType: "all" }]);
    setSaved(false);
  };

  const saveTabs = async () => {
    setSaving(true);
    try {
      if (sectionId) {
        await adminFetch(`/admin/content-sections/${sectionId}`, {
          method: "PUT",
          body: JSON.stringify({ items: tabs }),
        });
      } else {
        const result = await adminFetch<{ id: string }>("/admin/content-sections", {
          method: "POST",
          body: JSON.stringify({ key: "menu_tabs", title: "Menu Tab Bar", items: tabs, status: "active" }),
        });
        if (result.data?.id) setSectionId(result.data.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tabs.map((tab, i) => (
        <div key={tab.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
          <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />

          <div className="flex-1 min-w-0">
            <Input
              value={tab.label}
              onChange={(e) => update(i, "label", e.target.value.toUpperCase())}
              className="font-mono text-sm font-semibold h-8"
              placeholder="Tab label"
            />
          </div>

          <div className="w-44 shrink-0">
            <Select value={tab.filterType} onValueChange={(v) => update(i, "filterType", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="gender">Gender</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="sale">Sale / Discounted</SelectItem>
                <SelectItem value="foryou">For You</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(tab.filterType === "gender" || tab.filterType === "category") && (
            <div className="w-28 shrink-0">
              {tab.filterType === "gender" ? (
                <Select value={tab.filterValue ?? "women"} onValueChange={(v) => update(i, "filterValue", v)}>
                  <SelectTrigger className="h-8 text-xs">
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
                  className="h-8 text-xs"
                  placeholder="e.g. beauty"
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveUp(i)} disabled={i === 0}>
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveDown(i)} disabled={i === tabs.length - 1}>
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeTab(i)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" onClick={addTab}>
          <Plus className="w-4 h-4 mr-1" />
          Add Tab
        </Button>
        <Button size="sm" onClick={saveTabs} disabled={saving}>
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />Saved</>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

export default function Collections() {
  const { data: response, isLoading } = useAdminListCollections();
  const collections = response?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1">Group your products and manage the app's home screen tabs.</p>
        </div>
        <Button data-testid="btn-add-collection">
          <Plus className="w-4 h-4 mr-2" />
          Create Collection
        </Button>
      </div>

      {/* ── Menu Tab Bar ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="w-5 h-5" />
            Menu Tab Bar
          </CardTitle>
          <CardDescription>
            These tabs appear at the top of the home screen in the Mora app. Drag to reorder, edit labels, and choose what each tab shows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MenuTabBar />
        </CardContent>
      </Card>

      {/* ── Collections table ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Product Collections</h2>
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : collections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FolderTree className="h-8 w-8 mb-2 opacity-50" />
                      <p>No collections found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                collections.map((collection) => (
                  <TableRow key={collection.id} className="cursor-pointer group relative">
                    <TableCell>
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                        {collection.image ? (
                          <img src={collection.image} alt={collection.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {collection.title}
                      {collection.description && (
                        <p className="text-xs text-muted-foreground font-normal line-clamp-1 mt-1">
                          {collection.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{collection.productsCount ?? 0} products</TableCell>
                    <TableCell>
                      {collection.createdAt ? fmt(collection.createdAt, "MMM d, yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
