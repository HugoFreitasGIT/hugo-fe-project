import { DEFAULT_SORT, type SortOption } from "@/lib/product-sort";
import type { Product, ProductCategory } from "@/types/product";

// Category filtering for /shop, driven by `?category=<slug>`. Valid slugs are
// the categories present in the catalog (derived from each Shopify product
// type, e.g. "Kitchen" → "kitchen"), so there is no second list to keep in sync.

/** The catalog's categories, one per slug, sorted by name. */
export function getCategories(products: readonly Product[]): ProductCategory[] {
  const bySlug = new Map(products.map((p) => [p.category.slug, p.category]));
  return [...bySlug.values()].toSorted((a, b) => a.name.localeCompare(b.name, "en"));
}

/**
 * Reads `?category=`. Returns the matching category, or null (all products)
 * for missing, empty or unknown values. Repeated parameters use the first.
 */
export function parseCategory(
  value: string | string[] | undefined,
  categories: readonly ProductCategory[],
): ProductCategory | null {
  const first = Array.isArray(value) ? value[0] : value;
  return categories.find((category) => category.slug === first) ?? null;
}

/** Products in the category, in their original order; all of them for null. */
export function filterByCategory(
  products: readonly Product[],
  category: ProductCategory | null,
): Product[] {
  return category ? products.filter((p) => p.category.slug === category.slug) : [...products];
}

/**
 * Builds a /shop URL that keeps both parameters, leaving defaults out so the
 * full, unsorted catalog stays at plain `/shop`.
 */
export function shopHref({ category, sort }: { category: string | null; sort: SortOption }): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort !== DEFAULT_SORT) params.set("sort", sort);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}
