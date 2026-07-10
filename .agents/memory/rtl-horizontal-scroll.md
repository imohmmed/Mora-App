---
name: RTL horizontal scroll carousels
description: How Arabic-mode horizontal ScrollView/FlatList carousels get first-item-on-right without mirroring content
---

## Rule
For horizontal carousels that must show item[0] on the right in Arabic (RTL reading order), do NOT use `inverted={isAr}`.
- On `ScrollView`, `inverted` is not a real prop — it silently does nothing (found in production: MoraPerfumesSection had this bug for a while).
- On `FlatList`, `inverted` works but mirrors all visual content via a scaleX transform (images/text flip backwards) unless every child is manually un-mirrored — not worth the complexity here.

**Fix:** flip `contentContainerStyle` to `flexDirection: "row-reverse"` when `isAr` (keeps item order and content unmirrored, item[0] lands at the right edge of the full content box), then scroll the ref to the end once on initial content layout via `onContentSizeChange` (since offset 0 in a row-reverse box shows the LAST items, not item[0]).

**Gotcha found on first pass:** `row-reverse` alone is NOT enough for short rows (content narrower than the screen, e.g. 1-2 items). ScrollView's content container shrink-wraps to the sum of its children and sits flush at the LEFT of the viewport by default — `row-reverse` only reorders items *inside* that box, it does not push the box itself to the right edge, so a short row still looks left-anchored in Arabic. Fix: also add `flexGrow: 1, justifyContent: "flex-end"` to the content style when `isAr`, so short content gets right-aligned while long/overflowing content still scrolls correctly via the row-reverse + scrollToEnd combo.

**How to apply:** `artifacts/mora/lib/rtlScroll.ts` exports `useRtlScrollToEnd(isAr)` (returns `{ ref, onContentSizeChange }`) and `rtlContentStyle(isAr)` (returns the row-reverse/flexGrow/justifyContent object or `undefined`). Attach the ref + onContentSizeChange to the ScrollView/FlatList, and spread `rtlContentStyle(isAr)` into `contentContainerStyle`. Used in StoriesSection (circles + products rows), HomeSaleCollections, MoraPerfumesSection, and the home "NEW IN" FlatList.
