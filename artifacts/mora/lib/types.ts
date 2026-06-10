export type Product = {
  id: string;
  title: string;
  description: string;
  category: string;
  vendor?: string;
  price: number;
  comparePrice?: number;
  status: string;
  images: string[];
  tags: string[];
  variants: Variant[];
};

export type Variant = {
  id: string;
  productId: string;
  title: string;
  option1?: string;
  option2?: string;
  option3?: string;
  price: number;
  inventory: number;
  sku: string;
};

export type Collection = {
  id: string;
  title: string;
  description: string;
  image?: string;
  productsCount?: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  image?: string;
};

export type Order = {
  id: string;
  orderNumber?: string;
  email: string;
  status: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  total: number;
  currency?: string;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    city?: string;
    country?: string;
  };
  lineItems?: OrderItem[];
  createdAt: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  bgColor: string;
  linkUrl: string;
  hasButton: boolean;
  buttonText: string;
  buttonAlign: "left" | "center" | "right";
  sortOrder: number;
  status: string;
};

export type SpecialCollection = {
  slug: string;
  title: string;
  description: string;
  heroImage: string;
  accentColor: string;
  total: number;
  products: Product[];
};

export type StoryItem = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
};

export type StoryRow = {
  id: string;
  title: string;
  sortOrder: number;
  items: StoryItem[];
};

export type CartItem = {
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
