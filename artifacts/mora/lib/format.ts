/**
 * Format a price number as Iraqi Dinar.
 * Numbers always rendered in English (LTR) regardless of app language.
 * Example EN: 50000 → "50,000 IQD"
 * Example AR: 50000 → "50,000 د.ع"
 *
 * Language is set globally via setFormatLang() — called by LanguageContext
 * whenever the app language changes, so all call sites get it automatically
 * without needing to pass a lang param.
 */

let _lang = "en";

export function setFormatLang(lang: string) {
  _lang = lang;
}

export function formatIQD(price: number | null | undefined): string {
  if (price == null) return "";
  const rounded = Math.round(price);
  const formatted = rounded.toLocaleString("en-US");
  return _lang === "ar" ? `${formatted} د.ع` : `${formatted} IQD`;
}
