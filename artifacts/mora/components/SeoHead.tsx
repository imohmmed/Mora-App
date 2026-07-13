import Head from 'expo-router/head';
import { useLanguage } from '@/context/LanguageContext';
import { SEO_DATA, type SeoPageKey } from '@/lib/seo';

const BASE_URL = 'https://moramoda.tech';
const DEFAULT_IMAGE = `${BASE_URL}/icon.png`;

interface SeoHeadProps {
  /** Which page this is — used to look up default title/description */
  page: SeoPageKey;
  /** Override the title (e.g. for dynamic product/collection names) */
  title?: string;
  /** Override the description */
  description?: string;
  /** OG image URL (absolute) */
  image?: string;
  /** Canonical path, e.g. "/product/123" — BASE_URL is prepended */
  url?: string;
  /** Set to true for private/transient pages (checkout, complete, account…) */
  noIndex?: boolean;
  /** Schema.org type */
  type?: 'website' | 'product';
  /** JSON-LD structured data string (JSON.stringify'd object) */
  structuredData?: string;
}

export function SeoHead({
  page,
  title,
  description,
  image,
  url,
  noIndex = false,
  type = 'website',
  structuredData,
}: SeoHeadProps) {
  const { lang } = useLanguage();
  const pageData = SEO_DATA[page];
  const loc = pageData[lang] ?? pageData.en;

  const finalTitle = title ?? loc.title;
  const finalDesc = description ?? loc.description;
  const finalUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const finalImage = image ?? DEFAULT_IMAGE;

  const baseKw =
    lang === 'ar'
      ? 'مورا، أزياء، عطور، تسوق أونلاين، العراق، بغداد، ملابس، موضة'
      : 'mora, fashion, perfumes, online shopping, iraq, baghdad, clothing';
  const keywords = loc.keywords ? `${loc.keywords}، ${baseKw}` : baseKw;

  return (
    <Head>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:type" content={type === 'product' ? 'product' : 'website'} />

      {/* Twitter Card */}
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={finalImage} />

      {/* Canonical & hreflang */}
      <link rel="canonical" href={finalUrl} />
      <link rel="alternate" hrefLang="ar" href={`${BASE_URL}?lang=ar`} />
      <link rel="alternate" hrefLang="en" href={`${BASE_URL}?lang=en`} />
      <link rel="alternate" hrefLang="x-default" href={BASE_URL} />

      {/* Optional structured data */}
      {structuredData ? (
        <script type="application/ld+json">{structuredData}</script>
      ) : null}
    </Head>
  );
}
