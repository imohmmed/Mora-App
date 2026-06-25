import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Send,
  Smartphone,
  Activity,
  CheckCircle2,
  XCircle,
  Package,
  Truck,
  Gift,
  AlertTriangle,
  Users,
  BarChart2,
  Edit3,
  RotateCcw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAdminToken } from "@/lib/api";

const API = "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
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

type TemplateVar = { name: string; label: string };
type TemplateItem = {
  key: string;
  label: string;
  vars: TemplateVar[];
  defaultTitle: string;
  defaultBody: string;
  title: string;
  body: string;
  isCustomized: boolean;
  updated_at: string | null;
};

const ORDER_STAGES = [
  { id: "confirmed", label: "تم التثبيت", icon: CheckCircle2, color: "#22C55E" },
  { id: "preparing", label: "يتم التجهيز", icon: Package, color: "#0274C1" },
  { id: "shipping",  label: "يتم الشحن",  icon: Truck,        color: "#0274C1" },
  { id: "delivered", label: "تم التوصيل", icon: Gift,         color: "#22C55E" },
  { id: "issue",     label: "مشكلة",       icon: AlertTriangle,color: "#EF4444" },
];

const TEMPLATE_GROUPS = [
  { label: "مرحلة التوصيل", keys: ["stage:confirmed","stage:preparing","stage:shipping","stage:delivered","stage:issue","stage:cancelled"] },
  { label: "حالة الطلب",    keys: ["status:processing","status:completed","status:cancelled"] },
  { label: "الشحن",         keys: ["fulfill:fulfilled"] },
  { label: "الدفع",         keys: ["financial:paid","financial:refunded"] },
];

