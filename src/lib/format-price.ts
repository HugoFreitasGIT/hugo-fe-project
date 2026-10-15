import type { Price } from "@/types/product";

// Amounts are stored in minor units; EUR has two decimal places.
export function formatPrice({ amount, currency }: Price): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  }).format(amount / 100);
}
