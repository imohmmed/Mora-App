import db from "./db.js";

export interface TemplateVar {
  name: string;
  label: string;
}

export interface TemplateDefault {
  key: string;
  label: string;
  title: string;
  body: string;
  vars: TemplateVar[];
}

const ALL_VARS: TemplateVar[] = [
  { name: "orderNum",      label: "رقم الطلب" },
  { name: "price",         label: "سعر الطلب" },
  { name: "itemCount",     label: "عدد المنتجات" },
  { name: "customerName",  label: "اسم الزبون" },
];

const RESTOCK_VARS: TemplateVar[] = [
  { name: "productName",   label: "اسم المنتج" },
];

const CART_VARS: TemplateVar[] = [
  { name: "customerName",  label: "اسم الزبون" },
  { name: "itemCount",     label: "عدد المنتجات" },
];

export const TEMPLATE_DEFAULTS: TemplateDefault[] = [
  // ── مرحلة التوصيل ──────────────────────────────────────────────────────────
  {
    key: "stage:confirmed",
    label: "تم تثبيت الطلب",
    title: "تم تثبيت طلبك ✅",
    body: "استلمنا طلبك {orderNum} وراح نبلش نجهزه إلك",
    vars: ALL_VARS,
  },
  {
    key: "stage:preparing",
    label: "تم تجهيز الطلب",
    title: "تم تجهيز طلبك 📦",
    body: "نجهز طلبك {orderNum} ونحضّره للشحن",
    vars: ALL_VARS,
  },
  {
    key: "stage:shipping",
    label: "الطلب في الطريق",
    title: "طلبك في الطريق 🚚",
    body: "تم تسليم طلبك {orderNum} لشركة التوصيل، الوصول خلال 1-2 يوم",
    vars: ALL_VARS,
  },
  {
    key: "stage:delivered",
    label: "تم التوصيل",
    title: "تم توصيل طلبك 🎉",
    body: "نتمنى ينال طلبك {orderNum} إعجابك، انطينا رأيك",
    vars: ALL_VARS,
  },
  {
    key: "stage:issue",
    label: "مشكلة بالطلب",
    title: "صارت مشكلة بطلبك ⚠️",
    body: "تواصل ويانا بخصوص طلبك {orderNum} حتى نحلها إلك",
    vars: ALL_VARS,
  },
  {
    key: "stage:cancelled",
    label: "إلغاء الطلب (مرحلة التوصيل)",
    title: "تم إلغاء طلبك ❌",
    body: "تم إلغاء طلبك {orderNum}. تواصل ويانا للمساعدة",
    vars: ALL_VARS,
  },
  // ── المرتجعات ──────────────────────────────────────────────────────────────
  {
    key: "stage:returned",
    label: "راجع كلي",
    title: "تم إرجاع طلبك 📦",
    body: "تم تسجيل طلبك {orderNum} كمرتجع. تواصل ويانا إذا عندك أي استفسار",
    vars: ALL_VARS,
  },
  {
    key: "stage:partial_return",
    label: "راجع جزئي",
    title: "تم توصيل طلبك (جزئي) 📦",
    body: "تم توصيل طلبك {orderNum} مع إرجاع جزء من القطع. إذا شفت أي خلل أو مشكلة بالقطع راسلنا حتى نساعدك",
    vars: ALL_VARS,
  },
  // ── حالة الطلب العامة ──────────────────────────────────────────────────────
  {
    key: "status:processing",
    label: "قيد المعالجة",
    title: "جارٍ تجهيز طلبك 📦",
    body: "بدأنا بتجهيز طلبك {orderNum}",
    vars: ALL_VARS,
  },
  {
    key: "status:completed",
    label: "مكتمل",
    title: "اكتمل طلبك 🎉",
    body: "تم إكمال طلبك {orderNum}، شكراً لتسوقك معنا",
    vars: ALL_VARS,
  },
  {
    key: "status:cancelled",
    label: "ملغي (الحالة العامة)",
    title: "تم إلغاء طلبك ❌",
    body: "تم إلغاء طلبك {orderNum}. تواصل معنا للمساعدة",
    vars: ALL_VARS,
  },
  // ── الشحن ─────────────────────────────────────────────────────────────────
  {
    key: "fulfill:fulfilled",
    label: "تم الشحن",
    title: "تم شحن طلبك 🚚",
    body: "طلبك {orderNum} في طريقه إليك",
    vars: ALL_VARS,
  },
  // ── الدفع ─────────────────────────────────────────────────────────────────
  {
    key: "financial:paid",
    label: "تم الدفع",
    title: "تم تأكيد الدفع ✅",
    body: "تم استلام دفعة طلبك {orderNum} بمبلغ {price}",
    vars: ALL_VARS,
  },
  {
    key: "financial:refunded",
    label: "تم الاسترجاع",
    title: "تم استرجاع المبلغ 💸",
    body: "تم استرجاع مبلغ طلبك {orderNum}",
    vars: ALL_VARS,
  },
  // ── توفر منتج (Notify me) ───────────────────────────────────────────────────
  {
    key: "restock:available",
    label: "رجع متوفر (تنبيهي عند التوفر)",
    title: "{productName} رجع متوفر 🎉",
    body: "المنتج اللي تنتظره \"{productName}\" صار متوفر، اطلبه قبل ما يخلص",
    vars: RESTOCK_VARS,
  },
  // ── الاستبدال والاسترجاع ────────────────────────────────────────────────────
  {
    key: "exchange:approved",
    label: "تمت الموافقة على الاستبدال",
    title: "تمت الموافقة على طلب الاستبدال ✅",
    body: "تمت الموافقة على طلب الاستبدال {orderNum} — سيتم التواصل معك خلال يومين كحد أقصى",
    vars: ALL_VARS,
  },
  {
    key: "refund:approved",
    label: "تمت الموافقة على الاسترجاع",
    title: "تمت الموافقة على طلب الاسترجاع ✅",
    body: "تمت الموافقة على طلب استرجاع الفلوس {orderNum} — سيتم التواصل معك خلال يومين كحد أقصى",
    vars: ALL_VARS,
  },
  {
    key: "exchange:rejected",
    label: "رفض طلب الاستبدال",
    title: "بخصوص طلب الاستبدال",
    body: "نعتذر، ما كدرنا نوافق على طلب الاستبدال {orderNum} — تواصل ويانا للتفاصيل",
    vars: ALL_VARS,
  },
  {
    key: "refund:rejected",
    label: "رفض طلب الاسترجاع",
    title: "بخصوص طلب الاسترجاع",
    body: "نعتذر، ما كدرنا نوافق على طلب الاسترجاع {orderNum} — تواصل ويانا للتفاصيل",
    vars: ALL_VARS,
  },
  // ── السلة المتروكة ──────────────────────────────────────────────────────────
  {
    key: "cart:abandoned",
    label: "نسيت شيء في السلة",
    title: "نسيت شي بالسلة 🛒",
    body: "{customerName} عدك {itemCount} منتج بالسلة ينتظرك، كمّل طلبك قبل لا يخلص",
    vars: CART_VARS,
  },
];

const DEFAULTS_MAP = Object.fromEntries(TEMPLATE_DEFAULTS.map((d) => [d.key, d]));

function replaceVars(s: string, vars: Record<string, string>): string {
  return s
    .replace(/\{orderNum\}/g, vars.orderNum ?? "")
    .replace(/\{n\}/g, vars.orderNum ?? "")
    .replace(/\{price\}/g, vars.price ?? "")
    .replace(/\{itemCount\}/g, vars.itemCount ?? "")
    .replace(/\{customerName\}/g, vars.customerName ?? "")
    .replace(/\{productName\}/g, vars.productName ?? "");
}

export function getTemplate(
  key: string,
  vars: Record<string, string> = {}
): { title: string; body: string } | null {
  const def = DEFAULTS_MAP[key];
  if (!def) return null;

  const row = db
    .prepare("SELECT title, body FROM notification_templates WHERE key = ?")
    .get(key) as { title: string; body: string } | undefined;

  return {
    title: replaceVars(row?.title ?? def.title, vars),
    body:  replaceVars(row?.body  ?? def.body,  vars),
  };
}
