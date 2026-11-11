"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  addToCartAction,
  removeCartLineAction,
  updateCartLineAction,
} from "@/app/cart/actions";
import type { Cart, CartResult } from "@/types/cart";

// Client-side cart state shared by the header, product pages and /cart.
//
// The cart is loaded in the browser (from /api/cart) rather than during server
// rendering, so reading the cart cookie does not make every page dynamic.
//
// Mutations are serialized here: only one add/update/remove runs at a time.
// The lock is a ref, so it applies immediately, even to a second click that
// arrives before React re-renders with disabled controls. This guarantees,
// for example, that two quick "Add to cart" clicks on an empty cart cannot
// create two separate Shopify carts.

export type CartStatus = "loading" | "ready" | "error";

/** The mutation in progress, so the matching control can show it. */
export type PendingCartMutation =
  | { kind: "add"; variantId: string }
  | { kind: "update" | "remove"; lineId: string };

/**
 * Result of a mutation request; null when it was not started because another
 * cart mutation was still in progress.
 */
export type CartMutationResult = CartResult | null;

type CartContextValue = {
  cart: Cart | null;
  status: CartStatus;
  pending: PendingCartMutation | null;
  reload: () => void;
  addItem: (variantId: string) => Promise<CartMutationResult>;
  updateQuantity: (lineId: string, quantity: number) => Promise<CartMutationResult>;
  removeLine: (lineId: string) => Promise<CartMutationResult>;
};

const CartContext = createContext<CartContextValue | null>(null);

const LOAD_FAILED: CartResult = {
  ok: false,
  message: "We couldn’t load your cart. Please try again.",
};

async function fetchCart(): Promise<CartResult> {
  try {
    const response = await fetch("/api/cart", { cache: "no-store" });
    return (await response.json()) as CartResult;
  } catch {
    return LOAD_FAILED;
  }
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState<CartStatus>("loading");
  const [pending, setPending] = useState<PendingCartMutation | null>(null);

  const isMutatingRef = useRef(false);
  // Incremented by every mutation; a load that started before a mutation must
  // not overwrite the newer cart that mutation returned.
  const versionRef = useRef(0);

  const load = useCallback(() => {
    const version = versionRef.current;
    void fetchCart().then((result) => {
      if (version !== versionRef.current) return;

      if (result.ok) {
        setCart(result.cart);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    });
  }, []);

  useEffect(load, [load]);

  const reload = useCallback(() => {
    setStatus("loading");
    load();
  }, [load]);

  const mutate = useCallback(
    async (
      mutation: PendingCartMutation,
      action: () => Promise<CartResult>,
    ): Promise<CartMutationResult> => {
      if (isMutatingRef.current) return null;
      isMutatingRef.current = true;
      versionRef.current += 1;
      setPending(mutation);

      try {
        const result = await action();
        if (result.ok) {
          setCart(result.cart);
          setStatus("ready");
        }
        return result;
      } catch {
        // The Server Action request itself failed, e.g. the network dropped.
        return { ok: false, message: "Something went wrong. Please try again." };
      } finally {
        isMutatingRef.current = false;
        setPending(null);
      }
    },
    [],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      status,
      pending,
      reload,
      addItem: (variantId) =>
        mutate({ kind: "add", variantId }, () => addToCartAction(variantId)),
      updateQuantity: (lineId, quantity) =>
        mutate({ kind: "update", lineId }, () => updateCartLineAction(lineId, quantity)),
      removeLine: (lineId) =>
        mutate({ kind: "remove", lineId }, () => removeCartLineAction(lineId)),
    }),
    [cart, status, pending, reload, mutate],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider.");
  return context;
}
