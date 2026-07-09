---
name: Analytics profit & demographics data gaps
description: Why gross/net profit is an estimate and why age/gender breakdowns can be empty in /analytics
---

Orders don't snapshot line-item cost at time of sale, so gross/net profit in the
deep sales analytics is computed using **current** product/variant `cost` values
applied retroactively — a best-effort estimate, not a true historical P&L. If a
product's cost changes later, past profit figures shift too.

**Why:** No cost-at-sale-time column exists on order line items; adding one is a
bigger schema change than the request needed, and the estimate is still 100% real
data (no fabrication), just not point-in-time-accurate.

Customer `gender` and `birth_year` columns exist on the `customers` table but are
always NULL until customers/admin actually populate them — no signup/account UI
writes them yet. The customer-insights endpoint returns `hasDemographicData:false`
and the admin UI shows a "no tracking" placeholder until real values exist.

**How to apply:** If asked to wire up age/gender breakdowns end-to-end, you must
also build the input UI (mora account settings or admin customer edit) that writes
`gender`/`birth_year` — the columns alone don't produce data.
