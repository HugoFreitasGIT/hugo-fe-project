import { cache } from "react";

import {
  getStorefrontProduct,
  getStorefrontProducts,
} from "@/lib/shopify/storefront-products";
import type { Product, ProductDetail } from "@/types/product";

// Reads the live catalog from the Shopify Storefront API. Errors propagate to
// the route's error boundary; there is deliberately no fallback to the local
// mock catalog (src/data/products.ts), which now only serves seeding and tests.
// Wrapped in React's cache() so generateMetadata and the /shop page share one
// request per render.
export const getProducts = cache(async (): Promise<Product[]> => getStorefrontProducts());

// Returns null when no product exists for the handle. Wrapped in React's
// cache() so generateMetadata and the page share one request per render.
export const getProduct = cache(
  async (handle: string): Promise<ProductDetail | null> =>
    getStorefrontProduct(handle),
);
