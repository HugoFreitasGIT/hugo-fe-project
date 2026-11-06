// Shared error type for the Shopify Admin and Storefront API clients.
// Messages describe what failed and must never include credentials or tokens.

// "data": Shopify responded, but the content failed validation (e.g. wrong currency).
export type ShopifyErrorKind =
  | "config"
  | "auth"
  | "api"
  | "graphql"
  | "network"
  | "data";

export class ShopifyError extends Error {
  readonly kind: ShopifyErrorKind;
  readonly status?: number;

  constructor(kind: ShopifyErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ShopifyError";
    this.kind = kind;
    this.status = status;
  }
}
