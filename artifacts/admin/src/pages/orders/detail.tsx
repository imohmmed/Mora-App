import { useState, useEffect, useRef } from "react";
import { useAdminGetOrder, useAdminUpdateOrder, getAdminGetOrderQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, User, CreditCard, Truck, Calendar, CheckCircle2, Package,
  Home, AlertTriangle, XCircle, Banknote, Phone, MapPin, Loader2,
  Instagram, StickyNote, Send, Clock, RotateCcw, PackageX, Minus, Plus,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { fmt } from "@/lib/date";
import { cn } from "@/lib/utils";
import { formatIQD } from "@/lib/format";
import { adminFetch } from "@/lib/api";
import { useT } from "@/i18n/LanguageContext";

const ACCENT = "#0373C2";

type StageKey = "confirmed" | "preparing" | "shipping" | "delivered";

const STAGES: { key: StageKey; labelKey: string; icon: typeof Package }[] = [
  { key: "confirmed", labelKey: "orders.stage.confirmed", icon: CheckCircle2 },
  { key: "preparing", labelKey: "orders.stage.preparing", icon: Package },
  { key: "shipping",  labelKey: "orders.stage.shipping",  icon: Truck },
  { key: "delivered", labelKey: "orders.stage.delivered", icon: Home },
];

interface OrderNote {
  id: string;
  adminEmail: string;
  text: string;
  createdAt: string;
}

function InfoRow({ label, value, dir }: { label: string; value?: string | null; dir?: "ltr" }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 items-start text-sm">
      <span className="text-muted-foreground min-w-[110px] shrink-0">{label}</span>
      <span className={cn("font-medium break-all", dir === "ltr" && "dir-ltr")} dir={dir}>{value}</span>
    </div>
  );
}

