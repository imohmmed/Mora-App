---
name: Returns system
description: Order return stages, inventory rules, and why return stages are terminal
---

## Stage keys and rules
- `returned` (full): restock ALL line items, status→cancelled.
- `partial_return`: restock only picked quantities; order still counts as delivered — mobile review gating must include it.
- `returned_no_restock`: damaged goods, zero inventory change, status→cancelled.

**Why terminal:** once a return restocks inventory, changing the stage again (or bulk stage change) would desync stock. The API guards with 409 on any second return; the admin bulk stage-change select excludes all three return stages. Never add return stages to bulk or stage-change flows.

**How to apply:**
- Restocked quantities live in `orders.returned_items` (JSON) — use it for any future analytics/refunds.
- Duplicate variantIds in a partial request are merged before validating qty ≤ ordered.
- Restock triggers the existing 0→>0 restock push notifications.
- Admin orders list stage filtering is client-side on `deliveryStage` — new stages only need chips, no API filter work.
- Live Activity has no return stages: map full/no_restock→"cancelled", partial→"delivered".
