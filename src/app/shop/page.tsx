import type { Metadata } from "next";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse the NOMA collection of functional, minimalist products for the home, kitchen and workspace.",
};

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <>
      <Header currentPath="/shop" />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
              The collection
            </p>
            <h1 className="mt-4 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
              Shop all products
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
              Considered essentials for the home, kitchen and workspace — made
              well, used daily and kept for years.
            </p>
          </div>

          <div className="mt-10 sm:mt-14">
            {products.length > 0 ? (
              <ProductGrid products={products} />
            ) : (
              <p className="text-sm text-ink-muted">
                No products are available right now. Please check back soon.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
