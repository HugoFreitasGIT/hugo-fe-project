import type { Price, ProductImage } from "@/types/product";

/** Highest quantity a single cart line can be set to. */
export const MAX_LINE_QUANTITY = 99;

export type CartLine = {
  /** Shopify cart line ID, used to update or remove the line. */
  id: string;
  quantity: number;
  variantId: string;
  product: {
    slug: string;
    name: string;
    image: ProductImage | null;
  };
  /** Price of a single unit. */
  unitPrice: Price;
  /** Price of the whole line (unit price × quantity). */
  total: Price;
};

/**
 * The cart as sent to the browser. The Shopify cart ID is deliberately not
 * included: it only lives in an httpOnly cookie and on the server.
 */
export type Cart = {
  totalQuantity: number;
  subtotal: Price;
  lines: CartLine[];
  /**
   * Shopify's hosted checkout, or null when the URL Shopify returned is not
   * an HTTPS URL on the configured store domain.
   */
  checkoutUrl: string | null;
};

/** Result of a cart operation, safe to send to the browser. */
export type CartResult =
  | { ok: true; cart: Cart | null }
  | { ok: false; message: string };
