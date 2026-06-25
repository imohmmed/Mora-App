---
name: Search collections + trending (admin-editable)
description: How the mora search page's BROWSE grid and TRENDING chips are driven by content_sections, edited in admin
---

# Search page BROWSE grid + TRENDING are admin-editable

The mora search page's 6 BROWSE cards and the TRENDING keyword chips are NOT hardcoded.
They are driven by `content_sections` rows (the reuse store, no DB migration) under two keys:

- `search_collections` — items: `{ id, nameEn, nameAr, icon, color, linkType, linkValue }`.
  `linkType ∈ category | gender | sale | collection | search`. `icon` is a Feather name.
- `trending` — items: `{ id, label }`.

**Where edited (admin) — WATCH THE FILE:**
- The `/collections` route renders `pages/collections/hub.tsx` (`CollectionsHub`), NOT `pages/collections/index.tsx`.
  `index.tsx` (`Collections`) is DEAD CODE — not imported by App.tsx anywhere. Edit hub.tsx (add a collapsible
  `*Section` component beside `MenuTabBarSection`/`StoriesSection`). hub.tsx's `apiFetch` returns `json.data` directly.
- Search collections → hub.tsx `SearchCollectionsSection` (mirrors `MenuTabBarSection` collapsible-card pattern).
- Trending → Content page `/content` → `pages/content/index.tsx` (`ContentHub`) — this one IS the routed file; new "Trending" tab.
Both seed defaults in `api-server/src/lib/db.ts` on fresh boot; CRUD already exists via `/admin/content-sections` + `/store/content-sections`.

**How mora navigates a card** (`(search)/search.tsx` → `handleCollectionPress`):
- `collection` → `/collection/{linkValue}` (regular `col_*` id or special slug)
- `category|gender|sale` → `/collection/[slug]` with params `slug=browse, bt=<type>, bv=<value>, bttl=<localized title>`
- `search` → sets the search query in place

**Browse mode in `collection/[slug].tsx`:** `isBrowse = bt in (category,gender,sale)`. When browsing it calls
`fetchBrowseProducts({type,value,title})` (lib/api.ts) which hits `/store/products?category=|gender=` (sale → `category=sale`)
and returns a `SpecialCollection`-shaped object (empty heroImage → picsum fallback). The browse query key MUST include
`bttl` or the hero title goes stale across locales (cached EN title shows on AR open).

**Why:** keeps the merchant in control of search-page entry points without code changes; the icon list is a curated
Feather/lucide-overlapping set (admin renders lucide preview, mora renders Feather) so names must exist in both.
