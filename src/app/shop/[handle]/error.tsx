"use client"; // Error boundaries must be Client Components

import Link from "next/link";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageMessage from "@/components/PageMessage";
import RetryButton from "@/components/RetryButton";

type ProductErrorProps = {
  error: unknown;
  retry: () => void;
};

// Shown when a product cannot be loaded, e.g. Shopify is unreachable or the
// product data failed validation. Details stay in the server logs.
export default function ProductError({ retry }: ProductErrorProps) {
  return (
    <>
      <Header currentPath="/shop" />
      <PageMessage
        role="alert"
        eyebrow="The collection"
        title="We couldn’t load this product"
        description="Something went wrong while loading this product. Please try again in a moment."
        action={
          <div className="flex flex-wrap items-center gap-6">
            <RetryButton onRetry={retry} />
            <Link
              href="/shop"
              className="text-sm font-medium underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
            >
              Back to all products
            </Link>
          </div>
        }
      />
      <Footer />
    </>
  );
}
