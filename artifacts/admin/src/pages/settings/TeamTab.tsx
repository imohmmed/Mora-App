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

type AdminRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: AdminPermissions;
  is_active: number | boolean;
  last_login: string | null;
};

const PERMS: { key: keyof AdminPermissions; label: string; icon: React.ElementType }[] = [
  { key: "orders",    label: "Orders",    icon: ShoppingCart },
  { key: "products",  label: "Products",  icon: Package },
  { key: "customers", label: "Customers", icon: Users },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "marketing", label: "Marketing", icon: Tags },
  { key: "content",   label: "Content",   icon: FileText },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase() || "?";
}

function formatDate(dt: string | null) {
  if (!dt) return "Never";
  try { return new Date(dt + "Z").toLocaleDateString(); } catch { return dt; }
}

export function TeamTab() {
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
      if (res.error) { toast({ title: "Error", description: res.error as string, variant: "destructive" }); }
      else {
        toast({ title: "Admin added", description: `${newName} can now sign in with Google.` });
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
    toast({ title: is_active ? "Admin activated" : "Admin deactivated", description: `${admin.name}'s access has been ${is_active ? "restored" : "revoked"}.` });
  };

  const togglePerm = async (admin: AdminRow, key: keyof AdminPermissions) => {
    const permissions = { ...admin.permissions, [key]: !admin.permissions[key] };
    await adminFetch(`/admin/users/${admin.id}`, { method: "PUT", body: JSON.stringify({ permissions }) });
    setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, permissions } : a));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await adminFetch(`/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (res.error) { toast({ title: "Error", description: res.error as string, variant: "destructive" }); }
    else {
      toast({ title: "Admin removed" });
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
            <CardTitle className="text-base">Store Owner</CardTitle>
            <CardDescription>The owner has unrestricted access to all features.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {initials(owner.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{owner.name}</p>
                <p className="text-xs text-muted-foreground">{owner.email}</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-xs">Owner</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Team Members</CardTitle>
            <CardDescription>
              {nonOwner.length === 0
                ? "No admins added yet. Add team members to give them controlled access."
                : `${nonOwner.length} admin${nonOwner.length > 1 ? "s" : ""} with custom permissions.`}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Admin
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && nonOwner.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No team members yet.</p>
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
                    Last login: {formatDate(admin.last_login)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={!!admin.is_active}
                      onCheckedChange={() => toggleActive(admin)}
                      className="scale-90"
                    />
                    <span className="text-xs text-muted-foreground w-14">
                      {admin.is_active ? "Active" : "Disabled"}
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
                {PERMS.map(({ key, label, icon: Icon }) => (
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
                    {label}
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
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Ahmed Ali" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Google Email</Label>
              <Input placeholder="ahmed@gmail.com" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <p className="text-xs text-muted-foreground">They must sign in with this exact Google account.</p>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-3 gap-2">
                {PERMS.map(({ key, label, icon: Icon }) => (
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
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !newName.trim() || !newEmail.trim()}>
              {saving ? "Adding..." : "Add Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose access to the admin panel. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
