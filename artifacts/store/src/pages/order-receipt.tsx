import { useEffect, useState } from "react";
import { useParams } from "wouter";

interface LineItem {
  title?: string;
  variantTitle?: string;
  option1?: string;
  option2?: string;
  quantity?: number;
  price?: number;
  image?: string;
  sku?: string;
  productCode?: string;
}

interface ShippingAddress {
  fullName?: string;
  phone?: string;
  phone2?: string;
  city?: string;
  district?: string;
  landmark?: string;
  instagram?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  email?: string;
  status?: string;
  financialStatus?: string;
  deliveryStage?: string;
  subtotal?: number;
  shipping?: number;
  discountAmount?: number;
  discountCode?: string;
  total?: number;
  lineItems?: LineItem[];
  shippingAddress?: ShippingAddress;
  note?: string;
  createdAt?: string;
}

interface ContactItem {
  key: string;
  value: string;
}

function formatIQD(n: number | null | undefined) {
  return `${Math.round(Number(n) || 0).toLocaleString("en-US")} IQD`;
}

function fmt(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const API = "/api";

async function fetchOrder(orderNumber: string): Promise<Order | null> {
  try {
    const res = await fetch(`${API}/public/orders/${encodeURIComponent(orderNumber)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function fetchContact(): Promise<{ phone1: string; phone2: string; instagram1: string; instagram2: string }> {
  try {
    const res = await fetch(`${API}/store/content-sections`);
    if (!res.ok) return { phone1: "", phone2: "", instagram1: "", instagram2: "" };
    const json = await res.json();
    const items: ContactItem[] = json.data?.store_contact?.items ?? [];
    const get = (key: string) => items.find((i) => i.key === key)?.value ?? "";
    return { phone1: get("phone1"), phone2: get("phone2"), instagram1: get("instagram1"), instagram2: get("instagram2") };
  } catch {
    return { phone1: "", phone2: "", instagram1: "", instagram2: "" };
  }
}

export default function OrderReceipt() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [contact, setContact] = useState({ phone1: "", phone2: "", instagram1: "", instagram2: "" });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const cleanNum = orderNumber.replace(/^#/, "");
  const receiptUrl = `https://moramoda.tech/order/${cleanNum}`;

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOrder(orderNumber), fetchContact()]).then(([o, c]) => {
      if (!o) setNotFound(true);
      else setOrder(o);
      setContact(c);
      setLoading(false);
    });
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="receipt-loading">
        <div className="receipt-spinner" />
        <p>جاري تحميل الوصل...</p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="receipt-loading">
        <p style={{ fontSize: 18, color: "#555" }}>لم يتم العثور على الطلب #{orderNumber}</p>
      </div>
    );
  }

  const addr = order.shippingAddress ?? {};
  const items = order.lineItems ?? [];
  const subtotal = Number(order.subtotal ?? 0);
  const shipping = Number(order.shipping ?? 0);
  const discount = Number(order.discountAmount ?? 0);
  const total = Number(order.total ?? 0);
  const isFreeShip = shipping === 0;
  const hasDiscount = discount > 0;
  const originalTotal = total + discount;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&format=png&data=${encodeURIComponent(receiptUrl)}`;
  const instagramQrUrl = contact.instagram1
    ? `https://api.qrserver.com/v1/create-qr-code/?size=100x100&format=png&data=${encodeURIComponent(`https://instagram.com/${contact.instagram1.replace("@", "")}`)}`
    : null;

  const deliveryStageAr: Record<string, string> = {
    confirmed: "مؤكد",
    preparing: "قيد التجهيز",
    shipping: "تم الشحن",
    delivered: "تم التوصيل",
    issue: "مشكلة",
    cancelled: "ملغى",
    returned: "مرتجع",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
          background: #f5f5f5;
          color: #1a1a1a;
          direction: rtl;
        }

        .receipt-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 16px;
          color: #888;
          font-family: 'Cairo', sans-serif;
        }

        .receipt-spinner {
          width: 40px; height: 40px;
          border: 3px solid #eee;
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .receipt-wrap {
          max-width: 794px;
          margin: 32px auto;
          background: #fff;
          box-shadow: 0 4px 32px rgba(0,0,0,0.12);
          border-radius: 8px;
          overflow: hidden;
        }

        .print-btn {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a1a1a;
          color: #fff;
          border: none;
          border-radius: 32px;
          padding: 14px 40px;
          font-size: 15px;
          font-family: 'Cairo', sans-serif;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          z-index: 100;
          transition: background 0.2s;
        }
        .print-btn:hover { background: #333; }

        /* ── Header ── */
        .receipt-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 32px 36px 24px;
          background: #fff;
          border-bottom: 2px solid #f0f0f0;
        }

        .receipt-qr img {
          width: 140px; height: 140px;
          display: block;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 4px;
          background: #fff;
        }
        .receipt-qr-label {
          text-align: center;
          font-size: 10px;
          color: #888;
          margin-top: 4px;
        }

        .receipt-brand {
          text-align: right;
        }
        .receipt-brand-name {
          font-size: 52px;
          font-weight: 800;
          letter-spacing: 6px;
          color: #1a1a1a;
          line-height: 1;
          font-family: 'Cairo', 'Segoe UI', sans-serif;
        }
        .receipt-brand-sub {
          font-size: 11px;
          color: #aaa;
          letter-spacing: 2px;
          margin-top: 4px;
          text-transform: uppercase;
        }
        .receipt-order-meta {
          margin-top: 12px;
          text-align: right;
        }
        .receipt-order-number {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .receipt-order-date {
          font-size: 12px;
          color: #888;
          margin-top: 2px;
        }
        .receipt-order-stage {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background: #f0f7ff;
          color: #0274C1;
        }

        /* ── Customer Info ── */
        .receipt-section {
          padding: 20px 36px;
          border-bottom: 1px solid #f0f0f0;
        }
        .receipt-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #aaa;
          margin-bottom: 12px;
        }
        .customer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 24px;
        }
        .customer-row {
          display: flex;
          gap: 8px;
          font-size: 13px;
          align-items: baseline;
        }
        .customer-label {
          color: #999;
          font-size: 11px;
          white-space: nowrap;
          min-width: 70px;
        }
        .customer-value {
          font-weight: 600;
          color: #1a1a1a;
          word-break: break-all;
        }
        .customer-value[dir="ltr"] {
          direction: ltr;
          unicode-bidi: isolate;
        }

        /* ── Products table ── */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .items-table thead tr {
          background: #fafafa;
          border-bottom: 2px solid #eee;
        }
        .items-table th {
          padding: 10px 12px;
          font-weight: 700;
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          white-space: nowrap;
        }
        .items-table th.center { text-align: center; }
        .items-table th.left { text-align: left; }
        .items-table th.right { text-align: right; }
        .items-table td {
          padding: 10px 12px;
          vertical-align: middle;
          border-bottom: 1px solid #f5f5f5;
        }
        .items-table tbody tr:last-child td { border-bottom: none; }
        .items-table td.center { text-align: center; }
        .items-table td.right { text-align: right; direction: ltr; }
        .items-table td.seq {
          font-size: 11px;
          color: #bbb;
          font-weight: 600;
          text-align: center;
          width: 32px;
        }
        .item-img {
          width: 54px; height: 54px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #eee;
          display: block;
          background: #fafafa;
        }
        .item-img-placeholder {
          width: 54px; height: 54px;
          background: #f0f0f0;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #ccc;
        }
        .item-name {
          font-weight: 600;
          color: #1a1a1a;
          font-size: 13px;
          line-height: 1.3;
        }
        .item-variant {
          font-size: 11px;
          color: #888;
          margin-top: 2px;
        }
        .item-code {
          font-size: 10px;
          color: #bbb;
          margin-top: 2px;
          font-family: monospace;
        }
        .price-num {
          font-weight: 600;
          direction: ltr;
          display: block;
        }

        /* ── Pricing summary ── */
        .pricing-section {
          padding: 16px 36px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: flex-end;
        }
        .pricing-table {
          min-width: 260px;
        }
        .pricing-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          font-size: 13px;
          gap: 32px;
        }
        .pricing-label { color: #666; }
        .pricing-value { font-weight: 600; direction: ltr; }
        .pricing-row.discount .pricing-label { color: #e53e3e; }
        .pricing-row.discount .pricing-value { color: #e53e3e; }
        .pricing-row.shipping-free .pricing-value { color: #38a169; }
        .pricing-row.total-row {
          border-top: 2px solid #1a1a1a;
          margin-top: 6px;
          padding-top: 10px;
          font-size: 16px;
          font-weight: 800;
        }
        .pricing-row.total-row .pricing-value { font-size: 16px; }
        .strike { text-decoration: line-through; color: #bbb; font-size: 11px; margin-right: 6px; }

        /* ── Footer ── */
        .receipt-footer {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 24px 36px 28px;
          gap: 24px;
        }

        .footer-instagram {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 120px;
        }
        .footer-instagram img {
          width: 90px; height: 90px;
          border: 1px solid #eee;
          border-radius: 6px;
          padding: 3px;
        }
        .footer-instagram-handle {
          font-size: 11px;
          color: #555;
          font-weight: 600;
          direction: ltr;
        }
        .footer-instagram-handle2 {
          font-size: 10px;
          color: #999;
          direction: ltr;
        }

        .footer-phones {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
        }
        .footer-phones-title {
          font-size: 11px;
          color: #aaa;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .footer-phone {
          font-size: 17px;
          font-weight: 700;
          color: #1a1a1a;
          direction: ltr;
          letter-spacing: 1px;
        }

        .footer-notes {
          min-width: 140px;
          max-width: 180px;
        }
        .footer-notes-title {
          font-size: 11px;
          font-weight: 700;
          color: #aaa;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .footer-notes-text {
          font-size: 12px;
          color: #555;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .footer-notes-empty {
          font-size: 11px;
          color: #ddd;
          font-style: italic;
        }

        .receipt-watermark {
          text-align: center;
          padding: 8px 0 16px;
          font-size: 10px;
          color: #ccc;
          letter-spacing: 1px;
        }

        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { background: #fff; }
          .print-btn { display: none !important; }
          .receipt-wrap {
            margin: 0;
            box-shadow: none;
            border-radius: 0;
            max-width: 100%;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }

        @media (max-width: 640px) {
          .receipt-header { padding: 20px 16px 16px; flex-direction: column-reverse; gap: 16px; align-items: flex-start; }
          .receipt-brand { text-align: left; }
          .receipt-brand-name { font-size: 36px; }
          .receipt-section { padding: 16px; }
          .customer-grid { grid-template-columns: 1fr; }
          .pricing-section { padding: 16px; }
          .receipt-footer { flex-direction: column; align-items: center; padding: 16px; }
          .footer-notes { max-width: 100%; width: 100%; }
          .items-table th, .items-table td { padding: 8px 6px; }
          .print-btn { bottom: 16px; padding: 12px 28px; }
        }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>🖨️ طباعة الوصل</button>

      <div className="receipt-wrap">
        {/* ── Header — Logo RIGHT, QR LEFT (per RTL: first=right, second=left) ── */}
        <div className="receipt-header">
          <div className="receipt-brand">
            <div className="receipt-brand-name">MORA</div>
            <div className="receipt-brand-sub">moramoda.tech</div>
            <div className="receipt-order-meta">
              <div className="receipt-order-number">طلب {order.orderNumber}</div>
              <div className="receipt-order-date">{fmt(order.createdAt)}</div>
              {order.deliveryStage && (
                <span className="receipt-order-stage">
                  {deliveryStageAr[order.deliveryStage] ?? order.deliveryStage}
                </span>
              )}
            </div>
          </div>
          <div className="receipt-qr">
            <img src={qrUrl} alt="QR وصل الطلب" loading="eager" />
            <div className="receipt-qr-label">امسح للوصل الرقمي</div>
          </div>
        </div>

        {/* ── Customer Info ── */}
        <div className="receipt-section">
          <div className="receipt-section-title">معلومات العميل</div>
          <div className="customer-grid">
            {addr.fullName    && <div className="customer-row"><span className="customer-label">الاسم</span><span className="customer-value">{addr.fullName}</span></div>}
            {addr.phone       && <div className="customer-row"><span className="customer-label">جوال 1</span><span className="customer-value" dir="ltr">{addr.phone}</span></div>}
            {addr.phone2      && <div className="customer-row"><span className="customer-label">جوال 2</span><span className="customer-value" dir="ltr">{addr.phone2}</span></div>}
            {order.email      && <div className="customer-row"><span className="customer-label">البريد</span><span className="customer-value" dir="ltr">{order.email}</span></div>}
            {addr.city        && <div className="customer-row"><span className="customer-label">المحافظة</span><span className="customer-value">{addr.city}</span></div>}
            {addr.district    && <div className="customer-row"><span className="customer-label">المنطقة</span><span className="customer-value">{addr.district}</span></div>}
            {addr.landmark    && <div className="customer-row"><span className="customer-label">الموقع</span><span className="customer-value">{addr.landmark}</span></div>}
            {addr.instagram   && <div className="customer-row"><span className="customer-label">انستاكرام</span><span className="customer-value" dir="ltr">@{addr.instagram}</span></div>}
          </div>
        </div>

        {/* ── Products ── */}
        <div className="receipt-section" style={{ padding: "0" }}>
          <div style={{ padding: "16px 36px 0" }} className="receipt-section-title">المنتجات</div>
          <table className="items-table">
            <thead>
              <tr>
                <th className="center">#</th>
                <th className="center">الصورة</th>
                <th>المنتج</th>
                <th className="center">الكمية</th>
                <th className="right">سعر المفرد</th>
                <th className="right">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const variant = [item.option1, item.option2].filter(Boolean).join(" / ") || item.variantTitle || "";
                const code = item.sku || item.productCode || "";
                const unitPrice = Number(item.price ?? 0);
                const qty = Number(item.quantity ?? 1);
                const lineTotal = unitPrice * qty;
                return (
                  <tr key={idx}>
                    <td className="seq">{idx + 1}</td>
                    <td className="center" style={{ width: 70 }}>
                      {item.image
                        ? <img src={item.image} alt={item.title} className="item-img" style={{ margin: "0 auto" }} />
                        : <div className="item-img-placeholder" style={{ margin: "0 auto" }}>📦</div>
                      }
                    </td>
                    <td>
                      <div className="item-name">{item.title ?? "—"}</div>
                      {variant && variant !== "Default Title" && <div className="item-variant">{variant}</div>}
                      {code && <div className="item-code">{code}</div>}
                    </td>
                    <td className="center" style={{ fontWeight: 700 }}>{qty}</td>
                    <td className="right"><span className="price-num">{formatIQD(unitPrice)}</span></td>
                    <td className="right"><span className="price-num">{formatIQD(lineTotal)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pricing summary ── */}
        <div className="pricing-section">
          <div className="pricing-table">
            <div className="pricing-row">
              <span className="pricing-label">سعر المنتجات</span>
              <span className="pricing-value">{formatIQD(subtotal)}</span>
            </div>
            {hasDiscount && (
              <div className="pricing-row discount">
                <span className="pricing-label">
                  الخصم{order.discountCode ? ` (${order.discountCode})` : ""}
                </span>
                <span className="pricing-value">−{formatIQD(discount)}</span>
              </div>
            )}
            <div className={`pricing-row ${isFreeShip ? "shipping-free" : ""}`}>
              <span className="pricing-label">التوصيل</span>
              <span className="pricing-value">
                {isFreeShip ? "مجاني 🎁" : formatIQD(shipping)}
              </span>
            </div>
            <div className="pricing-row total-row">
              <span className="pricing-label">السعر النهائي</span>
              <span className="pricing-value">
                {hasDiscount && <span className="strike">{formatIQD(originalTotal + (isFreeShip ? 0 : 0))}</span>}
                {formatIQD(total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="receipt-footer">
          {/* Instagram (left/start side in RTL = visual right) */}
          <div className="footer-instagram">
            {instagramQrUrl && <img src={instagramQrUrl} alt="Instagram QR" loading="eager" />}
            {contact.instagram1 && <div className="footer-instagram-handle">@{contact.instagram1.replace("@", "")}</div>}
            {contact.instagram2 && <div className="footer-instagram-handle2">@{contact.instagram2.replace("@", "")}</div>}
          </div>

          {/* Phones (center) */}
          <div className="footer-phones">
            <div className="footer-phones-title">للتواصل</div>
            {contact.phone1 && <div className="footer-phone">{contact.phone1}</div>}
            {contact.phone2 && <div className="footer-phone">{contact.phone2}</div>}
          </div>

          {/* Notes (right/end side in RTL = visual left) */}
          <div className="footer-notes">
            <div className="footer-notes-title">ملاحظات</div>
            {order.note
              ? <div className="footer-notes-text">{order.note}</div>
              : <div className="footer-notes-empty">لا توجد ملاحظات</div>
            }
          </div>
        </div>

        <div className="receipt-watermark">moramoda.tech • {order.orderNumber}</div>
      </div>
    </>
  );
}
