---
name: Home page NEW IN vs category tab grid
description: Why NEW IN and the ALL/WOMEN/MEN/FOR YOU tabs must be two independent product lists, not one shared list
---

## Decision
On the Mora home screen, "NEW IN" and the bottom `CategoryTabs` (ALL/WOMEN/MEN/FOR YOU) are two **separate, independent** queries/lists:
- NEW IN: fixed `useQuery(["new-in-products"], () => fetchProducts({ sort: "newest", limit: 20, page: 1 }))`, horizontal scroll, never changes when a tab is tapped.
- Category tabs: their own `useInfiniteQuery` (or `products-foryou`), rendered as the outer page `FlatList`'s `numColumns={2}` grid, with `CategoryTabs` + its own section header living in `ListHeaderComponent` above that grid.

**Why:** Originally both were driven by the same `activeCategory` state and the same product FlatList placed right under the NEW IN header near the top of the page. Since `CategoryTabs` lives at the bottom of the page, tapping a tab changed a list the user couldn't see (it was scrolled off-screen above), producing the illusion of "nothing happens" / "no products show up" — plus NEW IN would change too, which the user explicitly did not want ("NEW IN يكون ثابتة ما الها دخل بأي شيء").

## How to apply
If more tab-driven sections are added to the home page, give each its own query and keep any tab-triggered content grid physically adjacent to (below) its own tab control — never reuse a shared list for two different UI triggers.
