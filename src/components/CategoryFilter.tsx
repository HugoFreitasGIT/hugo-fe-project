import Link from "next/link";

import { shopHref } from "@/lib/product-category";
import type { SortOption } from "@/lib/product-sort";
import type { ProductCategory } from "@/types/product";

type CategoryFilterProps = {
  categories: ProductCategory[];
  active: ProductCategory | null;
  /** Kept in every link, so switching category preserves the sort order. */
  sort: SortOption;
};

// Category links for /shop. Plain links: the selection lives in the URL
// (?category=), so it can be shared and the back button restores it.
export default function CategoryFilter({ categories, active, sort }: CategoryFilterProps) {
  const items = [{ slug: null, name: "All" }, ...categories];

  return (
    <nav aria-label="Product categories">
      <ul className="flex flex-wrap gap-2">
        {items.map(({ slug, name }) => {
          const isCurrent = (active?.slug ?? null) === slug;
          return (
            <li key={slug ?? "all"}>
              <Link
                href={shopHref({ category: slug, sort })}
                scroll={false}
                aria-current={isCurrent ? "page" : undefined}
                className="inline-flex rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-canvas"
              >
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
