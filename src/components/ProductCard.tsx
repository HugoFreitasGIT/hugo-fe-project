import Image from "next/image";

import { formatPrice } from "@/lib/format-price";
import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { name, price, category, image } = product;

  return (
    <article className="flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-medium">{name}</h2>
        <p className="shrink-0 text-sm tabular-nums">{formatPrice(price)}</p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{category.name}</p>
    </article>
  );
}
