import Link from "next/link";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageMessage from "@/components/PageMessage";

// Rendered when the product page calls notFound() for an unknown handle.
// Its <title> comes from the page's generateMetadata.
export default function ProductNotFound() {
  return (
    <>
      <Header currentPath="/shop" />
      <PageMessage
        eyebrow="404"
        title="We couldn’t find this product"
        description="It may have been removed or the link may be incorrect. Take a look at the rest of the collection instead."
        action={
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-ink px-6 py-3 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
          >
            <span aria-hidden="true">←</span>
            Back to all products
          </Link>
        }
      />
      <Footer />
    </>
  );
}
