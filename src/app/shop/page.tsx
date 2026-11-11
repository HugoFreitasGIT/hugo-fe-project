import type { Metadata } from "next";

import CategoryFilter from "@/components/CategoryFilter";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import ProductSort from "@/components/ProductSort";
import { filterByCategory, getCategories, parseCategory } from "@/lib/product-category";
import { parseSort, sortProducts } from "@/lib/product-sort";
import { getProducts } from "@/lib/products";

const DESCRIPTION =
  "Browse the NOMA collection of functional, minimalist products for the home, kitchen and workspace.";

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// The selected category, or null when ?category= is missing or unknown.
async function getShopCategory(searchParams: ShopPageProps["searchParams"]) {
  const [catalog, params] = await Promise.all([getProducts(), searchParams]);
  return { catalog, params, category: parseCategory(params.category, getCategories(catalog)) };
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const { category } = await getShopCategory(searchParams);
  return { title: category ? category.name : "Shop", description: DESCRIPTION };
}

// Reading searchParams renders /shop per request; the Shopify catalog request
// itself stays cached (see storefront-client.ts).
export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { catalog, params, category } = await getShopCategory(searchParams);
  const sort = parseSort(params.sort);
  const products = sortProducts(filterByCategory(catalog, category), sort);

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
              {category ? category.name : "Shop all products"}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
              Considered essentials for the home, kitchen and workspace — made
              well, used daily and kept for years.
            </p>
          </div>

          <div className="mt-10 sm:mt-14">
            {products.length > 0 ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CategoryFilter
                    categories={getCategories(catalog)}
                    active={category}
                    sort={sort}
                  />
                  <ProductSort value={sort} category={category?.slug ?? null} />
                </div>
                {/* Announces the new result count after a filter change. */}
                <p role="status" className="mt-6 mb-8 text-sm text-ink-muted">
                  {`${products.length} ${products.length === 1 ? "product" : "products"}`}
                </p>
                <ProductGrid products={products} />
              </>
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
