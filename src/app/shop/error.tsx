"use client"; // Error boundaries must be Client Components

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageMessage from "@/components/PageMessage";
import RetryButton from "@/components/RetryButton";

type ShopErrorProps = {
  error: unknown;
  retry: () => void;
};

// Shown when the product catalog cannot be loaded, e.g. Shopify is unreachable.
// Details stay in the server logs; production errors reaching the browser are
// already reduced to a generic message and digest by Next.js.
export default function ShopError({ retry }: ShopErrorProps) {
  return (
    <>
      <Header currentPath="/shop" />
      <PageMessage
        role="alert"
        eyebrow="The collection"
        title="We couldn’t load the products"
        description="Something went wrong while loading the collection. Please try again in a moment."
        action={<RetryButton onRetry={retry} />}
      />
      <Footer />
    </>
  );
}
