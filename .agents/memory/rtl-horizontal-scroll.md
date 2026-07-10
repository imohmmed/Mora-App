---
name: RTL horizontal scroll carousels
description: How Arabic-mode horizontal ScrollView/FlatList carousels get first-item-on-right without mirroring content
---

## Rule
For horizontal carousels that must show item[0] on the right in Arabic (RTL reading order), do NOT use `inverted={isAr}`.
- On `ScrollView`, `inverted` is not a real prop — it silently does nothing (found in production: MoraPerfumesSection had this bug for a while).
- On `FlatList`, `inverted` works but mirrors all visual content via a scaleX transform (images/text flip backwards) unless every child is manually un-mirrored — not worth the complexity here.

**Fix:** flip `contentContainerStyle` to `flexDirection: "row-reverse"` when `isAr` (keeps item order and content unmirrored, item[0] lands at the right edge of the full content box), then scroll the ref to the end once on initial content layout via `onContentSizeChange` (since offset 0 in a row-reverse box shows the LAST items, not item[0]).

**How to apply:** shared hook `useRtlScrollToEnd(isAr)` in `artifacts/mora/lib/rtlScroll.ts` returns `{ ref, onContentSizeChange }` — attach both to any horizontal `ScrollView`/`FlatList`, plus `contentContainerStyle={[..., isAr && { flexDirection: "row-reverse" }]}`. Used in StoriesSection (circles + products rows), HomeSaleCollections, MoraPerfumesSection, and the home "NEW IN" FlatList.
