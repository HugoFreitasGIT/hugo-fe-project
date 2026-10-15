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
  id: number;
  slug: string;
  name: string;
  description: string;
  price: Price;
  category: ProductCategory;
  image: ProductImage;
};
