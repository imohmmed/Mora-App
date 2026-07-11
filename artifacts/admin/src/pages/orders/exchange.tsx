import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";
import { Inbox, RotateCcw, Phone, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { fmt } from "@/lib/date";
import { formatIQD } from "@/lib/format";
import { adminFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/i18n/LanguageContext";

type XrItem = {
  variantId?: string;
  productId?: string;
  title?: string;
  variantTitle?: string;
  image?: string;
  price?: number;
  quantity?: number;
};

type XrRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId?: string | null;
  email: string;
  type: "exchange" | "refund";
  status: "awaiting_items" | "pending" | "approved" | "rejected" | "cancelled";
  description: string;
  images: string[];
  returnItems: XrItem[];
  newItems: XrItem[];
  adminPrice?: number | null;
  newOrderId?: string | null;
  newOrderNumber?: string | null;
  rejectReason?: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
};

const STATUS_COLORS: Record<string, string> = {
  awaiting_items: "bg-slate-100 text-slate-700 border-slate-200",
  pending:        "bg-amber-100 text-amber-700 border-amber-200",
  approved:       "bg-green-100 text-green-700 border-green-200",
  rejected:       "bg-red-100 text-red-700 border-red-200",
  cancelled:      "bg-slate-100 text-slate-500 border-slate-200",
};

type Tab = "all" | "pending" | "approved" | "rejected";

function ItemsList({ items, label }: { items: XrItem[]; label: string }) {
  const { t } = useT();
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-2">{label}</div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
            {it.image ? (
              <img src={it.image} alt="" className="h-12 w-10 rounded object-cover" />
            ) : (
              <div className="h-12 w-10 rounded bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{it.title}</div>
              {it.variantTitle ? (
                <div className="text-xs text-muted-foreground">{it.variantTitle}</div>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {t("xr.qty")} {it.quantity ?? 1}
            </div>
            <div className="text-sm font-semibold whitespace-nowrap">
              {formatIQD((it.price ?? 0) * (it.quantity ?? 1))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExchangeRequests() {
  const { t } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<XrRequest | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["exchange-requests", tab],
    queryFn: async () => {
      const res = await adminFetch<XrRequest[]>(
        `/admin/exchange-requests${tab !== "all" ? `?status=${tab}` : ""}`
      );
      if (res.error) throw new Error(res.error);
      return res.data ?? [];
    },
  });
  const rows = data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["exchange-requests"] });

  const approveMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const res = await adminFetch<XrRequest>(`/admin/exchange-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ price }),
      });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (updated) => {
      invalidate();
      setApproveOpen(false);
      setSelected(null);
      toast({ description: t("xr.toast.approved").replace("{n}", updated?.newOrderNumber ?? "") });
    },
    onError: (e: Error) => toast({ variant: "destructive", description: e.message || t("xr.toast.error") }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await adminFetch<XrRequest>(`/admin/exchange-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      setRejectOpen(false);
      setSelected(null);
      toast({ description: t("xr.toast.rejected") });
    },
    onError: (e: Error) => toast({ variant: "destructive", description: e.message || t("xr.toast.error") }),
  });

  const TABS: { key: Tab; labelKey: string }[] = [
    { key: "all",      labelKey: "xr.tab.all" },
    { key: "pending",  labelKey: "xr.tab.pending" },
    { key: "approved", labelKey: "xr.tab.approved" },
    { key: "rejected", labelKey: "xr.tab.rejected" },
  ];

  const expectedNewNumber = selected
    ? `${selected.orderNumber}${selected.type === "exchange" ? "(E)" : "(R)"}`
    : "";

  const canDecide = selected?.status === "pending";

  return (
    <PageContainer>
      <PageHeader
        title={t("xr.title")}
        subtitle={t("xr.subtitle")}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <Button
            key={tb.key}
            size="sm"
            variant={tab === tb.key ? "default" : "outline"}
            onClick={() => setTab(tb.key)}
          >
            {t(tb.labelKey as never)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={Inbox} title={t("xr.empty")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("xr.col.request")}</TableHead>
                  <TableHead>{t("xr.col.customer")}</TableHead>
                  <TableHead>{t("xr.col.type")}</TableHead>
                  <TableHead>{t("xr.col.status")}</TableHead>
                  <TableHead>{t("xr.col.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => { setSelected(r); setPrice(""); setReason(""); }}
                  >
                    <TableCell className="font-medium">
                      {r.orderNumber}
                      {r.newOrderNumber ? (
                        <span className="ms-2 text-xs text-muted-foreground">→ {r.newOrderNumber}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.customerName || r.email}</div>
                      {r.customerPhone ? (
                        <div className="text-xs text-muted-foreground" dir="ltr">{r.customerPhone}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {r.type === "exchange" ? t("xr.type.exchange") : t("xr.type.refund")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[r.status] ?? ""}>
                        {t(`xr.status.${r.status}` as never)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmt(r.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Detail dialog ── */}
      <Dialog open={!!selected && !approveOpen && !rejectOpen} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {t("xr.detail.title")} — {selected.orderNumber}
                  <Badge variant="outline">
                    {selected.type === "exchange" ? t("xr.type.exchange") : t("xr.type.refund")}
                  </Badge>
                  <Badge variant="outline" className={STATUS_COLORS[selected.status] ?? ""}>
                    {t(`xr.status.${selected.status}` as never)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* contact + order links */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium">{selected.customerName || selected.email}</span>
                  {selected.customerPhone ? (
                    <a
                      href={`tel:${selected.customerPhone}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      dir="ltr"
                    >
                      <Phone className="h-3.5 w-3.5" /> {selected.customerPhone}
                    </a>
                  ) : null}
                  <Link href={`/orders/${selected.orderId}`} className="text-primary hover:underline">
                    {t("xr.detail.originalOrder")}: {selected.orderNumber}
                  </Link>
                  {selected.newOrderId ? (
                    <Link href={`/orders/${selected.newOrderId}`} className="text-primary hover:underline">
                      {t("xr.detail.newOrder")}: {selected.newOrderNumber}
                    </Link>
                  ) : null}
                </div>

                {/* description */}
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">
                    {t("xr.detail.description")}
                  </div>
                  <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">
                    {selected.description}
                  </div>
                </div>

                {/* photos */}
                {selected.images?.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold text-muted-foreground">
                      {t("xr.detail.photos")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.images.map((url) => (
                        <button key={url} type="button" onClick={() => setLightbox(url)}>
                          <img src={url} alt="" className="h-20 w-20 rounded-lg border object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <ItemsList items={selected.returnItems} label={t("xr.detail.returnItems")} />
                <ItemsList items={selected.newItems} label={t("xr.detail.newItems")} />

                {selected.status === "approved" && selected.adminPrice != null && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {selected.newOrderNumber} — {formatIQD(selected.adminPrice)}
                  </div>
                )}
                {selected.status === "rejected" && selected.rejectReason ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {selected.rejectReason}
                  </div>
                ) : null}
              </div>

              {canDecide && (
                <DialogFooter className="gap-2">
                  <Button variant="destructive" onClick={() => { setReason(""); setRejectOpen(true); }}>
                    <XCircle className="me-1 h-4 w-4" /> {t("xr.reject")}
                  </Button>
                  <Button onClick={() => { setPrice(""); setApproveOpen(true); }}>
                    <CheckCircle2 className="me-1 h-4 w-4" /> {t("xr.approve")}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Approve dialog ── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("xr.approve.title")}</DialogTitle>
            <DialogDescription>
              {t("xr.approve.desc").replace("{n}", expectedNewNumber)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("xr.approve.price")}</label>
            <Input
              type="number"
              min="0"
              dir="ltr"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <DialogFooter>
            <Button
              disabled={price.trim() === "" || Number(price) < 0 || approveMutation.isPending}
              onClick={() => selected && approveMutation.mutate({ id: selected.id, price: Number(price) })}
            >
              {approveMutation.isPending && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
              {t("xr.approve.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("xr.reject.title")}</DialogTitle>
            <DialogDescription>{t("xr.reject.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("xr.reject.reason")}</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => selected && rejectMutation.mutate({ id: selected.id, reason })}
            >
              {rejectMutation.isPending && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
              {t("xr.reject.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Image lightbox ── */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightbox && <img src={lightbox} alt="" className="max-h-[80vh] w-full rounded object-contain" />}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
