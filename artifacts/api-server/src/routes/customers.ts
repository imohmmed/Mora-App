import { Router } from "express";
import { customers, orders, type Customer } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.use("/admin/customers", requireAdmin);

router.get("/admin/customers", (req, res) => {
  const { q, segment } = req.query as Record<string, string>;
  let list = [...customers.values()];
  if (q) {
    const qlo = q.toLowerCase();
    list = list.filter(
      (c) =>
        c.firstName.toLowerCase().includes(qlo) ||
        c.lastName.toLowerCase().includes(qlo) ||
        c.email.toLowerCase().includes(qlo)
    );
  }
  if (segment) list = list.filter((c) => c.segment === segment);
  res.json({ data: list, meta: { total: list.length }, error: null });
});

router.get("/admin/customers/:id", (req, res) => {
  const customer = customers.get(req.params.id!);
  if (!customer) {
    res.status(404).json({ data: null, meta: {}, error: "Customer not found" });
    return;
  }
  const customerOrders = [...orders.values()].filter((o) => o.customerId === customer.id);
  res.json({ data: { ...customer, orders: customerOrders }, meta: {}, error: null });
});

router.post("/admin/customers", (req, res) => {
  const id = `cust_${Date.now()}`;
  const now = new Date().toISOString();
  const customer: Customer = {
    id,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    ordersCount: 0,
    totalSpent: 0,
    tags: [],
    segment: null,
    company: null,
    address: {},
    acceptsMarketing: false,
    createdAt: now,
    ...req.body,
  };
  customers.set(id, customer);
  res.status(201).json({ data: customer, meta: {}, error: null });
});

router.put("/admin/customers/:id", (req, res) => {
  const customer = customers.get(req.params.id!);
  if (!customer) {
    res.status(404).json({ data: null, meta: {}, error: "Customer not found" });
    return;
  }
  const updated = { ...customer, ...req.body, id: customer.id };
  customers.set(customer.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

// Segments
router.get("/admin/customers/segments", requireAdmin, (_req, res) => {
  const segments = [
    { id: "vip", name: "VIP Customers", count: [...customers.values()].filter((c) => c.segment === "vip").length },
    { id: "repeat", name: "Repeat Buyers", count: [...customers.values()].filter((c) => c.ordersCount > 2).length },
    { id: "new", name: "New Customers", count: [...customers.values()].filter((c) => c.ordersCount === 1).length },
    { id: "marketing", name: "Accepts Marketing", count: [...customers.values()].filter((c) => c.acceptsMarketing).length },
  ];
  res.json({ data: segments, meta: { total: segments.length }, error: null });
});

// Companies
router.get("/admin/customers/companies", requireAdmin, (_req, res) => {
  const companies = [...new Set([...customers.values()].filter((c) => c.company).map((c) => c.company!))].map(
    (name) => ({
      name,
      customerCount: [...customers.values()].filter((c) => c.company === name).length,
    })
  );
  res.json({ data: companies, meta: { total: companies.length }, error: null });
});

export default router;