// ── Notification phone preview ─────────────────────────────────────────────────
function PhonePreview({ title, body }: { title: string; body: string }) {
  const previewTitle = title.replace(/\{orderNum\}/g,"#AB3K").replace(/\{n\}/g,"#AB3K").replace(/\{price\}/g,"117,000 IQD").replace(/\{itemCount\}/g,"3").replace(/\{customerName\}/g,"أحمد");
  const previewBody  = body.replace(/\{orderNum\}/g,"#AB3K").replace(/\{n\}/g,"#AB3K").replace(/\{price\}/g,"117,000 IQD").replace(/\{itemCount\}/g,"3").replace(/\{customerName\}/g,"أحمد");
  return (
    <div className="relative mx-auto" style={{ width: 240 }}>
      <div className="rounded-[28px] border-[3px] border-zinc-700 bg-black overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-white text-[10px] font-semibold">9:41</span>
          <div className="flex gap-1 items-center">
            <div className="w-3 h-1.5 rounded-sm border border-white/60 relative">
              <div className="absolute inset-0.5 left-0.5 right-[3px] bg-white/60 rounded-[1px]" />
            </div>
          </div>
        </div>
        <div className="flex justify-center mb-2">
          <div className="w-20 h-6 bg-black rounded-full border border-zinc-800" />
        </div>
        <div className="mx-2.5 mb-4 rounded-2xl overflow-hidden"
          style={{ background: "rgba(30,30,30,0.92)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-start gap-2 p-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#0274C1" }}>
              <span className="text-white font-bold text-[10px]">M</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-1 mb-0.5">
                <span className="text-[9px] text-zinc-400 font-medium">MORA</span>
                <span className="text-[8px] text-zinc-500">now</span>
              </div>
              <p className="text-white text-[11px] font-semibold leading-tight mb-0.5 line-clamp-1">
                {previewTitle || "عنوان الإشعار"}
              </p>
              <p className="text-zinc-300 text-[10px] leading-tight line-clamp-2">
                {previewBody || "محتوى الإشعار سيظهر هنا"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-center pb-3 pt-1">
          <div className="w-20 h-1 bg-white/30 rounded-full" />
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

// ── Single template card ───────────────────────────────────────────────────────
function TemplateCard({
  tmpl,
  edit,
  onEdit,
  onInsertVar,
  onSave,
  onReset,
  isSaving,
  isResetting,
  focused,
  onFocus,
}: {
  tmpl: TemplateItem;
  edit: { title: string; body: string } | undefined;
  onEdit: (field: "title" | "body", val: string) => void;
  onInsertVar: (field: "title" | "body", varName: string) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  isResetting: boolean;
  focused: boolean;
  onFocus: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef  = useRef<HTMLTextAreaElement>(null);

  const currentTitle = edit?.title ?? tmpl.title;
  const currentBody  = edit?.body  ?? tmpl.body;
  const isDirty = edit !== undefined && (edit.title !== tmpl.title || edit.body !== tmpl.body);

  function handleVarChip(varName: string) {
    const focusedField = document.activeElement;
    if (focusedField === titleRef.current) {
      onInsertVar("title", varName);
    } else {
      onInsertVar("body", varName);
    }
  }

  return (
    <div
      className={cn(
        "border rounded-xl p-4 bg-card space-y-3 transition-all",
        focused ? "border-primary/50 shadow-sm" : "hover:border-border/80"
      )}
      onClick={onFocus}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm">{tmpl.label}</span>
        <div className="flex items-center gap-1.5">
          {tmpl.isCustomized && !isDirty && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">مخصص</Badge>
          )}
          {isDirty && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-400/30">غير محفوظ</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">العنوان</Label>
        <Input
          ref={titleRef}
          value={currentTitle}
          onChange={(e) => onEdit("title", e.target.value)}
          className="text-sm h-8"
          dir="rtl"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">المحتوى</Label>
        <Textarea
          ref={bodyRef}
          value={currentBody}
          onChange={(e) => onEdit("body", e.target.value)}
          rows={2}
          className="text-sm resize-none"
          dir="rtl"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-muted-foreground">متغيرات:</span>
        {tmpl.vars.map((v) => (
          <button
            key={v.name}
            type="button"
            onClick={(e) => { e.stopPropagation(); handleVarChip(v.name); }}
            className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-primary/40 text-primary/70 hover:bg-primary/5 font-mono transition-colors"
            title={`انقر لإضافة ${v.label} في الحقل المركّز`}
          >
            {`{${v.name}}`}
            <span className="font-sans text-muted-foreground ms-1">{v.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-0.5">
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          disabled={!isDirty || isSaving}
          className="flex-1 h-8 text-xs gap-1"
        >
          <Save className="h-3 w-3" />
          {isSaving ? "جاري الحفظ..." : "حفظ"}
        </Button>
        {tmpl.isCustomized && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            disabled={isResetting}
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive hover:border-destructive/40"
          >
            <RotateCcw className="h-3 w-3" />
            إعادة الضبط
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Notifications() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushTarget, setPushTarget] = useState<"all" | "specific">("all");
  const [pushCustomerIds, setPushCustomerIds] = useState("");
  const [pushLinkType, setPushLinkType] = useState<"none" | "product" | "collection" | "chat">("none");
  const [pushLinkValue, setPushLinkValue] = useState("");

  const [laStage, setLaStage] = useState("confirmed");
  const [laOrderId, setLaOrderId] = useState("");
  const [laMessage, setLaMessage] = useState("");
  const [laCustomerIds, setLaCustomerIds] = useState("");

  const [activeTab, setActiveTab] = useState<"push" | "live" | "templates">("push");

  // Template editor state
  const [localEdits, setLocalEdits] = useState<Record<string, { title: string; body: string }>>({});
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [resettingKey, setResettingKey] = useState<string | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
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

  const { data: templates = [] } = useQuery<TemplateItem[]>({
    queryKey: ["notif-templates"],
    queryFn: () => apiFetch("/admin/notification-templates"),
    staleTime: 10_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const sendPush = useMutation({
    mutationFn: async () => {
      const ids = pushCustomerIds.split(",").map((s) => s.trim()).filter(Boolean);
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
        body: JSON.stringify({ title: pushTitle, body: pushBody, targetAll: pushTarget === "all", customerIds: ids, data: url ? { url } : {} }),
      });
    },
    onSuccess: (d) => {
      toast({ title: `تم الإرسال`, description: `${d.sent} جهاز — ${d.success} نجح، ${d.failed} فشل` });
      setPushTitle(""); setPushBody(""); setPushLinkType("none"); setPushLinkValue("");
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
        body: JSON.stringify({ stage: laStage, orderId: laOrderId || undefined, message: laMessage || undefined, customerIds: ids.length > 0 ? ids : undefined }),
      });
    },
    onSuccess: (d) => {
      toast({ title: "تم تحديث Live Activity", description: `${d.sent} جهاز` });
      setLaOrderId(""); setLaMessage("");
      qc.invalidateQueries({ queryKey: ["notif-stats"] });
      qc.invalidateQueries({ queryKey: ["notif-history"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  function handleEditTemplate(key: string, field: "title" | "body", val: string) {
    const tmpl = templates.find((t) => t.key === key);
    if (!tmpl) return;
    setLocalEdits((prev) => ({
      ...prev,
      [key]: { title: prev[key]?.title ?? tmpl.title, body: prev[key]?.body ?? tmpl.body, [field]: val },
    }));
  }

  function handleInsertVar(key: string, field: "title" | "body", varName: string) {
    const tmpl = templates.find((t) => t.key === key);
    if (!tmpl) return;
    const current = localEdits[key]?.[field] ?? tmpl[field];
    setLocalEdits((prev) => ({
      ...prev,
      [key]: { title: prev[key]?.title ?? tmpl.title, body: prev[key]?.body ?? tmpl.body, [field]: current + `{${varName}}` },
    }));
  }

  async function handleSaveTemplate(key: string) {
    const edit = localEdits[key];
    if (!edit) return;
    setSavingKey(key);
    try {
      await apiFetch("/admin/notification-templates/" + key, {
        method: "PUT",
        body: JSON.stringify({ title: edit.title, body: edit.body }),
      });
      toast({ title: "تم الحفظ", description: "تم تحديث قالب الإشعار" });
      setLocalEdits((prev) => { const n = { ...prev }; delete n[key]; return n; });
      qc.invalidateQueries({ queryKey: ["notif-templates"] });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleResetTemplate(key: string) {
    setResettingKey(key);
    try {
      const data = await apiFetch<{ ok: boolean; title: string; body: string }>("/admin/notification-templates/" + key, { method: "DELETE" });
      toast({ title: "تم إعادة الضبط", description: "تم استعادة النص الافتراضي" });
      setLocalEdits((prev) => { const n = { ...prev }; delete n[key]; return n; });
      qc.invalidateQueries({ queryKey: ["notif-templates"] });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setResettingKey(null);
    }
  }

  const focusedTmpl = templates.find((t) => t.key === focusedKey);
  const focusedEdit = focusedKey ? localEdits[focusedKey] : undefined;
  const previewTitle = focusedEdit?.title ?? focusedTmpl?.title ?? "";
  const previewBody  = focusedEdit?.body  ?? focusedTmpl?.body  ?? "";

  const statCards = [
    { label: "أجهزة مسجلة",   value: stats?.tokens ?? 0,   icon: Smartphone, color: "text-blue-500" },
    { label: "عملاء نشطون",   value: stats?.customers ?? 0, icon: Users,       color: "text-violet-500" },
    { label: "إجمالي المرسلة", value: stats?.totalSent ?? 0, icon: Send,        color: "text-emerald-500" },
    {
      label: "نسبة النجاح",
      value: stats?.totalSent ? `${Math.round((stats.totalSuccess / stats.totalSent) * 100)}%` : "—",
      icon: BarChart2, color: "text-amber-500",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          أرسل إشعارات فورية وعدّل قوالب الإشعارات التلقائية
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
        {([
          { id: "push",      label: "إشعار Push",      icon: Bell },
          { id: "live",      label: "Live Activity",    icon: Activity },
          { id: "templates", label: "قوالب الإشعارات", icon: Edit3 },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
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
              <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="مثال: تخفيضات حصرية 🎉" maxLength={60} />
              <p className="text-xs text-muted-foreground text-right">{pushTitle.length}/60</p>
            </div>

            <div className="grid gap-2">
              <Label>المحتوى</Label>
              <Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="مثال: خصم 20% على جميع المنتجات لفترة محدودة..." rows={3} maxLength={200} />
              <p className="text-xs text-muted-foreground text-right">{pushBody.length}/200</p>
            </div>

            <div className="grid gap-2">
              <Label>الجمهور المستهدف</Label>
              <div className="flex gap-3">
                {(["all", "specific"] as const).map((t) => (
                  <button key={t} onClick={() => setPushTarget(t)}
                    className={cn("flex-1 border rounded-lg py-2 text-sm font-medium transition-colors",
                      pushTarget === t ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent")}>
                    {t === "all" ? "جميع العملاء" : "عملاء محددون"}
                  </button>
                ))}
              </div>
            </div>

            {pushTarget === "specific" && (
              <div className="grid gap-2">
                <Label>معرفات العملاء (مفصولة بفاصلة)</Label>
                <Input value={pushCustomerIds} onChange={(e) => setPushCustomerIds(e.target.value)} placeholder="cus_abc123, cus_def456" dir="ltr" />
              </div>
            )}

            <div className="grid gap-2">
              <Label>الوجهة عند الضغط على الإشعار</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { id: "none", label: "بدون رابط", emoji: "🚫" },
                  { id: "product", label: "منتج", emoji: "👕" },
                  { id: "collection", label: "كولكشن", emoji: "🗂️" },
                  { id: "chat", label: "المحادثة", emoji: "💬" },
                ] as const).map((opt) => (
                  <button key={opt.id} type="button"
                    onClick={() => { setPushLinkType(opt.id); setPushLinkValue(""); }}
                    className={cn("border rounded-lg py-2 px-2 text-xs font-medium transition-colors text-center",
                      pushLinkType === opt.id ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent")}>
                    <div className="text-lg mb-0.5">{opt.emoji}</div>
                    {opt.label}
                  </button>
                ))}
              </div>
              {(pushLinkType === "product" || pushLinkType === "collection") && (
                <Input value={pushLinkValue} onChange={(e) => setPushLinkValue(e.target.value)}
                  placeholder={pushLinkType === "product" ? "معرّف المنتج (مثال: prod_abc123)" : "slug الكولكشن (مثال: summer-2025)"}
                  dir="ltr" className="mt-1" />
              )}
            </div>

            <Button onClick={() => sendPush.mutate()} disabled={!pushTitle.trim() || !pushBody.trim() || sendPush.isPending} className="w-full gap-2">
              <Send className="h-4 w-4" />
              {sendPush.isPending ? "جاري الإرسال..." : "إرسال الإشعار"}
            </Button>
          </div>
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
              <Input value={laOrderId} onChange={(e) => setLaOrderId(e.target.value)} placeholder="AB3K" dir="ltr" />
            </div>

            <div className="grid gap-2">
              <Label>مرحلة الطلب</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ORDER_STAGES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button key={s.id} onClick={() => setLaStage(s.id)}
                      className={cn("flex flex-col items-center gap-1.5 border rounded-xl p-3 text-xs font-medium transition-all",
                        laStage === s.id ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent")}>
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
                <Input value={laMessage} onChange={(e) => setLaMessage(e.target.value)} placeholder="مثال: تعذّر التوصيل إلى عنوانك" />
              </div>
            )}

            <div className="grid gap-2">
              <Label>معرفات العملاء (اتركها فارغة للكل)</Label>
              <Input value={laCustomerIds} onChange={(e) => setLaCustomerIds(e.target.value)} placeholder="cus_abc123, cus_def456" dir="ltr" />
            </div>

            <Button onClick={() => sendLiveActivity.mutate()} disabled={sendLiveActivity.isPending} className="w-full gap-2">
              <Activity className="h-4 w-4" />
              {sendLiveActivity.isPending ? "جاري الإرسال..." : "تحديث Live Activity"}
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground text-center">معاينة Dynamic Island</p>
            <LiveActivityPreview stage={laStage} orderId={laOrderId} />
          </div>
        </div>
      )}

      {/* Template editor tab */}
      {activeTab === "templates" && (
        <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
          {/* Left: template list grouped */}
          <div className="space-y-6">
            {/* Info banner */}
            <div className="border rounded-xl p-4 bg-primary/5 border-primary/20 flex gap-3 items-start">
              <Edit3 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-semibold text-primary">قوالب الإشعارات التلقائية</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  عدّل نص الإشعار لكل حالة. الإشعارات ترسل تلقائياً للزبون عند تغيير حالة طلبه.
                  استخدم المتغيرات (مثل <code className="bg-muted px-1 rounded text-[10px]">{"{orderNum}"}</code>) لتُملأ تلقائياً بمعلومات الطلب.
                </p>
                <p className="text-muted-foreground text-xs">المتغيرات المتاحة في كل القوالب: <span className="font-mono">{"{orderNum}"}</span> · <span className="font-mono">{"{price}"}</span> · <span className="font-mono">{"{itemCount}"}</span> · <span className="font-mono">{"{customerName}"}</span></p>
              </div>
            </div>

            {TEMPLATE_GROUPS.map((group) => {
              const groupTemplates = group.keys.map((k) => templates.find((t) => t.key === k)).filter(Boolean) as TemplateItem[];
              if (groupTemplates.length === 0) return null;
              return (
                <div key={group.label} className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">{group.label}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {groupTemplates.map((tmpl) => (
                      <TemplateCard
                        key={tmpl.key}
                        tmpl={tmpl}
                        edit={localEdits[tmpl.key]}
                        onEdit={(field, val) => handleEditTemplate(tmpl.key, field, val)}
                        onInsertVar={(field, varName) => handleInsertVar(tmpl.key, field, varName)}
                        onSave={() => handleSaveTemplate(tmpl.key)}
                        onReset={() => handleResetTemplate(tmpl.key)}
                        isSaving={savingKey === tmpl.key}
                        isResetting={resettingKey === tmpl.key}
                        focused={focusedKey === tmpl.key}
                        onFocus={() => setFocusedKey(tmpl.key)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: sticky preview */}
          <div className="lg:sticky lg:top-6 space-y-3">
            <p className="text-sm font-medium text-muted-foreground text-center">
              {focusedTmpl ? `معاينة: ${focusedTmpl.label}` : "معاينة الإشعار"}
            </p>
            <PhonePreview title={previewTitle} body={previewBody} />
            {focusedTmpl && (
              <p className="text-center text-[10px] text-muted-foreground">
                المتغيرات تُعرض بقيم تجريبية
              </p>
            )}
            {!focusedTmpl && (
              <p className="text-center text-xs text-muted-foreground">
                اضغط على أي قالب لمعاينته
              </p>
            )}
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
          <div className="py-12 text-center text-muted-foreground text-sm">لم يتم إرسال أي إشعارات بعد</div>
        ) : (
          <div className="divide-y">
            {history.map((n) => (
              <div key={n.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  n.type === "live_activity" ? "bg-violet-100 dark:bg-violet-900/30" : "bg-blue-100 dark:bg-blue-900/30")}>
                  {n.type === "live_activity"
                    ? <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    : <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
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
