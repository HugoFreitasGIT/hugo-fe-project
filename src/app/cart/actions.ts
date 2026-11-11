"use server";

import {
  addToCart,
  isCartLineId,
  isLineQuantity,
  isVariantId,
  removeCartLine,
  updateCartLine,
} from "@/lib/cart";
import { runCartOperation } from "@/lib/cart-session";
import type { CartResult } from "@/types/cart";

// Cart mutations. Server Actions are public POST endpoints, so arguments are
// validated here before anything is sent to Shopify. The cart is identified
// by the httpOnly cookie, never by an ID from the browser.

const invalidRequest = (): CartResult => ({
  ok: false,
  message: "This cart request is not valid. Please refresh the page and try again.",
});

export async function addToCartAction(variantId: unknown): Promise<CartResult> {
  if (!isVariantId(variantId)) return invalidRequest();

  return runCartOperation(
    "add",
    "We couldn’t add this item to your cart. Please try again.",
    ({ cartId, storefrontOptions }) => addToCart(cartId, variantId, storefrontOptions),
  );
}

export async function updateCartLineAction(
  lineId: unknown,
  quantity: unknown,
): Promise<CartResult> {
  if (!isCartLineId(lineId) || !isLineQuantity(quantity)) return invalidRequest();

  return runCartOperation(
    "update",
    "We couldn’t update the quantity. Please try again.",
    ({ cartId, storefrontOptions }) =>
      updateCartLine(cartId, lineId, quantity, storefrontOptions),
  );
}

export async function removeCartLineAction(lineId: unknown): Promise<CartResult> {
  if (!isCartLineId(lineId)) return invalidRequest();

  return runCartOperation(
    "remove",
    "We couldn’t remove this item. Please try again.",
    ({ cartId, storefrontOptions }) => removeCartLine(cartId, lineId, storefrontOptions),
  );
}
