import "server-only";

import type { StorefrontRequestOptions } from "@/lib/shopify/storefront-client";
import {
  addShopifyCartLines,
  createShopifyCart,
  getShopifyCart,
  removeShopifyCartLines,
  updateShopifyCartLines,
  type ShopifyCart,
} from "@/lib/shopify/storefront-cart";
import { MAX_LINE_QUANTITY, type Cart } from "@/types/cart";

// Cart operations on top of the Shopify Cart API. They take the stored cart ID
// (or null) and return the cart ID to store next alongside the cart, so the
// caller decides how the ID is persisted. A null cart ID means "no cart": the
// stored one, if any, should be cleared.

export type CartState = {
  cartId: string | null;
  cart: Cart | null;
};

type Options = StorefrontRequestOptions;

const NO_CART: CartState = { cartId: null, cart: null };

const toState = ({ id, cart }: ShopifyCart): CartState => ({ cartId: id, cart });

// Input validation. Server Actions are public endpoints, so every value that
// comes from the browser (or the cart cookie) is checked before reaching Shopify.
export const isCartId = (value: string) =>
  /^gid:\/\/shopify\/Cart\/[A-Za-z0-9]+\?key=[A-Za-z0-9]+$/.test(value);

export const isVariantId = (value: unknown): value is string =>
  typeof value === "string" && /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(value);

export const isCartLineId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 200 &&
  /^gid:\/\/shopify\/CartLine\/[A-Za-z0-9-]+(\?cart=[A-Za-z0-9]+)?$/.test(value);

/** 0 removes the line. */
export const isLineQuantity = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= 0 &&
  (value as number) <= MAX_LINE_QUANTITY;

export async function loadCart(
  cartId: string | null,
  options: Options = {},
): Promise<CartState> {
  if (!cartId) return NO_CART;
  const result = await getShopifyCart(cartId, options);
  return result ? toState(result) : NO_CART;
}

/** Adds one unit of the variant, creating a cart first if there is none. */
export async function addToCart(
  cartId: string | null,
  variantId: string,
  options: Options = {},
): Promise<CartState> {
  const lines = [{ merchandiseId: variantId, quantity: 1 }];

  if (cartId) {
    const result = await addShopifyCartLines(cartId, lines, options);
    if (result) return toState(result);
    // The stored cart expired or was checked out: start a new one below.
  }

  return toState(await createShopifyCart(lines, options));
}

/** Sets a line's quantity; 0 removes the line. */
export async function updateCartLine(
  cartId: string | null,
  lineId: string,
  quantity: number,
  options: Options = {},
): Promise<CartState> {
  if (quantity === 0) return removeCartLine(cartId, lineId, options);
  if (!cartId) return NO_CART;

  const result = await updateShopifyCartLines(
    cartId,
    [{ id: lineId, quantity }],
    options,
  );
  return result ? toState(result) : NO_CART;
}

export async function removeCartLine(
  cartId: string | null,
  lineId: string,
  options: Options = {},
): Promise<CartState> {
  if (!cartId) return NO_CART;
  const result = await removeShopifyCartLines(cartId, [lineId], options);
  return result ? toState(result) : NO_CART;
}
