import "server-only";

import { ShopifyError } from "@/lib/shopify/errors";

// Shared by the Admin and Storefront clients, which target the same API version.
const DEFAULT_API_VERSION = "2026-10";

export function getApiVersion(): string {
  return process.env.SHOPIFY_API_VERSION?.trim() || DEFAULT_API_VERSION;
}

// Accepts "store.myshopify.com" with or without a protocol or trailing slash.
export function parseStoreDomain(value: string): string {
  const host = value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(host)) {
    throw new ShopifyError(
      "config",
      "SHOPIFY_STORE_DOMAIN must be a *.myshopify.com domain.",
    );
  }
  return host;
}
