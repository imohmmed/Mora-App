import { useState } from "react";
import { useAdminGetOrder, useAdminUpdateOrder, getAdminGetOrderQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, User, CreditCard, Truck, Calendar, CheckCircle2, Package,
  Home, AlertTriangle, XCircle, Banknote, Phone, MapPin, Loader2,
} from "lucide-react";
import { fmt } from "@/lib/date";
import { cn } from "@/lib/utils";
import { formatIQD } from "@/lib/format";
import { adminFetch } from "@/lib/api";

const ACCENT = "#0373C2";

type StageKey = "confirmed" | "preparing" | "shipping" | "delivered";

const STAGES: { key: StageKey; label: string; sub: string; icon: typeof Package }[] = [
  { key: "confirmed", label: "تم التثبيت", sub: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "يتم التجهيز", sub: "Preparing", icon: Package },
  { key: "shipping",  label: "يتم الشحن",  sub: "Shipping",  icon: Truck },
  { key: "delivered", label: "تم التوصيل", sub: "Delivered", icon: Home },
];

export default function OrderDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: response, isLoading } = useAdminGetOrder(id!);
  const updateOrder = useAdminUpdateOrder();
  const [stageLoading, setStageLoading] = useState<string | null>(null);

  const order = response?.data as any;

  const refresh = () => {
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: getAdminGetOrderQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
  };

  const markPaid = () => {
    if (!id) return;
    updateOrder.mutate(
      { id, data: { financialStatus: "paid" } },
      {
        onSuccess: () => { toast({ title: "تم تعليم الطلب كمدفوع" }); refresh(); },
        onError: () => toast({ title: "تعذّر تحديث حالة الدفع", variant: "destructive" }),
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
        toast({ title: "تعذّر تحديث حالة الطلب", variant: "destructive" });
      } else {
        toast({ title: "تم تحديث حالة الطلب وإشعار العميل" });
        refresh();
      }
    } catch {
      toast({ title: "تعذّر تحديث حالة الطلب", variant: "destructive" });
    } finally {
      setStageLoading(null);
    }
  };

  if (isLoading) return <div className="p-6 md:p-8 text-muted-foreground">Loading order...</div>;
  if (!order) return <div className="p-6 md:p-8">Order not found.</div>;

  const stage: string = order.deliveryStage || "confirmed";
  const currentIndex = STAGES.findIndex((s) => s.key === stage);
  const isIssue = stage === "issue";
  const isCancelled = stage === "cancelled";
  const isException = isIssue || isCancelled;

  const payMethod: string = order.paymentMethod || "cod";
  const isOnline = payMethod === "online";
  const isPaid = order.financialStatus === "paid";

  const addr = order.shippingAddress as any | null;

  const stageBadge = isCancelled
    ? { label: "تم الإلغاء", cls: "bg-red-100 text-red-700 hover:bg-red-100" }
    : isIssue
    ? { label: "مشكلة", cls: "bg-amber-100 text-amber-700 hover:bg-amber-100" }
    : { label: STAGES[Math.max(0, currentIndex)]?.label ?? "تم التثبيت", cls: "" };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/orders" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {order.orderNumber}
            <Badge className={stageBadge.cls} variant={stageBadge.cls ? undefined : "default"}>
              {stageBadge.label}
            </Badge>
          </h1>
          {order.createdAt && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {fmt(order.createdAt, "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* ── Order Status / Progress ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                حالة الطلب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress bar — normal flow */}
              {!isException && (
                <div className="flex items-start">
                  {STAGES.map((s, i) => {
                    const reached = currentIndex >= i;
                    const Icon = s.icon;
                    return (
                      <div key={s.key} className="flex-1 flex flex-col items-center relative">
                        {/* connector */}
                        {i > 0 && (
                          <span
                            className="absolute top-5 right-1/2 h-1 w-full -z-0"
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
                          {s.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Exception state — replaces the progress bar for issue / cancelled */}
              {isException && (
                <div
                  className="flex items-center gap-3 rounded-xl p-4 text-white"
                  style={{ backgroundColor: isCancelled ? "#DC2626" : "#D97706" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
                    {isCancelled ? <XCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold">{isCancelled ? "تم إلغاء الطلب" : "هناك مشكلة في الطلب"}</p>
                    <p className="text-sm text-white/85">
                      {isCancelled
                        ? "أُرسل للعميل إشعار مع زر تواصل معنا."
                        : "أُرسل للعميل إشعار مع زر تواصل معنا."}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Stage controls */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">تغيير الحالة (يُحدّث Live Activity ويُشعر العميل فوراً)</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => {
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
                        {stageLoading === s.key ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <s.icon className="w-3.5 h-3.5 mr-1.5" />}
                        {s.label}
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
                    {stageLoading === "issue" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />}
                    مشكلة
                  </Button>
                  <Button
                    size="sm"
                    variant={isCancelled ? "default" : "outline"}
                    disabled={!!stageLoading}
                    onClick={() => changeStage("cancelled")}
                    className={isCancelled ? "bg-red-500 hover:bg-red-600" : "text-red-600 border-red-300 hover:bg-red-50"}
                  >
                    {stageLoading === "cancelled" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                    إلغاء الطلب
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Order Items ──────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.lineItems?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-12 h-12 rounded-md object-cover border" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center border text-xs text-muted-foreground">
                          {item.quantity}x
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {[item.size, item.color].filter(Boolean).join(" · ") || item.variantTitle || "—"}
                          {"  ·  ×"}{item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="font-medium whitespace-nowrap">
                      {formatIQD((item.price || 0) * (item.quantity || 1))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <Separator />
            <CardFooter className="flex-col items-stretch p-6 gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatIQD(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{order.shipping ? formatIQD(order.shipping) : "Free"}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatIQD(order.total)}</span>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* ── Sidebar ───────────────────────────────────── */}
        <div className="space-y-6">
          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {isOnline ? <CreditCard className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {isOnline ? "الدفع الإلكتروني" : "الدفع عند الاستلام"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isOnline ? "عبر Wayl" : "Cash on Delivery"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">حالة الدفع</span>
                <Badge
                  className={isPaid ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}
                >
                  {isPaid ? "مدفوع" : "غير مدفوع"}
                </Badge>
              </div>
              {!isPaid && (
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  disabled={updateOrder.isPending}
                  onClick={markPaid}
                >
                  {updateOrder.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  تعليم كمدفوع
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Link
                  href={order.customerId ? `/customers/${order.customerId}` : "#"}
                  className="font-medium hover:underline text-primary"
                >
                  {addr?.fullName || order.email || "Guest"}
                </Link>
                {order.email && addr?.fullName && (
                  <p className="text-xs text-muted-foreground">{order.email}</p>
                )}
              </div>
              <Separator />
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {addr ? (
                  <>
                    {addr.phone && (
                      <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {addr.phone}</p>
                    )}
                    <p className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5" />
                      <span>
                        {[addr.street, addr.district, addr.city].filter(Boolean).join("، ") || "—"}
                      </span>
                    </p>
                  </>
                ) : (
                  <p>No shipping address provided.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
