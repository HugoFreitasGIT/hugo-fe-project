import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import AddToCartButton from "@/components/cart/AddToCartButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { formatPrice } from "@/lib/format-price";
import { getProduct, getProducts } from "@/lib/products";

// Pre-render every current product at build time. Products added later are
// rendered on first visit; both are revalidated with the Storefront API cache.
export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((product) => ({ handle: product.slug }));
  } catch (error) {
    // Pre-rendering is only an optimisation. Errors thrown here bypass the
    // route's error boundary (Next.js also calls this per request in
    // development), so render on demand instead, where the page itself
    // reports the Shopify error through error.tsx.
    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn(`[shopify] Skipping product pre-rendering: ${reason}`);
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);

  // Segment-level not-found.tsx files cannot export metadata (only the root
  // app/not-found.js can), so the 404 title is set here.
  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      images: [{ url: product.image.src, alt: product.image.alt }],
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/shop/[handle]">) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) notFound();

  const { name, description, price, category, images, variantId, availableForSale } =
    product;
  const [mainImage, ...otherImages] = images;

  return (
    <>
      <Header currentPath="/shop" />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:py-14">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">←</span>
            Back to all products
          </Link>

          <article className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface">
                <Image
                  src={mainImage.src}
                  alt={mainImage.alt}
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="(min-width: 1280px) 600px, (min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>

              {otherImages.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 gap-4">
                  {otherImages.map((image) => (
                    <li
                      key={image.src}
                      className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface"
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, 50vw"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="lg:sticky lg:top-10 lg:self-start lg:pt-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
                {category.name}
              </p>
              <h1 className="mt-4 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
                {name}
              </h1>
              <p className="mt-5 text-xl tabular-nums">{formatPrice(price)}</p>

              <div className="mt-8">
                <AddToCartButton
                  variantId={variantId}
                  availableForSale={availableForSale}
                />
              </div>

              <div className="mt-8 border-t border-line pt-8">
                <h2 className="sr-only">Description</h2>
                <p className="max-w-md text-base leading-relaxed text-ink-muted">
                  {description}
                </p>
              </div>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
