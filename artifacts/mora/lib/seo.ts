export type SeoPageKey =
  | 'home'
  | 'search'
  | 'cart'
  | 'account'
  | 'chat'
  | 'wishlist'
  | 'orders'
  | 'orderDetail'
  | 'settings'
  | 'address'
  | 'mySize'
  | 'notifications'
  | 'product'
  | 'collection'
  | 'saleCollection'
  | 'auth'
  | 'verify'
  | 'checkout'
  | 'complete'
  | 'notFound';

interface SeoLocalized {
  title: string;
  description: string;
  keywords?: string;
}

interface SeoPageData {
  ar: SeoLocalized;
  en: SeoLocalized;
}

export const SEO_DATA: Record<SeoPageKey, SeoPageData> = {
  home: {
    ar: {
      title: 'مورا | أزياء وعطور فاخرة | تسوق أونلاين في العراق',
      description:
        'اكتشف أحدث صيحات الموضة والعطور الفاخرة في مورا. تسوق ملابس نسائية ورجالية وعطور مميزة مع توصيل سريع لجميع محافظات العراق وأسعار حصرية يومية.',
      keywords:
        'مورا، ملابس نسائية، ملابس رجالية، عطور فاخرة، موضة عراق، تسوق إلكتروني، بغداد، أزياء، ماركات عالمية',
    },
    en: {
      title: 'Mora | Fashion & Luxury Perfumes | Shop Online in Iraq',
      description:
        "Discover the latest fashion trends and luxury perfumes at Mora. Shop women's & men's clothing, premium fragrances with fast delivery across all Iraq provinces. Exclusive prices & daily deals.",
      keywords:
        'mora, women fashion, men fashion, luxury perfumes, iraq fashion, online shopping, baghdad, clothing, designer brands',
    },
  },

  search: {
    ar: {
      title: 'البحث عن منتجات | مورا — ملابس وعطور فاخرة',
      description:
        'ابحث عن ملابسك وعطورك المفضلة في مورا. استكشف آلاف المنتجات من أشهر الماركات العالمية بأسعار مناسبة مع توصيل سريع لجميع محافظات العراق.',
      keywords: 'بحث ملابس، عطور، ماركات، موضة عراق، تسوق أونلاين',
    },
    en: {
      title: 'Search Fashion & Perfumes | Mora Iraq',
      description:
        'Search thousands of fashion items and luxury perfumes at Mora. Find your favorite brands with the best prices and fast delivery across all Iraq provinces.',
      keywords: 'search fashion, perfumes, brands, iraq, clothing, online store',
    },
  },

  cart: {
    ar: {
      title: 'سلة التسوق | مورا',
      description:
        'راجع منتجاتك المختارة وأتمم عملية الشراء بأمان في مورا. دفع آمن عبر الكاش أو البطاقة الائتمانية مع توصيل سريع لجميع محافظات العراق.',
    },
    en: {
      title: 'Shopping Bag | Mora',
      description:
        'Review your selected items and complete your purchase safely at Mora. Secure payment via cash or credit card with fast delivery across Iraq.',
    },
  },

  account: {
    ar: {
      title: 'حسابي | مورا',
      description:
        'أدر حسابك في مورا. تتبع طلباتك، مفضلتك، مقاساتك، ومعلوماتك الشخصية بكل سهولة وأمان.',
    },
    en: {
      title: 'My Account | Mora',
      description:
        'Manage your Mora account. Track your orders, wishlist, sizes, and personal information with ease and security.',
    },
  },

  chat: {
    ar: {
      title: 'المساعد الذكي للموضة | مورا',
      description:
        'تحدث مع المساعد الذكي لمورا. احصل على نصائح شخصية في اختيار الملابس والعطور والأزياء المناسبة لك وللمناسبات المختلفة.',
      keywords: 'مساعد أزياء ذكي، نصائح موضة، تنسيق ملابس، اختيار عطور، ستايل',
    },
    en: {
      title: 'AI Fashion Assistant | Mora',
      description:
        "Chat with Mora's AI fashion assistant. Get personalized style advice, perfume recommendations, and outfit suggestions for any occasion.",
      keywords: 'ai fashion assistant, style advice, perfume recommendations, outfit ideas, mora',
    },
  },

  wishlist: {
    ar: {
      title: 'المفضلة | مورا',
      description:
        'احفظ منتجاتك المفضلة من ملابس وعطور في مورا. ارجع إليها في أي وقت وأضفها إلى سلتك بسهولة.',
    },
    en: {
      title: 'Wishlist | Mora',
      description:
        'Save your favorite clothing and perfumes on Mora. Return to them anytime and add them to your cart easily.',
    },
  },

  orders: {
    ar: {
      title: 'طلباتي | مورا',
      description:
        'تابع حالة جميع طلباتك في مورا. اطلع على تفاصيل التوصيل والشحن وتاريخ مشترياتك.',
    },
    en: {
      title: 'My Orders | Mora',
      description:
        'Track all your Mora orders. View delivery details, shipping status, and your full purchase history.',
    },
  },

  orderDetail: {
    ar: {
      title: 'تفاصيل الطلب | مورا',
      description:
        'اطلع على تفاصيل طلبك الكاملة في مورا، من قائمة المنتجات إلى معلومات التوصيل وطريقة الدفع.',
    },
    en: {
      title: 'Order Details | Mora',
      description:
        'View your complete order details at Mora, including product list, delivery information, and payment method.',
    },
  },

  settings: {
    ar: {
      title: 'الإعدادات | مورا',
      description:
        'اضبط إعدادات تطبيق مورا. غيّر اللغة، الثيم، إعدادات حسابك، والإشعارات بسهولة.',
    },
    en: {
      title: 'Settings | Mora',
      description:
        'Customize your Mora app settings. Change language, theme, account preferences, and notifications easily.',
    },
  },

  address: {
    ar: {
      title: 'عنوان التوصيل | مورا',
      description:
        'أضف وعدّل عناوين التوصيل الخاصة بك في مورا للحصول على أسرع توصيل في جميع محافظات العراق.',
    },
    en: {
      title: 'Delivery Address | Mora',
      description:
        'Add and manage your delivery addresses in Mora for the fastest shipping across all Iraq provinces.',
    },
  },

  mySize: {
    ar: {
      title: 'مقاساتي | مورا',
      description:
        'احفظ مقاساتك المفضلة في مورا للحصول على تجربة تسوق مثالية ومناسبة لجسمك تماماً.',
    },
    en: {
      title: 'My Size | Mora',
      description:
        'Save your size preferences in Mora for a perfectly personalized shopping experience tailored just for you.',
    },
  },

  notifications: {
    ar: {
      title: 'الإشعارات | مورا',
      description:
        'اطّلع على آخر إشعاراتك وتنبيهاتك من مورا حول طلباتك، عروضك الحصرية، ووصول المنتجات الجديدة.',
    },
    en: {
      title: 'Notifications | Mora',
      description:
        'Stay updated with your latest Mora notifications about orders, exclusive offers, and new product arrivals.',
    },
  },

  product: {
    ar: {
      title: 'منتج | مورا',
      description:
        'اكتشف هذا المنتج المميز في مورا. جودة عالية وأسعار منافسة مع توصيل سريع لجميع محافظات العراق.',
      keywords: 'منتج، ملابس، عطور، مورا، عراق، تسوق',
    },
    en: {
      title: 'Product | Mora',
      description:
        'Discover this featured product at Mora. High quality, competitive prices with fast delivery across Iraq.',
      keywords: 'product, fashion, perfumes, mora, iraq, online shopping',
    },
  },

  collection: {
    ar: {
      title: 'تشكيلة | مورا',
      description:
        'استكشف تشكيلة مورا الحصرية من الملابس والعطور الفاخرة. أحدث الصيحات العالمية بأسعار مناسبة مع توصيل سريع في جميع محافظات العراق.',
      keywords: 'تشكيلة، مجموعة، ملابس، عطور، موضة، عراق',
    },
    en: {
      title: 'Collection | Mora',
      description:
        "Explore Mora's exclusive collection of fashion and luxury perfumes. Latest global trends at competitive prices with fast delivery across Iraq.",
      keywords: 'collection, fashion, perfumes, trends, iraq, mora',
    },
  },

  saleCollection: {
    ar: {
      title: 'عروض وتخفيضات | مورا',
      description:
        'اغتنم أفضل العروض والتخفيضات على الملابس والعطور في مورا. صفقات حصرية لفترة محدودة مع توصيل سريع لجميع محافظات العراق.',
      keywords: 'تخفيضات، عروض، سيل، ملابس مخفضة، عطور، فرص، مورا',
    },
    en: {
      title: 'Sales & Deals | Mora',
      description:
        'Grab the best deals and discounts on fashion and perfumes at Mora. Exclusive limited-time offers with fast delivery across Iraq.',
      keywords: 'sale, deals, discounts, fashion, perfumes, iraq, mora',
    },
  },

  auth: {
    ar: {
      title: 'تسجيل الدخول | مورا',
      description:
        'سجّل دخولك إلى مورا للاستمتاع بتجربة تسوق شخصية مميزة. تسجيل سهل وسريع عبر Google أو Apple.',
    },
    en: {
      title: 'Sign In | Mora',
      description:
        'Sign in to Mora for a personalized shopping experience. Easy and fast login via Google or Apple.',
    },
  },

  verify: {
    ar: {
      title: 'تأكيد الهوية | مورا',
      description:
        'أكمل عملية تسجيل الدخول إلى مورا عن طريق تأكيد هويتك بأمان تام.',
    },
    en: {
      title: 'Verify Identity | Mora',
      description:
        'Complete your Mora sign-in process by securely verifying your identity.',
    },
  },

  checkout: {
    ar: {
      title: 'إتمام الطلب | مورا',
      description:
        'أتمم عملية شرائك في مورا بأمان. دفع مريح عبر الكاش أو البطاقة الائتمانية أو المحافظ الإلكترونية مع توصيل سريع.',
    },
    en: {
      title: 'Checkout | Mora',
      description:
        'Complete your Mora purchase safely. Convenient payment via cash, credit card, or e-wallets (ZainCash, FastPay, FIB) with fast delivery.',
    },
  },

  complete: {
    ar: {
      title: 'تم تأكيد طلبك | مورا',
      description:
        'شكراً لك! تم تأكيد طلبك بنجاح في مورا. سيصلك إشعار بتفاصيل التوصيل قريباً.',
    },
    en: {
      title: 'Order Confirmed | Mora',
      description:
        "Thank you! Your Mora order has been successfully confirmed. You'll receive delivery details soon.",
    },
  },

  notFound: {
    ar: {
      title: 'الصفحة غير موجودة | مورا',
      description:
        'عذراً، الصفحة التي تبحث عنها غير موجودة. عد إلى الرئيسية وتصفح أحدث منتجات مورا.',
    },
    en: {
      title: 'Page Not Found | Mora',
      description:
        "Sorry, the page you're looking for doesn't exist. Go back home and browse Mora's latest products.",
    },
  },
};
