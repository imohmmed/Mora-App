---
name: Bilingual product option names
description: How variant option group names are stored bilingually and displayed by app language
---

# Bilingual product option/variant names

Option groups are stored in `products.option_definitions` (JSON, pure passthrough — no API or DB schema change needed; api-server JSON-stringifies it as-is). Shape is now `{ nameEn?, nameAr?, values: string[] }`. Legacy rows may have only `{ name }`.

**Display rule (mora):** label = lang==="ar" ? (nameAr||nameEn||name) : (nameEn||nameAr||name). Fallbacks: option1 present → "القياس"/"SIZE", else "الخيارات"/"OPTIONS". Used in product/[id].tsx variant section header and in QuickAddSheet label1/label2 (by optionDefinitions index 0/1, falling back to inferLabel()). QuickAddSheet useMemo deps must include `product?.optionDefinitions` and `lang`.

**Admin:** VariantBuilder OptionGroup type = `{ name?, nameEn?, nameAr?, values }`; `optionGroupName(g)` helper returns nameEn||nameAr||name for active-checks/cartesian. Two inputs per group (English LTR + Arabic RTL). detail.tsx `normalizeOptionGroups()` migrates legacy single `name` into nameEn/nameAr via Arabic-script detection `/[\u0600-\u06FF]/` on load; deriveOptionGroups() emits nameEn defaults.

**Why:** product page previously hardcoded "SIZE". Admin needed separate AR/EN names so the storefront shows the right language. Keep legacy `name` readable forever (don't drop it) for backward compat.
