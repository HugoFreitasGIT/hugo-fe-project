export type Currency = "EUR";

export type Price = {
  /** Integer amount in minor units, e.g. 2400 for €24.00. */
  amount: number;
  currency: Currency;
};

export type ProductCategory = {
  slug: string;
  name: string;
};

export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: Price;
  category: ProductCategory;
  image: ProductImage;
};

/** A product with its full image set, used on the product detail page. */
export type ProductDetail = Product & {
  /** All product images, starting with the main image. */
  images: ProductImage[];
  /**
   * Shopify variant (merchandise) ID added to the cart. Products currently
   * have a single variant, so this is always the first one.
   */
  variantId: string;
  availableForSale: boolean;
};
