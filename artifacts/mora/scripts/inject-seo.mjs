import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const distDir = process.argv[2] || "dist";
const indexPath = join(distDir, "index.html");
let html = readFileSync(indexPath, "utf8");

const seoHead = `
    <meta name="theme-color" content="#0274C1" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="مورا | Mora" />
    <meta name="application-name" content="Mora" />
    <meta name="geo.region" content="IQ" />
    <meta name="geo.country" content="Iraq" />
    <meta name="ICBM" content="33.3152, 44.3661" />
    <meta property="og:site_name" content="مورا | Mora" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://moramoda.tech/assets/images/icon.4ff908a75140deec9616d161ba26bd91.png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@moramoda" />
    <meta name="twitter:image" content="https://moramoda.tech/assets/images/icon.4ff908a75140deec9616d161ba26bd91.png" />
    <link rel="apple-touch-icon" href="/assets/images/icon.4ff908a75140deec9616d161ba26bd91.png" />
    <link rel="manifest" href="/manifest.json" />
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"ClothingStore","name":"Mora","alternateName":"مورا","url":"https://moramoda.tech","logo":"https://moramoda.tech/assets/images/icon.4ff908a75140deec9616d161ba26bd91.png","image":"https://moramoda.tech/assets/images/icon.4ff908a75140deec9616d161ba26bd91.png","description":"Mora — متجر أزياء وعطور في العراق","sameAs":["https://www.instagram.com/moramoda"],"address":{"@type":"PostalAddress","addressCountry":"IQ"},"areaServed":"IQ","currenciesAccepted":"IQD","paymentAccepted":"Cash, Online Payment","potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://moramoda.tech/search?q={search_term_string}"},"query-input":"required name=search_term_string"}}</script>`;

html = html
  .replace('<html lang="en">', '<html lang="ar" dir="rtl">')
  .replace("<title>Mora</title>", "<title>مورا | Mora — أزياء وعطور</title>")
  .replace("</head>", `${seoHead}\n  </head>`);

writeFileSync(indexPath, html, "utf8");
console.log("✓ SEO injected into", indexPath);
