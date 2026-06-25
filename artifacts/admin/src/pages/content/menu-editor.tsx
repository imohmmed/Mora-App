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
import { useT } from "@/i18n/LanguageContext";

interface MenuLink {
  title: string;
  url: string;
}

export default function MenuEditor() {
  const { t } = useT();
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
      toast({ title: t("content.err.titleRequired"), variant: "destructive" });
      return;
    }
    if (isNew) {
      createMenu.mutate(
        { data: { title, handle: handle || undefined, items: links as unknown as Record<string, unknown>[] } },
        {
          onSuccess: () => {
            toast({ title: t("content.menus.createdToast") });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/menus"] });
            navigate("/content?tab=menus");
          },
          onError: () => toast({ title: t("toast.error"), description: t("content.menus.createError"), variant: "destructive" }),
        }
      );
    } else {
      updateMenu.mutate(
        { id: id!, data: { title, handle: handle || undefined, items: links as unknown as Record<string, unknown>[] } },
        {
          onSuccess: () => {
            toast({ title: t("content.menus.savedToast") });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/menus"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/menus", id] });
          },
          onError: () => toast({ title: t("toast.error"), description: t("content.menus.updateError"), variant: "destructive" }),
        }
      );
    }
  };

  const isSaving = createMenu.isPending || updateMenu.isPending;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/content?tab=menus" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{isNew ? t("content.menus.newTitle") : t("content.menus.editTitle")}</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t("action.saving") : t("action.save")}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("content.menus.details")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="menu-title">{t("content.menus.f.title")} *</Label>
            <Input
              id="menu-title"
              placeholder={t("content.menus.titlePh")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-handle">{t("content.menus.f.handle")}</Label>
            <Input
              id="menu-handle"
              placeholder="main-navigation"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{t("content.menus.handleHint")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("content.menus.navLinks")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {links.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t("content.menus.noLinks")}</p>
          )}
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20">
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={link.title}
                  onChange={(e) => updateLink(i, "title", e.target.value)}
                  placeholder={t("content.menus.linkTitlePh")}
                  className="h-8"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder={t("content.menus.linkUrlPh")}
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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("content.menus.addLink")}</p>
            <div className="flex gap-2">
              <Input
                placeholder={t("content.menus.linkTitlePh")}
                value={newLink.title}
                onChange={(e) => setNewLink((n) => ({ ...n, title: e.target.value }))}
                className="h-8"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
              />
              <Input
                placeholder={t("content.menus.pathPh")}
                value={newLink.url}
                onChange={(e) => setNewLink((n) => ({ ...n, url: e.target.value }))}
                className="h-8 font-mono text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addLink}>
                <Plus className="w-4 h-4 me-1" />
                {t("action.add")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
