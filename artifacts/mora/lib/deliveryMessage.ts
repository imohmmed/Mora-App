// Delivery type chosen at checkout.
export type DeliveryType = "standard" | "express" | "pickup";

// Arabic delivery-duration line shown in the Live Activity / Dynamic Island.
// Returns "" for terminal/exception stages so the widget falls back to its
// own per-stage subtitle. Mirrors deliveryMessage() in api-server/src/routes/orders.ts.
export function deliveryMessage(deliveryType: string, stage: string): string {
  if (stage === "delivered" || stage === "issue" || stage === "cancelled") return "";
  if (deliveryType === "pickup") return "سيتم تجهيزه لك في المحل";
  if (stage === "shipping") return "مدة التوصيل من 1-2 يوم";
  if (deliveryType === "express") return "يتم التوصيل الطلب من 1-3 ايام";
  return "مدة التوصيل من 1-5 ايام";
}
