"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";

type AddToCartButtonProps = {
  variantId: string;
  availableForSale: boolean;
};

type Feedback = { type: "added" } | { type: "error"; message: string };

// Adds one unit of the product's variant per click.
export default function AddToCartButton({
  variantId,
  availableForSale,
}: AddToCartButtonProps) {
  const { addItem, pending } = useCart();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const isAdding = pending?.kind === "add" && pending.variantId === variantId;
  // Any cart mutation in progress blocks this one (see CartProvider). The
  // button stays focusable (aria-disabled) so keyboard focus is not lost.
  const isBlocked = pending !== null;

  async function handleClick() {
    if (isBlocked) return;
    setFeedback(null);
    const result = await addItem(variantId);
    if (!result) return;
    setFeedback(result.ok ? { type: "added" } : { type: "error", message: result.message });
  }

  if (!availableForSale) {
    return (
      <button
        type="button"
        disabled
        className="w-full bg-ink px-6 py-4 text-sm font-medium text-canvas opacity-40 sm:w-auto sm:min-w-64"
      >
        Sold out
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        aria-disabled={isBlocked}
        className="w-full bg-ink px-6 py-4 text-sm font-medium text-canvas transition-opacity hover:opacity-90 aria-disabled:cursor-wait aria-disabled:opacity-60 sm:w-auto sm:min-w-64"
      >
        {isAdding ? "Adding…" : "Add to cart"}
      </button>

      {/* Both regions stay mounted so screen readers announce changes. */}
      <div className="mt-4 min-h-5 text-sm">
        <div aria-live="polite">
          {feedback?.type === "added" && (
            <p>
              Added to your cart.{" "}
              <Link
                href="/cart"
                className="font-medium underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
              >
                View cart
              </Link>
            </p>
          )}
        </div>
        <div role="alert">
          {feedback?.type === "error" && <p>{feedback.message}</p>}
        </div>
      </div>
    </div>
  );
}
