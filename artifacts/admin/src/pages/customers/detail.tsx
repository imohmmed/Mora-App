import { useAdminGetCustomer, useAdminUpdateCustomer, getAdminGetCustomerQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, MapPin, ShoppingBag, Pencil, Phone } from "lucide-react";
import { useState } from "react";
import { fmt } from "@/lib/date";
import { formatIQD } from "@/lib/format";
import { PageContainer } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

export default function CustomerDetail() {
  const { t } = useT();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: response, isLoading } = useAdminGetCustomer(id!);
  const updateCustomer = useAdminUpdateCustomer();

  const customerDetail = response?.data;
  const customer = customerDetail; // It is CustomerDetail type which extends Customer and adds orders[]

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    segment: "",
    company: "",
  });

  const openEdit = () => {
    if (!customer) return;
    setForm({
      firstName: customer.firstName ?? "",
      lastName: customer.lastName ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      segment: customer.segment ?? "",
      company: customer.company ?? "",
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!id) return;
    updateCustomer.mutate(
      { id, data: form },
      {
        onSuccess: () => {
          toast({ title: t("customers.detail.updated") });
          queryClient.invalidateQueries({ queryKey: getAdminGetCustomerQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
          setEditOpen(false);
        },
        onError: () => {
          toast({ title: t("customers.detail.updateError"), variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 md:p-8">{t("customers.detail.loading")}</div>;
  }

  if (!customer) {
    return <div className="p-6 md:p-8">{t("customers.detail.notFound")}</div>;
  }

  return (
    <PageContainer className="max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("customers.detail.since", { date: customer.createdAt ? fmt(customer.createdAt, "MMMM yyyy") : t("customers.detail.unknown") })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit} data-testid="btn-edit-customer" className="gap-2 flex-shrink-0">
          <Pencil className="w-4 h-4" />
          {t("action.edit")}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customers.detail.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("customers.field.firstName")}</Label>
                <Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("customers.field.lastName")}</Label>
                <Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.email")}</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("common.phone")}</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("customers.field.segment")}</Label>
              <Input value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))} placeholder={t("customers.field.segmentPlaceholder")} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("customers.field.company")}</Label>
              <Input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateCustomer.isPending}>{t("action.cancel")}</Button>
            <Button onClick={handleSave} disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? t("action.saving") : t("action.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("customers.detail.overview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
                <div>
                  <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                  <div className="text-sm text-muted-foreground">{t("customers.ordersLabel", { n: customer.ordersCount ?? 0 })}</div>
                </div>
              </div>
              
              {/* Pull full address from the customer's most recent order shippingAddress */}
              {(() => {
                const orders = (customerDetail as any)?.orders ?? [];
                const lastAddr = (orders[0] as any)?.shippingAddress ?? (customer.address as any) ?? {};
                return (
                  <div className="space-y-2.5 pt-4 border-t text-sm">
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div>{customer.email}</div>
                        {customer.acceptsMarketing && (
                          <Badge variant="secondary" className="mt-1 font-normal text-xs">{t("customers.detail.subscribed")}</Badge>
                        )}
                      </div>
                    </div>
                    {(lastAddr["phone"] || customer.phone) && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span dir="ltr">{lastAddr["phone"] || customer.phone}</span>
                      </div>
                    )}
                    {lastAddr["phone2"] && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span dir="ltr">{lastAddr["phone2"]}</span>
                        <span className="text-xs text-muted-foreground">({t("orders.backupPhone")})</span>
                      </div>
                    )}
                    {lastAddr["instagram"] && (
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>@{lastAddr["instagram"]}</span>
                      </div>
                    )}
                    {(lastAddr["city"] || lastAddr["district"] || lastAddr["landmark"]) && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-muted-foreground space-y-0.5">
                          {lastAddr["city"]     && <p>{lastAddr["city"]}</p>}
                          {lastAddr["district"] && <p>{lastAddr["district"]}</p>}
                          {lastAddr["landmark"] && <p className="text-xs">{lastAddr["landmark"]}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t("customers.detail.tagsSegments")}</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.segment && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">{t("customers.field.segment")}</span>
                  <Badge variant="outline">{customer.segment}</Badge>
                </div>
              )}
              
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">{t("customers.detail.tags")}</span>
                {customer.tags && customer.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("customers.detail.noTags")}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("customers.detail.totalSpent")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums">{formatIQD(customer.totalSpent ?? 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("customers.detail.orders")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums">{customer.ordersCount ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {t("customers.detail.orderHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* @ts-ignore - The detail endpoint includes orders but it might not be in the typings fully based on API usage */}
              {customer.orders && customer.orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("customers.detail.order")}</TableHead>
                        <TableHead>{t("common.date")}</TableHead>
                        <TableHead>{t("common.status")}</TableHead>
                        <TableHead className="text-end">{t("common.total")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* @ts-ignore */}
                      {customer.orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Link href={`/orders/${order.id}`} className="font-medium hover:underline text-primary">
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {order.createdAt ? fmt(order.createdAt, "MMM d, yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"}>
                              {order.financialStatus === "paid" ? t("status.paid") : t("status.pending")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end font-medium tabular-nums">
                            {formatIQD(order.total ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  {t("customers.detail.noOrders")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