export default function OrderDetail() {
  const { t } = useT();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: response, isLoading } = useAdminGetOrder(id!);
  const updateOrder = useAdminUpdateOrder();
  const [stageLoading, setStageLoading] = useState<string | null>(null);

  // Returns
  const [returnOpen, setReturnOpen]       = useState(false);
  const [returnMode, setReturnMode]       = useState<"menu" | "full" | "partial" | "no_restock">("menu");
  const [returnQty, setReturnQty]         = useState<Record<string, number>>({});
  const [returnLoading, setReturnLoading] = useState(false);

  // Admin notes
  const [notes, setNotes]         = useState<OrderNote[]>([]);
  const [noteText, setNoteText]   = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const order = response?.data as any;

  const refresh = () => {
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: getAdminGetOrderQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
  };

  // Load notes when order id is ready
  useEffect(() => {
    if (!id) return;
    setNotesLoading(true);
    adminFetch(`/admin/orders/${id}/notes`)
      .then((res) => { if (!res.error) setNotes(res.data as OrderNote[]); })
      .finally(() => setNotesLoading(false));
  }, [id]);

  const submitNote = async () => {
    if (!noteText.trim() || !id || noteSaving) return;
    setNoteSaving(true);
    try {
      const res = await adminFetch(`/admin/orders/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ text: noteText.trim() }),
      });
      if (!res.error) {
        setNotes((prev) => [...prev, res.data as OrderNote]);
        setNoteText("");
        setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        toast({ title: t("orders.notes.error"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("orders.notes.error"), variant: "destructive" });
    } finally {
      setNoteSaving(false);
    }
  };

  const markPaid = () => {
    if (!id) return;
    updateOrder.mutate(
      { id, data: { financialStatus: "paid" } },
      {
        onSuccess: () => { toast({ title: t("orders.toast.markedPaid") }); refresh(); },
        onError: () => toast({ title: t("orders.toast.markPaidError"), variant: "destructive" }),
      }
    );
  };

  const changeStage = async (stage: string) => {
    if (!id || stageLoading) return;
    setStageLoading(stage);
    try {
      const res = await adminFetch(`/admin/orders/${id}/delivery-stage`, {
        method: "POST",
        body: JSON.stringify({ stage }),
      });
      if (res.error) {
        toast({ title: t("orders.toast.stageError"), variant: "destructive" });
      } else {
        const d = res.data as { apns?: { ok: boolean; error?: string }; hasPushToken?: boolean } | null;
        if (!d?.hasPushToken) {
          toast({ title: t("orders.toast.statusUpdated"), description: t("orders.toast.noPushToken") });
        } else if (d?.apns && !d.apns.ok) {
          toast({ title: t("orders.toast.statusUpdated"), description: t("orders.toast.liveActivityError", { error: d.apns.error ?? t("orders.toast.unknownError") }), variant: "destructive" });
        } else {
          toast({ title: t("orders.toast.statusNotified") });
        }
        refresh();
      }
    } catch {
      toast({ title: t("orders.toast.stageError"), variant: "destructive" });
    } finally {
      setStageLoading(null);
    }
  };

  const openReturnDialog = () => {
    setReturnMode("menu");
    setReturnQty({});
    setReturnOpen(true);
  };

  const doReturn = async (type: "full" | "partial" | "no_restock") => {
    if (!id || returnLoading) return;
    let items: { variantId: string; quantity: number }[] | undefined;
    if (type === "partial") {
      items = Object.entries(returnQty)
        .filter(([, q]) => q > 0)
        .map(([variantId, quantity]) => ({ variantId, quantity }));
      if (items.length === 0) return;
    }
    setReturnLoading(true);
    try {
      const res = await adminFetch(`/admin/orders/${id}/return`, {
        method: "POST",
        body: JSON.stringify({ type, ...(items ? { items } : {}) }),
      });
      if (res.error) {
        toast({ title: t("orders.return.error"), description: String(res.error), variant: "destructive" });
      } else {
        const restocked = ((res.data as any)?.restocked ?? []) as { quantity: number }[];
        const totalQty  = restocked.reduce((n, r) => n + r.quantity, 0);
        toast({
          title: t("orders.return.success"),
          description: type === "no_restock"
            ? t("orders.return.successNoRestock")
            : t("orders.return.successRestocked", { n: totalQty }),
        });
        setReturnOpen(false);
        refresh();
      }
    } catch {
      toast({ title: t("orders.return.error"), variant: "destructive" });
    } finally {
      setReturnLoading(false);
    }
  };

  if (isLoading) return <div className="p-6 md:p-8 text-muted-foreground">{t("orders.loadingOrder")}</div>;
  if (!order) return <div className="p-6 md:p-8">{t("orders.notFound")}</div>;

  const stage: string        = order.deliveryStage || "confirmed";
  const deliveryType: string = order.deliveryType  || "standard";
  const isPickup             = deliveryType === "pickup";
  const stages               = isPickup ? STAGES.filter((s) => s.key !== "shipping") : STAGES;
  const currentIndex         = stages.findIndex((s) => s.key === stage);
  const isIssue              = stage === "issue";
  const isCancelled          = stage === "cancelled";
  const isFullReturn         = stage === "returned";
  const isPartialReturn      = stage === "partial_return";
  const isNoRestockReturn    = stage === "returned_no_restock";
  const isReturned           = isFullReturn || isPartialReturn || isNoRestockReturn;
  const isException          = isIssue || isCancelled || isReturned;
  const isDelivered          = stage === "delivered" || isPartialReturn;

  const payMethod: string = order.paymentMethod || "cod";
  const isOnline          = payMethod === "online";
  const isPaid            = order.financialStatus === "paid";

  // Green background when Wayl payment received
  const isWaylPaid = isOnline && isPaid;

  const addr = (order.shippingAddress ?? {}) as Record<string, string>;

  const stageBadge = isCancelled
    ? { label: t("orders.badge.cancelled"), cls: "bg-red-100 text-red-700 hover:bg-red-100" }
    : isIssue
    ? { label: t("orders.badge.issue"),     cls: "bg-amber-100 text-amber-700 hover:bg-amber-100" }
    : isFullReturn
    ? { label: t("orders.stage.returned"), cls: "bg-rose-100 text-rose-700 hover:bg-rose-100" }
    : isPartialReturn
    ? { label: t("orders.stage.partial_return"), cls: "bg-orange-100 text-orange-700 hover:bg-orange-100" }
    : isNoRestockReturn
    ? { label: t("orders.stage.returned_no_restock"), cls: "bg-stone-200 text-stone-700 hover:bg-stone-200" }
    : { label: t(stages[Math.max(0, currentIndex)]?.labelKey ?? "orders.stage.confirmed"), cls: "" };

  const deliveryLabel =
    deliveryType === "express" ? t("orders.delivery.express") :
    deliveryType === "pickup"  ? t("orders.delivery.pickup")  :
    t("orders.delivery.standard");

  return (
    <PageContainer className="max-w-2xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Link href="/orders" className="text-muted-foreground hover:text-foreground shrink-0">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight flex flex-wrap items-center gap-2">
            {order.orderNumber}
            <Badge className={stageBadge.cls} variant={stageBadge.cls ? undefined : "default"}>
              {stageBadge.label}
            </Badge>
          </h1>
          {order.createdAt && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {fmt(order.createdAt, "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — Customer Info
          Green bg when Wayl + paid, white otherwise
      ══════════════════════════════════════════════════════════ */}
      <Card className={isWaylPaid ? "border-green-300 bg-green-50" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <User className={cn("w-5 h-5", isWaylPaid ? "text-green-600" : "")} />
              {t("orders.customer")}
            </span>
            {/* Delivery type badge */}
            <Badge variant="outline" className="gap-1 font-normal text-xs">
              {isPickup ? <MapPin className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
              {deliveryLabel}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Name — links to customer profile */}
          {(addr["fullName"] || order.email) && (
            <div className="flex gap-3 items-center text-sm">
              <span className="text-muted-foreground min-w-[110px] shrink-0">{t("orders.customerInfo.name")}</span>
              <Link
                href={order.customerId ? `/customers/${order.customerId}` : "#"}
                className="font-semibold text-primary hover:underline"
              >
                {addr["fullName"] || order.email}
              </Link>
            </div>
          )}
          {addr["fullName"] && order.email && (
            <InfoRow label={t("common.email")} value={order.email} dir="ltr" />
          )}
          {addr["instagram"] && (
            <div className="flex gap-3 items-center text-sm">
              <span className="text-muted-foreground min-w-[110px] shrink-0">{t("orders.customerInfo.instagram")}</span>
              <span className="font-medium flex items-center gap-1">
                <Instagram className="w-3.5 h-3.5" />
                @{addr["instagram"]}
              </span>
            </div>
          )}
          <InfoRow label={t("orders.customerInfo.phone1")} value={addr["phone"]}  dir="ltr" />
          <InfoRow label={t("orders.customerInfo.phone2")} value={addr["phone2"]} dir="ltr" />
          <Separator className="my-2" />
          <InfoRow label={t("orders.customerInfo.governorate")} value={addr["city"]} />
          <InfoRow label={t("orders.customerInfo.district")}    value={addr["district"]} />
          <InfoRow label={t("orders.customerInfo.landmark")}    value={addr["landmark"]} />
          {isWaylPaid && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-100 border border-green-300 px-3 py-2 text-green-800 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {t("orders.customerInfo.waylPaid")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — Order Status
      ══════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {t("orders.statusTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Progress stepper */}
          {!isException && (
            <div className="flex items-start">
              {stages.map((s, i) => {
                const reached = currentIndex >= i;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && (
                      <span
                        className="absolute top-5 end-1/2 h-1 w-full -z-0"
                        style={{ backgroundColor: currentIndex >= i ? ACCENT : "hsl(var(--muted))" }}
                      />
                    )}
                    <div
                      className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors"
                      style={{
                        backgroundColor: reached ? ACCENT : "transparent",
                        borderColor: reached ? ACCENT : "hsl(var(--muted))",
                        color: reached ? "#fff" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className={cn("mt-2 text-xs font-semibold text-center", reached ? "text-foreground" : "text-muted-foreground")}>
                      {t(s.labelKey)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {isException && (
            <div
              className="flex items-center gap-3 rounded-xl p-4 text-white"
              style={{
                backgroundColor:
                  isFullReturn      ? "#E11D48" :
                  isPartialReturn   ? "#EA580C" :
                  isNoRestockReturn ? "#57534E" :
                  isCancelled       ? "#DC2626" : "#D97706",
              }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
                {isReturned
                  ? (isNoRestockReturn ? <PackageX className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />)
                  : isCancelled ? <XCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-bold">
                  {isFullReturn      ? t("orders.return.bannerFull")
                  : isPartialReturn   ? t("orders.return.bannerPartial")
                  : isNoRestockReturn ? t("orders.return.bannerNoRestock")
                  : isCancelled       ? t("orders.cancelledTitle") : t("orders.issueTitle")}
                </p>
                <p className="text-sm text-white/85">
                  {isFullReturn      ? t("orders.return.bannerFullDesc")
                  : isPartialReturn   ? t("orders.return.bannerPartialDesc")
                  : isNoRestockReturn ? t("orders.return.bannerNoRestockDesc")
                  : t("orders.exceptionDesc")}
                </p>
              </div>
            </div>
          )}

          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">{t("orders.changeStageHint")}</p>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => {
                const active = stage === s.key;
                return (
                  <Button
                    key={s.key}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    disabled={!!stageLoading}
                    onClick={() => changeStage(s.key)}
                    style={active ? { backgroundColor: ACCENT } : undefined}
                  >
                    {stageLoading === s.key ? <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" /> : <s.icon className="w-3.5 h-3.5 me-1.5" />}
                    {t(s.labelKey)}
                  </Button>
                );
              })}
              <Button
                size="sm"
                variant={isIssue ? "default" : "outline"}
                disabled={!!stageLoading}
                onClick={() => changeStage("issue")}
                className={isIssue ? "bg-amber-500 hover:bg-amber-600" : "text-amber-600 border-amber-300 hover:bg-amber-50"}
              >
                {stageLoading === "issue" ? <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5 me-1.5" />}
                {t("orders.stage.issue")}
              </Button>
              <Button
                size="sm"
                variant={isCancelled ? "default" : "outline"}
                disabled={!!stageLoading}
                onClick={() => changeStage("cancelled")}
                className={isCancelled ? "bg-red-500 hover:bg-red-600" : "text-red-600 border-red-300 hover:bg-red-50"}
              >
                {stageLoading === "cancelled" ? <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 me-1.5" />}
                {t("orders.stage.cancel")}
              </Button>
            </div>
          </div>

          {/* ── Returns ── */}
          {!isReturned && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t("orders.return.hint")}</p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!stageLoading}
                  onClick={openReturnDialog}
                  className="text-rose-600 border-rose-300 hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 me-1.5" />
                  {t("orders.return.button")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — Order Items
      ══════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("orders.items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.lineItems?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-12 h-12 rounded-md object-cover border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center border text-xs text-muted-foreground shrink-0">
                      {item.quantity}×
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {[item.size, item.color].filter(Boolean).join(" · ") || item.variantTitle || "—"}
                      {" · ×"}{item.quantity}
                    </p>
                  </div>
                </div>
                <div className="font-medium whitespace-nowrap tabular-nums shrink-0">
                  {formatIQD((item.price || 0) * (item.quantity || 1))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex-col items-stretch p-6 gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("orders.subtotal")}</span>
            <span className="tabular-nums">{formatIQD(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>{t("orders.discount")}{order.discountCode ? ` (${order.discountCode})` : ""}</span>
              <span className="tabular-nums">-{formatIQD(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("orders.shipping")}</span>
            <span className="tabular-nums">{order.shipping ? formatIQD(order.shipping) : t("orders.free")}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>{t("common.total")}</span>
            <span className="tabular-nums">{formatIQD(order.total)}</span>
          </div>
        </CardFooter>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4 — Payment
      ══════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t("orders.payment")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
              {isOnline ? <CreditCard className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
            </div>
            <div>
              <p className="font-medium text-sm">
                {isOnline ? t("orders.payment.online") : t("orders.payment.cod")}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline ? t("orders.payment.onlineSub") : t("orders.payment.codSub")}
              </p>
            </div>
            <div className="ms-auto">
              <Badge className={isPaid ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                {isPaid ? t("orders.payment.paid") : t("orders.payment.unpaid")}
              </Badge>
            </div>
          </div>
          {!isPaid && (
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              disabled={updateOrder.isPending}
              onClick={markPaid}
            >
              {updateOrder.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
              {t("orders.markPaid")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5 — Customer Review (only when delivered + has rating)
      ══════════════════════════════════════════════════════════ */}
      {isDelivered && (order as any).reviewRating ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-amber-400 text-lg">★</span>
              {t("orders.review")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1 text-amber-400 text-xl">
              {[1,2,3,4,5].map((i) => (
                <span key={i} style={{ opacity: i <= (order as any).reviewRating ? 1 : 0.2 }}>★</span>
              ))}
              <span className="text-sm text-muted-foreground ms-2 font-medium">
                {(order as any).reviewRating} / 5
              </span>
            </div>
            {(order as any).reviewText && (
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted rounded-lg px-3 py-2">
                {(order as any).reviewText}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ══════════════════════════════════════════════════════════
          SECTION 6 — Admin Notes (internal log)
      ══════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            {t("orders.notes.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing notes timeline */}
          {notesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("common.loading")}
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("orders.notes.empty")}</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="flex gap-3 items-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 rounded-xl bg-muted px-3 py-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">{note.adminEmail}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmt(note.createdAt, "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                  </div>
                </div>
              ))}
              <div ref={notesEndRef} />
            </div>
          )}

          <Separator />

          {/* Add note */}
          <div className="space-y-2">
            <Textarea
              placeholder={t("orders.notes.placeholder")}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitNote();
              }}
              onFocus={(e) => {
                // On mobile the on-screen keyboard covers this bottom-of-page
                // textarea — scroll it above the keyboard once it opens.
                const el = e.currentTarget;
                const scroll = () => el.scrollIntoView({ block: "center", behavior: "smooth" });
                setTimeout(scroll, 300);
                const vv = window.visualViewport;
                if (vv) {
                  const onResize = () => { scroll(); vv.removeEventListener("resize", onResize); };
                  vv.addEventListener("resize", onResize);
                  setTimeout(() => vv.removeEventListener("resize", onResize), 1500);
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!noteText.trim() || noteSaving}
                onClick={submitNote}
                className="gap-1.5"
              >
                {noteSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {t("orders.notes.add")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          Return dialog — 3 options (full / partial / no restock)
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={returnOpen} onOpenChange={(o) => { if (!returnLoading) setReturnOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          {returnMode === "menu" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                  {t("orders.return.title")}
                </DialogTitle>
                <DialogDescription>{t("orders.return.desc")}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <button
                  onClick={() => setReturnMode("full")}
                  className="flex items-center gap-3 rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 p-4 text-start transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-rose-700">{t("orders.return.fullTitle")}</p>
                    <p className="text-xs text-rose-600/80 mt-0.5">{t("orders.return.fullDesc")}</p>
                  </div>
                </button>
                <button
                  onClick={() => setReturnMode("partial")}
                  className="flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 p-4 text-start transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-orange-700">{t("orders.return.partialTitle")}</p>
                    <p className="text-xs text-orange-600/80 mt-0.5">{t("orders.return.partialDesc")}</p>
                  </div>
                </button>
                <button
                  onClick={() => setReturnMode("no_restock")}
                  className="flex items-center gap-3 rounded-xl border-2 border-stone-300 bg-stone-100 hover:bg-stone-200 p-4 text-start transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-600 text-white">
                    <PackageX className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-700">{t("orders.return.noRestockTitle")}</p>
                    <p className="text-xs text-stone-600/80 mt-0.5">{t("orders.return.noRestockDesc")}</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {(returnMode === "full" || returnMode === "no_restock") && (
            <>
              <DialogHeader>
                <DialogTitle className={returnMode === "full" ? "text-rose-700" : "text-stone-700"}>
                  {returnMode === "full" ? t("orders.return.fullTitle") : t("orders.return.noRestockTitle")}
                </DialogTitle>
                <DialogDescription>
                  {returnMode === "full"
                    ? t("orders.return.fullConfirm", { n: order.orderNumber })
                    : t("orders.return.noRestockConfirm", { n: order.orderNumber })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" disabled={returnLoading} onClick={() => setReturnMode("menu")}>
                  {t("action.back")}
                </Button>
                <Button
                  disabled={returnLoading}
                  onClick={() => doReturn(returnMode)}
                  className={returnMode === "full" ? "bg-rose-600 hover:bg-rose-700" : "bg-stone-600 hover:bg-stone-700"}
                >
                  {returnLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {t("orders.return.confirmBtn")}
                </Button>
              </DialogFooter>
            </>
          )}

          {returnMode === "partial" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-orange-700">{t("orders.return.partialTitle")}</DialogTitle>
                <DialogDescription>{t("orders.return.partialPick")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1 max-h-72 overflow-y-auto">
                {(order.lineItems ?? []).filter((it: any) => it.variantId).map((item: any, i: number) => {
                  const qty = returnQty[item.variantId] ?? 0;
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-10 h-10 rounded-md object-cover border shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-md border shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.variantTitle && item.variantTitle !== "Default Title" ? `${item.variantTitle} · ` : ""}
                          {t("orders.return.ordered", { n: item.quantity })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="icon" variant="outline" className="h-7 w-7"
                          disabled={qty <= 0}
                          onClick={() => setReturnQty((p) => ({ ...p, [item.variantId]: Math.max(0, qty - 1) }))}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className={cn("w-6 text-center text-sm font-bold tabular-nums", qty > 0 && "text-orange-600")}>{qty}</span>
                        <Button
                          size="icon" variant="outline" className="h-7 w-7"
                          disabled={qty >= item.quantity}
                          onClick={() => setReturnQty((p) => ({ ...p, [item.variantId]: Math.min(item.quantity, qty + 1) }))}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" disabled={returnLoading} onClick={() => setReturnMode("menu")}>
                  {t("action.back")}
                </Button>
                <Button
                  disabled={returnLoading || Object.values(returnQty).every((q) => !q)}
                  onClick={() => doReturn("partial")}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {returnLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {t("orders.return.partialConfirmBtn", { n: Object.values(returnQty).reduce((a, b) => a + b, 0) })}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
