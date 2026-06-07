---
name: Mora API response envelope
description: All Mora API endpoints return { data, meta, error } — not named fields
---

## The Rule
Every endpoint at `http://localhost:8080/api/*` returns the same envelope:
```json
{ "data": <payload>, "meta": { ...pagination... }, "error": null | "message" }
```

**Why:** The API server wraps all responses in this envelope for consistency.

**How to apply:** The store's `src/lib/api.ts` must unwrap and reshape responses before returning to React Query consumers. Pattern:
```ts
const json = await res.json() as ApiResponse<Product[]>;
return { products: json.data, total: json.meta.total as number };
```

## Known field name differences (DB camelCase vs page expectations)
- Products: `comparePrice` (not `compareAtPrice`)
- Blog posts: `body` (not `content`), also has `handle`, `publishedAt`, `status`
- Orders: `lineItems` array (parsed from JSON column), `shippingAddress` object — no `customerName` field
- Collections: no `products` array — must fetch products separately via `/store/products?limit=N`
- Collections detail: has `productsCount` (integer), `image`, `title`, `description` — no `slug`

## Store orders
The `/api/store/orders` endpoint filters by `lower(email)`. Seed emails follow pattern `firstname.lastname@example.com` (lowercase, no spaces in last name). E.g. `sara.alhassan@example.com`.
