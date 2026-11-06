import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/lib/format-price";
import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
};

// The whole card is clickable through the title link's stretched ::after,
// while the link's accessible name stays just the product name.
export default function ProductCard({ product }: ProductCardProps) {
  const { slug, name, price, category, image } = product;

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-medium">
          <Link
            href={`/shop/${slug}`}
            className="underline-offset-4 after:absolute after:inset-0 group-hover:underline"
          >
            {name}
          </Link>
        </h2>
        <p className="shrink-0 text-sm tabular-nums">{formatPrice(price)}</p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{category.name}</p>
    </article>
  );
}
