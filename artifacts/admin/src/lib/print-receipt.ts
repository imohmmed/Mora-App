import { formatIQD } from "./format";
import { fmt } from "./date";

export function printReceipts(orders: any[]) {
  const rows = orders.map((o) => {
    const addr  = (o.shippingAddress ?? {}) as Record<string, string>;
    const items = (o.lineItems ?? []) as any[];
    const variant = (item: any) => {
      const v = [item.option1, item.option2].filter(Boolean).join(" / ") || item.variantTitle || "";
      return v && v !== "Default Title" ? `<br><span class="variant">${v}</span>` : "";
    };
    return `
<div class="receipt">
  <div class="brand">MORA</div>
  <div class="sub">${fmt(o.createdAt, "MMM d, yyyy — h:mm a")}</div>
  <div class="divider"></div>
  <table class="info">
    <tr><td class="lbl">Order</td><td><b>#${o.orderNumber}</b></td></tr>
    ${addr["fullName"]  ? `<tr><td class="lbl">Name</td><td>${addr["fullName"]}</td></tr>` : ""}
    ${addr["phone"]     ? `<tr><td class="lbl">Phone 1</td><td dir="ltr">${addr["phone"]}</td></tr>` : ""}
    ${addr["phone2"]    ? `<tr><td class="lbl">Phone 2</td><td dir="ltr">${addr["phone2"]}</td></tr>` : ""}
    ${addr["city"]      ? `<tr><td class="lbl">City</td><td>${addr["city"]}</td></tr>` : ""}
    ${addr["district"]  ? `<tr><td class="lbl">District</td><td>${addr["district"]}</td></tr>` : ""}
    ${addr["landmark"]  ? `<tr><td class="lbl">Landmark</td><td>${addr["landmark"]}</td></tr>` : ""}
    ${addr["instagram"] ? `<tr><td class="lbl">Instagram</td><td>@${addr["instagram"]}</td></tr>` : ""}
  </table>
  <div class="divider"></div>
  <table class="items" width="100%">
    <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th></tr></thead>
    <tbody>
      ${items.map((item: any) => `
      <tr>
        <td>${item.title ?? ""}${variant(item)}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${formatIQD(Number(item.price) * Number(item.quantity))}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <div class="divider"></div>
  ${o.shipping > 0
    ? `<div class="row"><span>Shipping</span><span>${formatIQD(o.shipping)}</span></div>`
    : `<div class="row"><span>Shipping</span><span class="free">Free</span></div>`}
  ${o.discountAmount > 0 ? `<div class="row"><span>Discount</span><span class="discount">-${formatIQD(o.discountAmount)}</span></div>` : ""}
  <div class="row total"><span>TOTAL</span><span>${formatIQD(o.total)}</span></div>
  ${o.note ? `<div class="divider"></div><div class="note">${o.note}</div>` : ""}
  <div class="footer">moramoda.tech</div>
</div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Mora Receipts — ${orders.length} order${orders.length !== 1 ? "s" : ""}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; background: #fff; color: #111; }
  .receipt {
    width: 72mm;
    padding: 6mm 4mm;
    margin: 0 auto;
    page-break-after: always;
  }
  .receipt:last-child { page-break-after: auto; }
  .brand { font-size: 20px; font-weight: bold; text-align: center; letter-spacing: 3px; margin-bottom: 2px; }
  .sub { font-size: 9px; text-align: center; color: #555; margin-bottom: 4px; }
  .divider { border-top: 1px dashed #999; margin: 5px 0; }
  table.info { width: 100%; border-collapse: collapse; }
  table.info td { padding: 1.5px 2px; vertical-align: top; }
  td.lbl { color: #666; width: 72px; white-space: nowrap; }
  table.items { border-collapse: collapse; width: 100%; }
  table.items th { font-size: 9px; text-transform: uppercase; color: #666; border-bottom: 1px solid #ddd; padding: 2px; }
  table.items th.center { text-align: center; }
  table.items th.right { text-align: right; }
  table.items td { padding: 3px 2px; vertical-align: top; }
  .center { text-align: center; }
  .right { text-align: right; }
  .variant { font-size: 9px; color: #777; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .discount { color: #c00; }
  .free { color: #060; }
  .total { font-weight: bold; font-size: 13px; margin-top: 3px; }
  .note { font-size: 9px; color: #555; padding: 2px 0; }
  .footer { text-align: center; font-size: 9px; color: #aaa; margin-top: 6px; }
  @media print {
    @page { size: 72mm auto; margin: 0; }
    body { width: 72mm; }
    .receipt { padding: 4mm 3mm; }
  }
</style>
</head>
<body>
${rows}
<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=680,height=800,scrollbars=yes");
  if (!w) { alert("Please allow popups to print receipts"); return; }
  w.document.write(html);
  w.document.close();
}

export function openPdfReceipt(order: { orderNumber?: string | null }) {
  if (!order.orderNumber) return;
  const num = order.orderNumber.replace(/^#/, "");
  window.open(`https://moramoda.tech/order/${num}`, "_blank", "noopener");
}
