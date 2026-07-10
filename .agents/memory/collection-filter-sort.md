---
name: Collection filter/sort implementation
description: How product filter (price/color/tags) + sort (bestselling/price/newest) works on collection/browse screens
---

Filter and sort for category/collection listing screens is implemented **client-side** in the collection screen component, applied over the already-fetched product list (regular collections, special collections, and browse-by-category/gender/sale all return full product arrays from their existing endpoints — no new backend query params were added).

**Why:** the three collection data paths (fetchCollection, fetchSpecialCollection, fetchBrowseProducts) already return complete `Product[]` payloads with variants/tags/price, so filtering/sorting in-memory avoids touching three separate backend routes and keeps behavior identical across all listing types. Bestselling sort uses `soldCount` (mapped from `products.sold_count` via the snake_case→camelCase row parser).

**How to apply:** color options come from `product.optionDefinitions.find(d => d.type === "color").colorEntries` (name+hex), not from variant.option1/option2 directly — color square swatches must render at borderRadius ~3-6, never circular. Tag filter is AND-match across `product.tags`. Filter/sort UI (and the underlying state) lives per-screen; if a new listing screen is added, the same in-memory filter/sort logic needs to be duplicated (no shared hook yet) — consider extracting one if a third screen needs it.
