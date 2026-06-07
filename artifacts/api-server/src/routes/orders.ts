import { Router } from "express";
import { orders, type Order } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

// ─── Public: customer order lookup ────────────────────────────────────────────

router.get("/store/orders", (req, res) => {
  const { email } = req.query as Record<string, string>;
  let list = [...orders.values()].filter((o) => !o.isDraft && !o.isAbandoned);
  if (email) list = list.filter((o) => o.email.toLowerCase() === email.toLowerCase());
  res.json({ data: list, meta: { total: list.length }, error: null });
});

router.get("/store/orders/:id", (req, res) => {
  const order = orders.get(req.params.id!);
  if (!order) {
    res.status(404).json({ data: null, meta: {}, error: "Order not found" });
    return;
  }
  res.json({ data: order, meta: {}, error: null });
});

// ─── Admin endpoints ──────────────────────────────────────────────────────────

router.use("/admin/orders", requireAdmin);

router.get("/admin/orders", (req, res) => {
  const { status, type } = req.query as Record<string, string>;
  let list = [...orders.values()];
  if (type === "drafts") list = list.filter((o) => o.isDraft);
  else if (type === "abandoned") list = list.filter((o) => o.isAbandoned);
  else list = list.filter((o) => !o.isDraft && !o.isAbandoned);
  if (status) list = list.filter((o) => o.status === status);
  res.json({ data: list, meta: { total: list.length }, error: null });
});

router.get("/admin/orders/:id", (req, res) => {
  const order = orders.get(req.params.id!);
  if (!order) {
    res.status(404).json({ data: null, meta: {}, error: "Order not found" });
    return;
  }
  res.json({ data: order, meta: {}, error: null });
});

router.post("/admin/orders", requireAdmin, (req, res) => {
  const id = `ord_${Date.now()}`;
  const now = new Date().toISOString();
  const num = orders.size + 1001;
  const order: Order = {
    id,
    orderNumber: `#${num}`,
    customerId: null,
    email: "",
    status: "pending",
    financialStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    subtotal: 0,
    shipping: 5.99,
    tax: 0,
    total: 0,
    currency: "USD",
    shippingAddress: {},
    lineItems: [],
    note: "",
    tags: [],
    isDraft: true,
    isAbandoned: false,
    createdAt: now,
    updatedAt: now,
    ...req.body,
  };
  orders.set(id, order);
  res.status(201).json({ data: order, meta: {}, error: null });
});

router.put("/admin/orders/:id", requireAdmin, (req, res) => {
  const key = String(req.params["id"]);
  const order = orders.get(key);
  if (!order) {
    res.status(404).json({ data: null, meta: {}, error: "Order not found" });
    return;
  }
  const updated = { ...order, ...req.body, id: order.id, updatedAt: new Date().toISOString() };
  orders.set(order.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

export default router;
