import db, { parseOne } from "./db.js";
import type { Row } from "./types.js";

export interface DiscountValidation {
  ok: boolean;
  discount?: Row;
  discountAmount: number;
  /** True for a `free_shipping` discount — the order route zeroes shipping. */
  freeShipping?: boolean;
  error?: string;
}

function fmtIQD(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} IQD`;
}

/**
 * Validates a discount code against the current cart (subtotal + item count) and
 * returns the computed discount amount. All checks are enforced server-side so
 * the client value is never trusted.
 */
export function validateDiscount(
  code: string,
  subtotal: number,
  itemCount: number,
): DiscountValidation {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return { ok: false, discountAmount: 0, error: "Enter a discount code" };

  const disc = parseOne(
    db.prepare(`SELECT * FROM discounts WHERE upper(code)=upper(?)`).get(trimmed) as Row | undefined,
  );
  if (!disc) return { ok: false, discountAmount: 0, error: "Invalid discount code" };

  if (disc["status"] !== "active") {
    return { ok: false, discountAmount: 0, error: "This discount code is not active" };
  }

  // Date window
  const now = Date.now();
  const startsAt = disc["startsAt"] ? Date.parse(disc["startsAt"] as string) : NaN;
  if (!Number.isNaN(startsAt) && now < startsAt) {
    return { ok: false, discountAmount: 0, error: "This discount code is not active yet" };
  }
  const endsAt = disc["endsAt"] ? Date.parse(disc["endsAt"] as string) : NaN;
  if (!Number.isNaN(endsAt) && now > endsAt) {
    return { ok: false, discountAmount: 0, error: "This discount code has expired" };
  }

  // Usage limit
  const usageLimit = disc["usageLimit"] as number | null;
  const usageCount = (disc["usageCount"] as number) ?? 0;
  if (usageLimit != null && usageCount >= usageLimit) {
    return { ok: false, discountAmount: 0, error: "This discount code has reached its usage limit" };
  }

  // Conditions
  const minSubtotal = disc["minSubtotal"] as number | null;
  if (minSubtotal != null && subtotal < minSubtotal) {
    return { ok: false, discountAmount: 0, error: `Spend at least ${fmtIQD(minSubtotal)} to use this code` };
  }
  const minItems = disc["minItems"] as number | null;
  if (minItems != null && itemCount < minItems) {
    return { ok: false, discountAmount: 0, error: `Add at least ${minItems} item${minItems > 1 ? "s" : ""} to use this code` };
  }

  // Compute the discount amount
  const type = disc["type"] as string;

  // Free-shipping discount: carries no monetary value; it zeroes the order's
  // shipping cost instead (handled in the order route via `freeShipping`).
  if (type === "free_shipping") {
    return { ok: true, discount: disc, discountAmount: 0, freeShipping: true };
  }

  const value = (disc["value"] as number) ?? 0;
  let amount = type === "percentage" ? (subtotal * value) / 100 : value;

  const maxDiscount = disc["maxDiscount"] as number | null;
  if (maxDiscount != null && amount > maxDiscount) amount = maxDiscount;

  // Never discount below zero
  if (amount > subtotal) amount = subtotal;
  if (amount < 0) amount = 0;
  amount = Math.round(amount);

  if (amount <= 0) {
    return { ok: false, discountAmount: 0, error: "This code does not apply to your order" };
  }

  return { ok: true, discount: disc, discountAmount: amount };
}

/** Increments the usage_count for a redeemed code (call once an order is committed/paid). */
export function redeemDiscount(code: string): void {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return;
  // Conditional increment so concurrent redemptions can never push usage past the
  // configured limit (no-op once the cap is reached).
  db.prepare(
    `UPDATE discounts SET usage_count = usage_count + 1
       WHERE upper(code)=upper(?) AND (usage_limit IS NULL OR usage_count < usage_limit)`,
  ).run(trimmed);
}
