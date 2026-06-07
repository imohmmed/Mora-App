import { useState, useEffect } from "react";
import { useAdminGetMenu, useAdminUpdateMenu, useAdminCreateMenu } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";

interface MenuLink {
  title: string;
  url: string;
}

export default function MenuEditor() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isNew = !id || id === "new";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: response } = useAdminGetMenu(id!, { query: { enabled: !isNew } as any });
  const updateMenu = useAdminUpdateMenu();
  const createMenu = useAdminCreateMenu();

  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [links, setLinks] = useState<MenuLink[]>([]);
  const [newLink, setNewLink] = useState({ title: "", url: "" });

  useEffect(() => {
    if (response?.data) {
      setTitle(response.data.title);
      setHandle(response.data.handle ?? "");
      setLinks((response.data.items as unknown as MenuLink[]) ?? []);
    }
  }, [response]);

  const addLink = () => {
    if (!newLink.title || !newLink.url) return;
    setLinks((l) => [...l, { ...newLink }]);
    setNewLink({ title: "", url: "" });
  };

  const removeLink = (i: number) =>
    setLinks((l) => l.filter((_, idx) => idx !== i));

  const updateLink = (i: number, key: keyof MenuLink, value: string) =>
    setLinks((l) => l.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)));

  const handleSave = () => {
    if (!title) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (isNew) {
      createMenu.mutate(
        { data: { title, handle: handle || undefined, items: links as unknown as Record<string, unknown>[] } },
        {
          onSuccess: () => {
            toast({ title: "Menu created" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/menus"] });
            navigate("/content?tab=menus");
          },
          onError: () => toast({ title: "Error", description: "Failed to create menu.", variant: "destructive" }),
        }
      );
    } else {
      updateMenu.mutate(
        { id: id!, data: { title, handle: handle || undefined, items: links as unknown as Record<string, unknown>[] } },
        {
          onSuccess: () => {
            toast({ title: "Menu saved" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/menus"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/menus", id] });
          },
          onError: () => toast({ title: "Error", description: "Failed to update menu.", variant: "destructive" }),
        }
      );
    }
  };

  const isSaving = createMenu.isPending || updateMenu.isPending;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/content?tab=menus" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{isNew ? "New Menu" : "Edit Menu"}</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Menu Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="menu-title">Title *</Label>
            <Input
              id="menu-title"
              placeholder="e.g. Main Navigation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-handle">Handle</Label>
            <Input
              id="menu-handle"
              placeholder="main-navigation"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Used in theme code to reference this menu.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {links.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No links yet. Add the first link below.</p>
          )}
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20">
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={link.title}
                  onChange={(e) => updateLink(i, "title", e.target.value)}
                  placeholder="Link title"
                  className="h-8"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="URL (e.g. /collections/all)"
                  className="h-8 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLink(i)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add new link row */}
          <div className="border border-dashed rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Link</p>
            <div className="flex gap-2">
              <Input
                placeholder="Link title"
                value={newLink.title}
                onChange={(e) => setNewLink((n) => ({ ...n, title: e.target.value }))}
                className="h-8"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
              />
              <Input
                placeholder="/path or https://..."
                value={newLink.url}
                onChange={(e) => setNewLink((n) => ({ ...n, url: e.target.value }))}
                className="h-8 font-mono text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addLink}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
