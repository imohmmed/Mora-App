---
name: FOR YOU recommendations
description: How the Mora home FOR YOU tab recommendation engine works and an Express routing gotcha it triggered
---

## Architecture
`GET /store/products/foryou?viewed=id1,id2,...&page=&limit=` (api-server `products.ts`) does the ranking server-side, not the client. The mobile/web app just sends up to the last 20 viewed product IDs (from AsyncStorage `mora_views`) and paginates through the response with the same infinite-scroll pattern as the ALL tab.

Scoring, when there is view history: for every unseen active product, sum a score against EACH viewed seed product (category match +4, shared tags +2 each, gender match +2, vendor match +1, price within 30% +1), then average by seed count (so a user with 1 view isn't penalized vs. one with 15), then add a small rating-weighted boost (`rating * log(1+ratingCount) * 0.15`) as a tie-breaker. Sorted desc with random jitter on ties. If ranked matches run out before filling a page, remaining unseen products are appended unscored so the feed never goes empty.

No view history (new user): fall back to rating-weighted random shuffle across all active products — never an empty/static list.

**Why:** user wants FOR YOU to feel personalized by *everything* about previously-viewed products (name/tags/category/gender/rating), not just a single "top tag + top gender" heuristic, while still guaranteeing a full feed when interests are thin.

## Express routing gotcha
`/store/products/foryou` MUST be registered before the generic `/store/products/:id` route, or Express matches `:id="foryou"` first and the client gets `{"error":"Product not found"}`. Same applies to any other literal-segment route added under `/store/products/*` — always place literal routes above param routes in this file.

## How to apply
When extending recommendations further (e.g. per-user server-side history instead of client-supplied `viewed` ids), keep the multi-seed averaging approach so scores stay comparable regardless of how much history a user has.
