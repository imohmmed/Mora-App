// Bilingual dictionary for the Mora admin panel, merged from per-cluster modules.
// Arabic (ar) is the default/RTL language; English (en) is the LTR fallback.
// Each cluster owns a file in ./dict to keep edits conflict-free.
// Use {var} placeholders for interpolation, e.g. t("dashboard.subtitle", { date }).

import { common } from "./dict/common";
import { dashboard } from "./dict/dashboard";
import { analytics } from "./dict/analytics";
import { orders } from "./dict/orders";
import { products } from "./dict/products";
import { collections } from "./dict/collections";
import { customers } from "./dict/customers";
import { discounts } from "./dict/discounts";
import { content } from "./dict/content";
import { notifications } from "./dict/notifications";
import { settings } from "./dict/settings";
import { login } from "./dict/login";
import { chat } from "./dict/chat";

const modules = [
  common, dashboard, analytics, orders, products, collections,
  customers, discounts, content, notifications, settings, login, chat,
];

function merge(lang: "ar" | "en"): Record<string, string> {
  return Object.assign({}, ...modules.map((m) => m[lang]));
}

export const translations = {
  ar: merge("ar"),
  en: merge("en"),
} as const;

export type TranslationKey = string;
