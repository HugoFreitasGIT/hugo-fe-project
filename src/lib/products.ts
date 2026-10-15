import { products } from "@/data/products";
import type { Product } from "@/types/product";

// Reads from the local mock dataset for now. Kept async so it can later be
// replaced by a real data source without changing its callers.
export async function getProducts(): Promise<Product[]> {
  return products;
}
