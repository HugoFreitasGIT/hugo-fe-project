"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart, type CartMutationResult } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/format-price";
import { MAX_LINE_QUANTITY, type CartLine } from "@/types/cart";

const controlClassName =
  "flex size-10 items-center justify-center text-base transition-colors hover:bg-surface disabled:text-stone disabled:hover:bg-transparent aria-disabled:cursor-wait";

type CartLineItemProps = {
  line: CartLine;
};

export default function CartLineItem({ line }: CartLineItemProps) {
  const { pending, updateQuantity, removeLine } = useCart();
  const [error, setError] = useState<string | null>(null);

  const { id, quantity, product, unitPrice, total } = line;
  const isPending = pending !== null && pending.kind !== "add" && pending.lineId === id;
  // Any cart mutation in progress blocks the controls (see CartProvider).
  const isBlocked = pending !== null;

  async function run(mutation: () => Promise<CartMutationResult>) {
    if (isBlocked) return;
    setError(null);
    const result = await mutation();
    if (result && !result.ok) setError(result.message);
  }

  return (
    <li className="flex gap-5 py-6 sm:gap-6">
      <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-sm bg-surface sm:w-28">
        {product.image && (
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="112px"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-medium">
            <Link
              href={`/shop/${product.slug}`}
              className="underline-offset-4 hover:underline"
            >
              {product.name}
            </Link>
          </h2>
          <p className="shrink-0 text-sm tabular-nums" data-line-total>
            {formatPrice(total)}
          </p>
        </div>
        <p className="mt-1 text-sm text-ink-muted tabular-nums">
          {formatPrice(unitPrice)} each
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-4">
          <div
            role="group"
            aria-label={`Quantity of ${product.name}`}
            className="flex items-center border border-line"
          >
            <button
              type="button"
              aria-label={`Decrease quantity of ${product.name}`}
              disabled={quantity <= 1}
              aria-disabled={isBlocked}
              onClick={() => run(() => updateQuantity(id, quantity - 1))}
              className={controlClassName}
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm tabular-nums" data-line-quantity>
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`Increase quantity of ${product.name}`}
              disabled={quantity >= MAX_LINE_QUANTITY}
              aria-disabled={isBlocked}
              onClick={() => run(() => updateQuantity(id, quantity + 1))}
              className={controlClassName}
            >
              +
            </button>
          </div>

          <button
            type="button"
            aria-disabled={isBlocked}
            onClick={() => run(() => removeLine(id))}
            className="text-sm text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink aria-disabled:cursor-wait"
          >
            Remove<span className="sr-only"> {product.name}</span>
          </button>

          <p aria-live="polite" className="text-sm text-ink-muted">
            {isPending ? "Updating…" : ""}
          </p>
        </div>

        <div role="alert" className="text-sm">
          {error && <p className="mt-3">{error}</p>}
        </div>
      </div>
    </li>
  );
}
