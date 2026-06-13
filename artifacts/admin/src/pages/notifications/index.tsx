import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Send,
  Smartphone,
  Activity,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Package,
  Truck,
  Gift,
  AlertTriangle,
  Users,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API = "/api";
const ADMIN_TOKEN = "mora-admin-2025";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json() as { data: T; error?: string | null };
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json.data;
}

type Stats = {
  tokens: number;
  customers: number;
  totalSent: number;
  totalSuccess: number;
  ios: number;
  android: number;
};

type NotifLog = {
  id: string;
  type: string;
  title: string;
  body: string;
  tokens_sent: number;
  success: number;
  failed: number;
  created_at: string;
};

const ORDER_STAGES = [
  { id: "confirmed", label: "تم التثبيت", icon: CheckCircle2, color: "#22C55E" },
  { id: "preparing", label: "يتم التجهيز", icon: Package, color: "#0274C1" },
  { id: "shipping",  label: "يتم الشحن",  icon: Truck,        color: "#0274C1" },
  { id: "delivered", label: "تم التوصيل", icon: Gift,         color: "#22C55E" },
  { id: "issue",     label: "مشكلة",       icon: AlertTriangle,color: "#EF4444" },
];

// ── Notification phone preview ─────────────────────────────────────────────────
function PhonePreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative mx-auto" style={{ width: 260 }}>
      {/* Phone shell */}
      <div className="rounded-[32px] border-[3px] border-zinc-700 bg-black overflow-hidden shadow-2xl">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-white text-[10px] font-semibold">9:41</span>
          <div className="flex gap-1 items-center">
            <div className="w-3 h-1.5 rounded-sm border border-white/60 relative">
              <div className="absolute inset-0.5 left-0.5 right-[3px] bg-white/60 rounded-[1px]" />
            </div>
          </div>
        </div>
        {/* Dynamic Island */}
        <div className="flex justify-center mb-2">
          <div className="w-24 h-7 bg-black rounded-full border border-zinc-800" />
        </div>
        {/* Notification card */}
        <div className="mx-3 mb-4 rounded-2xl overflow-hidden"
          style={{ background: "rgba(30,30,30,0.92)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-start gap-2.5 p-3">
            {/* App icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#0274C1" }}>
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-1 mb-0.5">
                <span className="text-[10px] text-zinc-400 font-medium">MORA</span>
                <span className="text-[9px] text-zinc-500">now</span>
              </div>
              <p className="text-white text-[12px] font-semibold leading-tight mb-0.5 truncate">
                {title || "عنوان الإشعار"}
              </p>
              <p className="text-zinc-300 text-[11px] leading-tight line-clamp-2">
                {body || "محتوى الإشعار سيظهر هنا"}
              </p>
            </div>
          </div>
        </div>
        {/* Home bar */}
        <div className="flex justify-center pb-3 pt-1">
          <div className="w-24 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Live Activity preview ──────────────────────────────────────────────────────
function LiveActivityPreview({ stage, orderId }: { stage: string; orderId: string }) {
  const cfg = ORDER_STAGES.find((s) => s.id === stage) ?? ORDER_STAGES[0];
  const Icon = cfg.icon;
  return (
    <div className="relative mx-auto" style={{ width: 260 }}>
      <div className="rounded-[32px] border-[3px] border-zinc-700 bg-black overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-white text-[10px] font-semibold">9:41</span>
        </div>
        {/* Dynamic Island - expanded */}
        <div className="flex justify-center mb-3">
          <div className="rounded-full border border-zinc-800 overflow-hidden"
            style={{ background: "#0A0A0A", width: 220, padding: "8px 14px" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: cfg.color + "22" }}>
                <Icon size={14} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-white text-[11px] font-semibold leading-tight">{cfg.label}</p>
                {orderId && (
                  <p className="text-zinc-500 text-[9px]">طلب #{orderId}</p>
                )}
              </div>
              {stage === "issue" && (
                <span className="text-[10px] rounded-full px-2 py-0.5 font-semibold"
                  style={{ background: "#EF444422", color: "#EF4444" }}>
                  تواصل
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="h-24 bg-zinc-900/50" />
        <div className="flex justify-center pb-3 pt-1">
          <div className="w-24 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Notifications() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Push form state
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushTarget, setPushTarget] = useState<"all" | "specific">("all");
  const [pushCustomerIds, setPushCustomerIds] = useState("");
  const [pushLinkType, setPushLinkType] = useState<"none" | "product" | "collection" | "chat">("none");
  const [pushLinkValue, setPushLinkValue] = useState("");

  // Live Activity form state
  const [laStage, setLaStage] = useState("confirmed");
  const [laOrderId, setLaOrderId] = useState("");
  const [laMessage, setLaMessage] = useState("");
  const [laCustomerIds, setLaCustomerIds] = useState("");

  const [activeTab, setActiveTab] = useState<"push" | "live">("push");

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery<Stats>({
    queryKey: ["notif-stats"],
    queryFn: () => apiFetch("/admin/notifications/stats"),
    refetchInterval: 30_000,
  });

  const { data: history = [] } = useQuery<NotifLog[]>({
    queryKey: ["notif-history"],
    queryFn: () => apiFetch("/admin/notifications"),
    refetchInterval: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const sendPush = useMutation({
    mutationFn: async () => {
      const ids = pushCustomerIds.split(",").map((s) => s.trim()).filter(Boolean);
      // Build deep-link URL
      let url: string | undefined;
      if (pushLinkType === "product" && pushLinkValue.trim()) {
        url = `/product/${pushLinkValue.trim()}`;
      } else if (pushLinkType === "collection" && pushLinkValue.trim()) {
        url = `/collection/${pushLinkValue.trim()}`;
      } else if (pushLinkType === "chat") {
        url = `/(tabs)/chat`;
      }
      return apiFetch<{ sent: number; success: number; failed: number }>("/admin/notifications/push", {
        method: "POST",
        body: JSON.stringify({
          title: pushTitle,
          body: pushBody,
          targetAll: pushTarget === "all",
          customerIds: ids,
          data: url ? { url } : {},
        }),
      });
    },
    onSuccess: (d) => {
      toast({ title: `تم الإرسال`, description: `${d.sent} جهاز — ${d.success} نجح، ${d.failed} فشل` });
      setPushTitle("");
      setPushBody("");
      setPushLinkType("none");
      setPushLinkValue("");
      qc.invalidateQueries({ queryKey: ["notif-stats"] });
      qc.invalidateQueries({ queryKey: ["notif-history"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const sendLiveActivity = useMutation({
    mutationFn: async () => {
      const ids = laCustomerIds.split(",").map((s) => s.trim()).filter(Boolean);
      return apiFetch<{ sent: number; success: number; failed: number }>("/admin/notifications/live-activity", {
        method: "POST",
        body: JSON.stringify({
          stage: laStage,
          orderId: laOrderId || undefined,
          message: laMessage || undefined,
          customerIds: ids.length > 0 ? ids : undefined,
        }),
      });
    },
    onSuccess: (d) => {
      toast({ title: "تم تحديث Live Activity", description: `${d.sent} جهاز` });
      setLaOrderId("");
      setLaMessage("");
      qc.invalidateQueries({ queryKey: ["notif-stats"] });
      qc.invalidateQueries({ queryKey: ["notif-history"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const statCards = [
    { label: "أجهزة مسجلة", value: stats?.tokens ?? 0, icon: Smartphone, color: "text-blue-500" },
    { label: "عملاء نشطون", value: stats?.customers ?? 0, icon: Users, color: "text-violet-500" },
    { label: "إجمالي المرسلة", value: stats?.totalSent ?? 0, icon: Send, color: "text-emerald-500" },
    { label: "نسبة النجاح", value: stats?.totalSent ? `${Math.round((stats.totalSuccess / stats.totalSent) * 100)}%` : "—", icon: BarChart2, color: "text-amber-500" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          أرسل إشعارات فورية وتحديثات Live Activity لعملائك
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="border rounded-xl p-4 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn("h-4 w-4", s.color)} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Platform breakdown */}
      {stats && (stats.ios + stats.android) > 0 && (
        <div className="border rounded-xl p-4 bg-card flex items-center gap-6">
          <span className="text-sm text-muted-foreground">الأجهزة:</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">🍎</span>
            <span className="font-semibold">{stats.ios}</span>
            <span className="text-xs text-muted-foreground">iOS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-semibold">{stats.android}</span>
            <span className="text-xs text-muted-foreground">Android</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b flex gap-1">
        <button
          onClick={() => setActiveTab("push")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "push"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            إشعار Push
          </div>
        </button>
        <button
          onClick={() => setActiveTab("live")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "live"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Activity
          </div>
        </button>
      </div>

      {/* Push notification form */}
      {activeTab === "push" && (
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="border rounded-xl p-5 bg-card space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              إرسال إشعار Push
            </h2>

            <div className="grid gap-2">
              <Label>العنوان</Label>
              <Input
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="مثال: تخفيضات حصرية 🎉"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground text-right">{pushTitle.length}/60</p>
            </div>

            <div className="grid gap-2">
              <Label>المحتوى</Label>
              <Textarea
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="مثال: خصم 20% على جميع المنتجات لفترة محدودة..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">{pushBody.length}/200</p>
            </div>

            <div className="grid gap-2">
              <Label>الجمهور المستهدف</Label>
              <div className="flex gap-3">
                {(["all", "specific"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPushTarget(t)}
                    className={cn(
                      "flex-1 border rounded-lg py-2 text-sm font-medium transition-colors",
                      pushTarget === t
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    {t === "all" ? "جميع العملاء" : "عملاء محددون"}
                  </button>
                ))}
              </div>
            </div>

            {pushTarget === "specific" && (
              <div className="grid gap-2">
                <Label>معرفات العملاء (مفصولة بفاصلة)</Label>
                <Input
                  value={pushCustomerIds}
                  onChange={(e) => setPushCustomerIds(e.target.value)}
                  placeholder="cus_abc123, cus_def456"
                  dir="ltr"
                />
              </div>
            )}

            {/* Deep-link destination */}
            <div className="grid gap-2">
              <Label>الوجهة عند الضغط على الإشعار</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { id: "none",       label: "بدون رابط",  emoji: "🚫" },
                  { id: "product",    label: "منتج",        emoji: "👕" },
                  { id: "collection", label: "كولكشن",      emoji: "🗂️" },
                  { id: "chat",       label: "المحادثة",    emoji: "💬" },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setPushLinkType(opt.id); setPushLinkValue(""); }}
                    className={cn(
                      "border rounded-lg py-2 px-2 text-xs font-medium transition-colors text-center",
                      pushLinkType === opt.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <div className="text-lg mb-0.5">{opt.emoji}</div>
                    {opt.label}
                  </button>
                ))}
              </div>
              {(pushLinkType === "product" || pushLinkType === "collection") && (
                <Input
                  value={pushLinkValue}
                  onChange={(e) => setPushLinkValue(e.target.value)}
                  placeholder={pushLinkType === "product" ? "معرّف المنتج (مثال: prod_abc123)" : "slug الكولكشن (مثال: summer-2025)"}
                  dir="ltr"
                  className="mt-1"
                />
              )}
            </div>

            <Button
              onClick={() => sendPush.mutate()}
              disabled={!pushTitle.trim() || !pushBody.trim() || sendPush.isPending}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {sendPush.isPending ? "جاري الإرسال..." : "إرسال الإشعار"}
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground text-center">معاينة</p>
            <PhonePreview title={pushTitle} body={pushBody} />
          </div>
        </div>
      )}

      {/* Live Activity form */}
      {activeTab === "live" && (
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="border rounded-xl p-5 bg-card space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              تحديث Live Activity — تتبع الطلب
            </h2>

            <div className="grid gap-2">
              <Label>رقم الطلب (اختياري)</Label>
              <Input
                value={laOrderId}
                onChange={(e) => setLaOrderId(e.target.value)}
                placeholder="ORD-2025-001"
                dir="ltr"
              />
            </div>

            <div className="grid gap-2">
              <Label>مرحلة الطلب</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ORDER_STAGES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setLaStage(s.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 border rounded-xl p-3 text-xs font-medium transition-all",
                        laStage === s.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-accent"
                      )}
                    >
                      <Icon className="h-5 w-5" style={{ color: laStage === s.id ? "#0274C1" : s.color }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {laStage === "issue" && (
              <div className="grid gap-2">
                <Label>رسالة المشكلة</Label>
                <Input
                  value={laMessage}
                  onChange={(e) => setLaMessage(e.target.value)}
                  placeholder="مثال: تعذّر التوصيل إلى عنوانك"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>معرفات العملاء (اتركها فارغة للكل)</Label>
              <Input
                value={laCustomerIds}
                onChange={(e) => setLaCustomerIds(e.target.value)}
                placeholder="cus_abc123, cus_def456"
                dir="ltr"
              />
            </div>

            <Button
              onClick={() => sendLiveActivity.mutate()}
              disabled={sendLiveActivity.isPending}
              className="w-full gap-2"
            >
              <Activity className="h-4 w-4" />
              {sendLiveActivity.isPending ? "جاري الإرسال..." : "تحديث Live Activity"}
            </Button>

            {/* Triggers reference */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">الـ Triggers التلقائية (مقترحة):</p>
              {[
                { emoji: "🛒", text: "سلة متروكة — بعد ساعتين (محلي)" },
                { emoji: "💰", text: "انخفاض السعر — عند تعديل سعر منتج في Wishlist" },
                { emoji: "📦", text: "عودة التوفر — عند إضافة مخزون لمنتج نافذ" },
                { emoji: "⭐", text: "تقييم ما بعد البيع — 48 ساعة بعد التوصيل" },
                { emoji: "💤", text: "إعادة التفاعل — 14 يوم بدون فتح التطبيق" },
              ].map((t) => (
                <div key={t.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t.emoji}</span>
                  <span>{t.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground text-center">معاينة Dynamic Island</p>
            <LiveActivityPreview stage={laStage} orderId={laOrderId} />
          </div>
        </div>
      )}

      {/* History */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">سجل الإشعارات المرسلة</h3>
          <Badge variant="secondary">{history.length}</Badge>
        </div>
        {history.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            لم يتم إرسال أي إشعارات بعد
          </div>
        ) : (
          <div className="divide-y">
            {history.map((n) => (
              <div key={n.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  n.type === "live_activity" ? "bg-violet-100 dark:bg-violet-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                )}>
                  {n.type === "live_activity"
                    ? <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    : <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <div className="flex items-center gap-1 justify-end">
                    {n.success > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />{n.success}
                      </span>
                    )}
                    {n.failed > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-red-500">
                        <XCircle className="h-3 w-3" />{n.failed}
                      </span>
                    )}
                    {n.tokens_sent === 0 && (
                      <span className="text-xs text-muted-foreground">لا توجد أجهزة</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString("ar-IQ", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
