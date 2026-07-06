---
name: IQD Pricing & Content Sections
description: Price currency (IQD), format utility, and content_sections API for warranty/testimonials
---

## Price Format
All product prices are in Iraqi Dinar (IQD). Display via `formatIQD(price)` in `artifacts/mora/lib/format.ts`:
- Input: `117000` → Output: `"117,000 IQD"` (English numerals, always LTR)
- Seed prices are ×1300 from the original USD seed values (e.g. $89.99 → 117,000 IQD)

**Why:** The app targets Iraqi market; prices must be in IQD with English numerals per product requirement.

## Content Sections API
- Table: `content_sections` (id, key, title, items JSON, sort_order, status, updated_at)
- Keys seeded: `warranty` (2 items: gold + silver) and `testimonials` (4 items)
- GET `/api/store/content-sections` → `{ data: Record<key, { id, key, title, items[], sortOrder }> }`
- GET/PUT `/api/admin/content-sections/:id` for admin editing
- Frontend fetch: `fetchContentSections()` in `artifacts/mora/lib/api.ts`
- Actual stored field for warranty AND testimonials item body is `item.text` (not `item.description` — admin UI used to bind warranty to the wrong field, a latent bug fixed when rich-text was added).

## Warranty/Testimonials Rich Text (added 2026-07-06)
Admin edit dialog for `warranty`/`testimonials` items now uses the same Tiptap `RichTextEditor` (`artifacts/admin/src/components/ui/RichTextEditor.tsx`) as blog posts — color, bold/italic/underline, headings, alignment, highlight. Saved as HTML into `item.text`.
Mora's `TextParagraph` (in `product/[id].tsx`) auto-detects HTML (`/<[a-z][\s\S]*>/i` test) and renders via `react-native-render-html`'s `RenderHtml` (added as a dependency — pure-JS, no native code, works fine on RN 0.81 new-arch despite peer-dep warnings); plain legacy text (no tags) still renders via plain `<Text>`.
**Why:** user wanted warranty/star-customers content editable with the same formatting power as product description, live on both mobile app and Expo web.
**How to apply:** any other content_sections item field displayed as free text on mora can follow the same HTML-detect-and-RenderHtml pattern instead of adding a new dependency per field.

## Product Page Sections
The product detail page (`app/product/[id].tsx`) renders below Add to Bag:
1. DESCRIPTION accordion (initialOpen=true)
2. Warranty section (accordion) — gold/silver cards from content_sections API
3. Testimonials section — horizontal scroll from content_sections API
4. Related products — horizontal scroll, same category filtered by fetchProducts()

## FloatingTabBar
- File: `artifacts/mora/components/FloatingTabBar.tsx`
- Used on: `collection/[slug].tsx` and `product/[id].tsx` (pages outside the tabs group)
- Web-only (Platform.OS !== 'web' returns null)
- Uses `useRouter` + `usePathname` from expo-router (no tab navigator props needed)
