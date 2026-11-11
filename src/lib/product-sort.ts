import type { Product } from "@/types/product";

// Sorting for /shop, driven by the `?sort=` query parameter. "featured" keeps
// the order Shopify returns and is the default, so it is left out of the URL.

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "name-desc", label: "Name: Z–A" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortOption = "featured";

const isSortOption = (value: string): value is SortOption =>
  SORT_OPTIONS.some((option) => option.value === value);

/** Reads `?sort=`; unknown, empty or missing values fall back to the default. */
export function parseSort(value: string | string[] | undefined): SortOption {
  const first = Array.isArray(value) ? value[0] : value;
  return first && isSortOption(first) ? first : DEFAULT_SORT;
}

// A fixed locale keeps the order identical on every server, whatever its
// default locale. The slug breaks ties between identical names.
const collator = new Intl.Collator("en", { sensitivity: "base" });
const byName = (a: Product, b: Product) =>
  collator.compare(a.name, b.name) || a.slug.localeCompare(b.slug);

// Products with the same price are always listed by name A–Z, in both
// directions, so the order is deterministic.
const comparators: Record<Exclude<SortOption, "featured">, (a: Product, b: Product) => number> = {
  "price-asc": (a, b) => a.price.amount - b.price.amount || byName(a, b),
  "price-desc": (a, b) => b.price.amount - a.price.amount || byName(a, b),
  "name-asc": byName,
  "name-desc": (a, b) => byName(b, a),
};

/** Returns a sorted copy; the input array is never modified. */
export function sortProducts(products: readonly Product[], sort: SortOption): Product[] {
  return sort === "featured" ? [...products] : products.toSorted(comparators[sort]);
}
