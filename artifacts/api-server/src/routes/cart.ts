import { Router } from "express";

const router = Router();

type CartLine = {
  productId: string;
  variantId: string;
  title: string;
  vendor: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
};

const carts = new Map<string, CartLine[]>();

router.get("/store/cart/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  const lines = carts.get(sessionId) ?? [];
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const totalItems = lines.reduce((s, l) => s + l.quantity, 0);
  res.json({ data: { sessionId, lines, subtotal, totalItems }, meta: {}, error: null });
});

router.put("/store/cart/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  const { lines } = req.body as { lines?: CartLine[] };
  if (!Array.isArray(lines)) {
    res.status(400).json({ data: null, meta: {}, error: "lines must be an array" });
    return;
  }
  carts.set(sessionId, lines);
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const totalItems = lines.reduce((s, l) => s + l.quantity, 0);
  res.json({ data: { sessionId, lines, subtotal, totalItems }, meta: {}, error: null });
});

router.delete("/store/cart/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  carts.delete(sessionId);
  res.json({ data: { sessionId, lines: [], subtotal: 0, totalItems: 0 }, meta: {}, error: null });
});

export default router;
