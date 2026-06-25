import { useState } from "react";
import { useAdminListCustomers, useAdminDeleteCustomer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Users as UsersIcon, Trash2, Bell, Radio } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { getAdminToken } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { PageContainer, PageHeader, SectionCard, EmptyState } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

async function sendNotification(payload: {
  title: string;
  body: string;
  url?: string;
  targetAll?: boolean;
  customerIds?: string[];
}) {
  const res = await fetch("/api/admin/notifications/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json() as { data: unknown; error?: string | null };
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json.data;
}

type NotifTarget =
  | { type: "customer"; id: string; name: string }
  | { type: "all" };

type Customer = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: { city?: string; district?: string };
  ordersCount?: number;
  totalSpent?: number;
};

export default function Customers() {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteCustomer = useAdminDeleteCustomer();

  const { data: response, isLoading } = useAdminListCustomers({
    q: debouncedSearch || undefined,
  });

  const customers = (response?.data ?? []) as Customer[];

  // ── Notification dialog state ──────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTarget, setNotifTarget] = useState<NotifTarget | null>(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifUrl, setNotifUrl] = useState("");
  const [notifSending, setNotifSending] = useState(false);

  function openNotifDialog(target: NotifTarget) {
    setNotifTarget(target);
    setNotifTitle("");
    setNotifBody("");
    setNotifUrl("");
    setNotifOpen(true);
  }

  async function handleSendNotif() {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast({ title: t("customers.notif.validation"), variant: "destructive" });
      return;
    }
    setNotifSending(true);
    try {
      await sendNotification({
        title: notifTitle.trim(),
        body: notifBody.trim(),
        url: notifUrl.trim() || undefined,
        targetAll: notifTarget?.type === "all",
        customerIds: notifTarget?.type === "customer" ? [notifTarget.id] : undefined,
      });
      toast({ title: t("customers.notif.sent") });
      setNotifOpen(false);
    } catch (e: any) {
      toast({ title: e?.message ?? t("customers.notif.error"), variant: "destructive" });
    } finally {
      setNotifSending(false);
    }
  }

  const handleDelete = (id: string) => {
    deleteCustomer.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: t("customers.deleted") });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
        },
        onError: () => toast({ title: t("customers.deleteError"), variant: "destructive" }),
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("customers.title")}
        subtitle={t("customers.subtitle")}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => openNotifDialog({ type: "all" })}
              className="gap-2"
            >
              <Radio className="w-4 h-4" />
              {t("customers.notifyAll")}
            </Button>
            <Button data-testid="btn-add-customer" className="gap-2">
              <Plus className="w-4 h-4" />
              {t("customers.add")}
            </Button>
          </>
        }
      />

      <div className="flex items-center bg-card p-4 rounded-xl border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("customers.searchPlaceholder")}
            className="ps-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customers.col.name")}</TableHead>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead>{t("customers.col.location")}</TableHead>
                <TableHead className="text-end">{t("customers.col.orders")}</TableHead>
                <TableHead className="text-end">{t("customers.col.spent")}</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">{t("common.loading")}</TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <UsersIcon className="h-8 w-8 mb-2 opacity-50" />
                      <p>{t("customers.empty")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer group relative">
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="absolute inset-0">
                        <span className="sr-only">{t("customers.viewCustomer", { name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() })}</span>
                      </Link>
                      {customer.firstName} {customer.lastName}
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{(customer.address as { city?: string; district?: string })?.city || (customer.address as { district?: string })?.district || "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">{customer.ordersCount ?? 0}</TableCell>
                    <TableCell className="text-end font-medium tabular-nums">
                      {formatIQD(customer.totalSpent ?? 0)}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        {/* Send notification button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative z-10 h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNotifDialog({
                              type: "customer",
                              id: customer.id,
                              name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim(),
                            });
                          }}
                          title={t("customers.sendNotif")}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>

                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="relative z-10 h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`btn-delete-customer-${customer.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("customers.deleteTitle", { name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() })}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("customers.deleteDesc")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(customer.id)}>{t("action.delete")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
        ) : customers.length === 0 ? (
          <EmptyState icon={UsersIcon} title={t("customers.empty")} />
        ) : (
          customers.map((customer) => (
            <div key={customer.id} className="relative">
              <Link href={`/customers/${customer.id}`}>
                <Card className="cursor-pointer hover:shadow-sm transition-shadow active:opacity-80">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm bg-primary/10 text-primary">
                          {customer.firstName?.[0]}{customer.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                        <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <p className="font-semibold tabular-nums">{formatIQD(customer.totalSpent ?? 0)}</p>
                        <p className="text-xs text-muted-foreground">{t("customers.ordersLabel", { n: customer.ordersCount ?? 0 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {/* Notification button for mobile */}
              <button
                className="absolute top-3 end-3 z-10 p-1.5 rounded-full bg-primary/10 text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  openNotifDialog({
                    type: "customer",
                    id: customer.id,
                    name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim(),
                  });
                }}
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Send Notification Dialog ────────────────────────────────────────── */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {notifTarget?.type === "all"
                ? t("customers.notif.titleAll")
                : t("customers.notif.titleTo", { name: notifTarget?.type === "customer" ? notifTarget.name : "" })}
            </DialogTitle>
            <DialogDescription>
              {notifTarget?.type === "all"
                ? t("customers.notif.descAll")
                : t("customers.notif.descOne")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="notif-title">{t("customers.notif.fieldTitle")}</Label>
              <Input
                id="notif-title"
                placeholder={t("customers.notif.titlePlaceholder")}
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notif-body">{t("customers.notif.fieldBody")}</Label>
              <Textarea
                id="notif-body"
                placeholder={t("customers.notif.bodyPlaceholder")}
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notif-url">{t("customers.notif.fieldUrl")}</Label>
              <Input
                id="notif-url"
                placeholder={t("customers.notif.urlPlaceholder")}
                value={notifUrl}
                onChange={(e) => setNotifUrl(e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                {t("customers.notif.urlHint")}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {["/collection/sale", "/collection/new-arrivals", "/collection/trending"].map((u) => (
                  <button
                    key={u}
                    type="button"
                    className="text-xs px-2 py-0.5 rounded-full border border-border hover:bg-accent"
                    onClick={() => setNotifUrl(u)}
                    dir="ltr"
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {(notifTitle || notifBody) && (
              <div className="rounded-xl border bg-zinc-950 p-3 mt-1">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">M</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-400 font-medium mb-0.5">MORA</p>
                    <p className="text-white text-[13px] font-semibold leading-tight mb-0.5 truncate">
                      {notifTitle || t("customers.notif.previewTitle")}
                    </p>
                    <p className="text-zinc-300 text-[11px] leading-tight line-clamp-2">
                      {notifBody || t("customers.notif.previewBody")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifOpen(false)} disabled={notifSending}>
              {t("action.cancel")}
            </Button>
            <Button onClick={handleSendNotif} disabled={notifSending || !notifTitle || !notifBody}>
              {notifSending ? t("action.sending") : t("customers.notif.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
