"use client";

import Link from "next/link";

import CartLineItem from "@/components/cart/CartLineItem";
import { useCart } from "@/components/cart/CartProvider";
import PageMessage from "@/components/PageMessage";
import RetryButton from "@/components/RetryButton";
import { formatPrice } from "@/lib/format-price";

const linkClassName =
  "text-sm font-medium underline decoration-line underline-offset-4 transition-colors hover:decoration-ink";

// The /cart page content: loading, error, empty and filled states.
export default function CartView() {
  const { cart, status, pending, reload } = useCart();

  if (status === "loading" && !cart) {
    return (
      <main id="main" className="flex-1" aria-busy="true">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">Your cart</h1>
          <p role="status" className="mt-5 text-base text-ink-muted">
            Loading your cart…
          </p>
        </div>
      </main>
    );
  }

  if (status === "error" && !cart) {
    return (
      <PageMessage
        role="alert"
        eyebrow="Your cart"
        title="We couldn’t load your cart"
        description="Something went wrong while loading your cart. Please try again in a moment."
        action={<RetryButton onRetry={reload} />}
      />
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <PageMessage
        eyebrow="Your cart"
        title="Your cart is empty"
        description="Browse the collection to find something for your home, kitchen or workspace."
        action={
          <Link href="/shop" className={linkClassName}>
            Continue shopping
          </Link>
        }
      />
    );
  }

  const isBlocked = pending !== null;

  return (
    <main id="main" className="flex-1">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">Your cart</h1>

        <div className="mt-10 grid gap-10 sm:mt-14 lg:grid-cols-[1fr_22rem] lg:gap-16">
          <ul className="divide-y divide-line border-y border-line" aria-label="Cart items">
            {cart.lines.map((line) => (
              <CartLineItem key={line.id} line={line} />
            ))}
          </ul>

          <section aria-labelledby="cart-summary" className="lg:sticky lg:top-10 lg:self-start">
            <h2 id="cart-summary" className="sr-only">
              Order summary
            </h2>
            <dl className="flex items-baseline justify-between border-b border-line pb-4">
              <dt className="text-base">Subtotal</dt>
              <dd className="text-xl tabular-nums" data-cart-subtotal>
                {formatPrice(cart.subtotal)}
              </dd>
            </dl>
            <p className="mt-4 text-sm text-ink-muted">
              Taxes and shipping are calculated at checkout.
            </p>

            {cart.checkoutUrl ? (
              <a
                href={cart.checkoutUrl}
                aria-disabled={isBlocked}
                onClick={(event) => {
                  // Wait for a pending update so checkout shows the final cart.
                  if (isBlocked) event.preventDefault();
                }}
                className="mt-8 flex w-full items-center justify-center bg-ink px-6 py-4 text-sm font-medium text-canvas transition-opacity hover:opacity-90 aria-disabled:cursor-wait aria-disabled:opacity-60"
              >
                Checkout
              </a>
            ) : (
              <p role="alert" className="mt-8 text-sm">
                Checkout is unavailable right now. Please try again later.
              </p>
            )}

            <Link href="/shop" className={`mt-6 inline-block ${linkClassName}`}>
              Continue shopping
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
