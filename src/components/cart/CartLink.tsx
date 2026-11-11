"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/CartProvider";

type CartLinkProps = {
  isCurrent: boolean;
};

// Header cart link with the total item quantity. The count is only shown once
// the cart has loaded, so a failed or pending load never shows a wrong number.
export default function CartLink({ isCurrent }: CartLinkProps) {
  const { cart, status } = useCart();
  const count = status === "ready" ? (cart?.totalQuantity ?? 0) : null;

  const label =
    count === null ? "Cart" : `Cart, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <Link
      href="/cart"
      aria-label={label}
      aria-current={isCurrent ? "page" : undefined}
      className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end text-sm md:col-start-3"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-5"
      >
        <path d="M5 8h14l-1 12H6L5 8Z" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
      </svg>
      {/* Reserves the count's width while loading to avoid a layout shift. */}
      <span className="min-w-[1ch] tabular-nums" data-cart-count={count ?? undefined}>
        {count}
      </span>
    </Link>
  );
}
