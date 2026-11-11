import "server-only";

import { cookies, headers } from "next/headers";

import { getBuyerIp, getTrustedProxyCount } from "@/lib/buyer-ip";
import { isCartId, type CartState } from "@/lib/cart";
import { ShopifyError } from "@/lib/shopify/errors";
import type { StorefrontRequestOptions } from "@/lib/shopify/storefront-client";
import type { CartResult } from "@/types/cart";

// Request-bound cart helpers shared by the cart Server Actions and the
// /api/cart Route Handler. The cart ID lives in an httpOnly cookie, so client
// code can never read it; the browser only ever receives the Cart itself.

export const CART_COOKIE = "noma_cart";

// Shopify expires abandoned carts on its own; an expired cart is detected and
// its cookie cleared, so this only bounds how long the browser keeps the ID.
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type CartSession = {
  /** The stored cart ID, or null when there is none (or it is malformed). */
  cartId: string | null;
  storefrontOptions: StorefrontRequestOptions;
  /** Stores or clears the cart ID if it changed. */
  save: (state: CartState) => Promise<void>;
};

export async function getCartSession(): Promise<CartSession> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const storedValue = cookieStore.get(CART_COOKIE)?.value ?? null;
  const cartId = storedValue && isCartId(storedValue) ? storedValue : null;

  const buyerIp = getBuyerIp(
    headerStore.get("x-forwarded-for"),
    getTrustedProxyCount(),
  );

  return {
    cartId,
    storefrontOptions: buyerIp ? { buyerIp } : {},
    async save({ cartId: nextCartId }) {
      // Only write the cookie when it changes: in a Server Action, setting a
      // cookie also refreshes the current route.
      if (nextCartId === storedValue) return;

      if (nextCartId) {
        cookieStore.set(CART_COOKIE, nextCartId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: CART_COOKIE_MAX_AGE,
        });
      } else if (storedValue !== null) {
        cookieStore.delete(CART_COOKIE);
      }
    },
  };
}

/**
 * Runs a cart operation and stores the resulting cart ID. Failures are logged
 * on the server and reported to the browser with a generic message only.
 */
export async function runCartOperation(
  operation: string,
  failureMessage: string,
  run: (session: CartSession) => Promise<CartState>,
): Promise<CartResult> {
  try {
    const session = await getCartSession();
    const state = await run(session);
    await session.save(state);
    return { ok: true, cart: state.cart };
  } catch (error) {
    const detail =
      error instanceof ShopifyError
        ? `${error.kind} error: ${error.message}`
        : "unexpected error";
    console.error(`[shopify] Cart ${operation} failed: ${detail}`);
    return { ok: false, message: failureMessage };
  }
}
