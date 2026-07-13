import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* Favicon & Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        <link rel="shortcut icon" href="/icon.png" />

        {/* Theme */}
        <meta name="theme-color" content="#0274C1" />
        <meta name="msapplication-TileColor" content="#0274C1" />
        <meta name="msapplication-TileImage" content="/icon.png" />

        {/* SEO Defaults */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="مورا | Mora" />
        <meta name="copyright" content="Mora" />
        <meta name="revisit-after" content="7 days" />
        <meta name="geo.region" content="IQ" />
        <meta name="geo.placename" content="Baghdad, Iraq" />
        <meta name="geo.position" content="33.3152;44.3661" />
        <meta name="ICBM" content="33.3152, 44.3661" />

        {/* Open Graph Defaults */}
        <meta property="og:site_name" content="مورا | Mora" />
        <meta property="og:locale" content="ar_IQ" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:image" content="https://moramoda.tech/icon.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="مورا | Mora — أزياء وعطور فاخرة" />

        {/* Twitter Defaults */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@moramoda" />
        <meta name="twitter:image" content="https://moramoda.tech/icon.png" />

        {/* Schema.org — ClothingStore */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ClothingStore',
              name: 'Mora',
              alternateName: 'مورا',
              url: 'https://moramoda.tech',
              logo: 'https://moramoda.tech/icon.png',
              image: 'https://moramoda.tech/icon.png',
              description:
                'متجر إلكتروني للأزياء والعطور الفاخرة في العراق | Online fashion & luxury perfume store in Iraq',
              priceRange: '$$',
              currenciesAccepted: 'IQD',
              paymentAccepted: 'Cash, Credit Card, ZainCash, FastPay, FIB, QiCard',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'IQ',
                addressRegion: 'Baghdad',
              },
              areaServed: {
                '@type': 'Country',
                name: 'Iraq',
              },
              hasMap: 'https://maps.google.com/?q=Baghdad,Iraq',
              sameAs: ['https://www.instagram.com/moramoda.iq'],
            }),
          }}
        />

        {/* BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'مورا | Mora',
              url: 'https://moramoda.tech',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://moramoda.tech/search?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
