import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/api";
import { useAdminAuth, type AdminPermissions } from "@/context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ShoppingCart, Package, Users, BarChart3, Tags, FileText } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

type AdminRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: AdminPermissions;
  is_active: number | boolean;
  last_login: string | null;
};

const PERMS: { key: keyof AdminPermissions; labelKey: string; icon: React.ElementType }[] = [
  { key: "orders",    labelKey: "nav.orders",          icon: ShoppingCart },
  { key: "products",  labelKey: "nav.products",        icon: Package },
  { key: "customers", labelKey: "nav.customers",       icon: Users },
  { key: "analytics", labelKey: "nav.analytics",       icon: BarChart3 },
  { key: "marketing", labelKey: "nav.section.marketing", icon: Tags },
  { key: "content",   labelKey: "nav.content",         icon: FileText },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase() || "?";
}

export function TeamTab() {
  const { t } = useT();
  const { user: me } = useAdminAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPerms, setNewPerms] = useState<AdminPermissions>({
    orders: false, products: false, customers: false,
    analytics: false, marketing: false, content: false, settings: false,
  });
  const [saving, setSaving] = useState(false);

  const formatDate = (dt: string | null) => {
    if (!dt) return t("team.never");
    try { return new Date(dt + "Z").toLocaleDateString(); } catch { return dt; }
  };

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<AdminRow[]>("/admin/users");
      if (res.data) setAdmins(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleAdd = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setSaving(true);
    try {
      const res = await adminFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), permissions: newPerms }),
      });
      if (res.error) { toast({ title: t("toast.error"), description: res.error as string, variant: "destructive" }); }
      else {
        toast({ title: t("team.toast.added"), description: t("team.toast.added.desc", { name: newName }) });
        setAddOpen(false);
        setNewName(""); setNewEmail("");
        setNewPerms({ orders: false, products: false, customers: false, analytics: false, marketing: false, content: false, settings: false });
        fetchAdmins();
      }
    } finally { setSaving(false); }
  };

  const toggleActive = async (admin: AdminRow) => {
    const is_active = !admin.is_active;
    await adminFetch(`/admin/users/${admin.id}`, { method: "PUT", body: JSON.stringify({ is_active }) });
    setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, is_active } : a));
    toast({
      title: is_active ? t("team.toast.activated") : t("team.toast.deactivated"),
      description: is_active
        ? t("team.toast.activated.desc", { name: admin.name })
        : t("team.toast.deactivated.desc", { name: admin.name }),
    });
  };

  const togglePerm = async (admin: AdminRow, key: keyof AdminPermissions) => {
    const permissions = { ...admin.permissions, [key]: !admin.permissions[key] };
    await adminFetch(`/admin/users/${admin.id}`, { method: "PUT", body: JSON.stringify({ permissions }) });
    setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, permissions } : a));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await adminFetch(`/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (res.error) { toast({ title: t("toast.error"), description: res.error as string, variant: "destructive" }); }
    else {
      toast({ title: t("team.toast.removed") });
      setDeleteTarget(null);
      fetchAdmins();
    }
  };

  const nonOwner = admins.filter((a) => a.role !== "owner");
  const owner = admins.find((a) => a.role === "owner");

  return (
    <div className="space-y-6">
      {/* Owner card */}
      {owner && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("team.owner.title")}</CardTitle>
            <CardDescription>{t("team.owner.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {initials(owner.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{owner.name}</p>
                <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
              </div>
              <Badge variant="secondary" className="ms-auto text-xs">{t("team.owner.badge")}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admins */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{t("team.members.title")}</CardTitle>
            <CardDescription>
              {nonOwner.length === 0
                ? t("team.members.desc.empty")
                : t("team.members.desc.count", { n: nonOwner.length })}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 flex-shrink-0">
            <Plus className="h-4 w-4" /> {t("team.addAdmin")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          {!loading && nonOwner.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">{t("team.empty")}</p>
          )}
          {nonOwner.map((admin) => (
            <div key={admin.id} className="border rounded-lg p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-muted">{initials(admin.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{admin.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {t("team.lastLogin", { date: formatDate(admin.last_login) })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={!!admin.is_active}
                      onCheckedChange={() => toggleActive(admin)}
                      className="scale-90"
                    />
                    <span className="text-xs text-muted-foreground w-14">
                      {admin.is_active ? t("common.active") : t("team.disabledLabel")}
                    </span>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(admin)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Permissions */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 border-t">
                {PERMS.map(({ key, labelKey, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => togglePerm(admin, key)}
                    disabled={!admin.is_active}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs font-medium transition-colors ${
                      admin.permissions[key]
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/30 border-border text-muted-foreground"
                    } disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("team.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input placeholder={t("team.namePlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("team.field.googleEmail")}</Label>
              <Input placeholder={t("team.emailPlaceholder")} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("team.field.googleEmail.hint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("team.field.permissions")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {PERMS.map(({ key, labelKey, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setNewPerms((p) => ({ ...p, [key]: !p[key] }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs font-medium transition-colors ${
                      newPerms[key]
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/30 border-border text-muted-foreground"
                    } hover:opacity-80`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("action.cancel")}</Button>
            <Button onClick={handleAdd} disabled={saving || !newName.trim() || !newEmail.trim()}>
              {saving ? t("team.adding") : t("team.addAdmin")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.delete.title", { name: deleteTarget?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("team.delete.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("action.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
