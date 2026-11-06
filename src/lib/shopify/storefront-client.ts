import "server-only";

import { getApiVersion, parseStoreDomain } from "@/lib/shopify/config";
import { ShopifyError } from "@/lib/shopify/errors";

// Minimal Shopify Storefront GraphQL client using a private access token.
// The token is only sent in a request header and never appears in errors.
//
// Catalog queries are not buyer-specific, so the Shopify-Storefront-Buyer-IP
// header is not sent. Add it for buyer-driven requests such as the cart.

const REVALIDATE_SECONDS = 3600;

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: { message: string }[];
};

function getConfig() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const privateToken = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.trim();

  const missing = [
    !storeDomain && "SHOPIFY_STORE_DOMAIN",
    !privateToken && "SHOPIFY_STOREFRONT_PRIVATE_TOKEN",
  ].filter(Boolean);

  if (!storeDomain || !privateToken) {
    throw new ShopifyError(
      "config",
      `Missing Shopify environment variables: ${missing.join(", ")}.`,
    );
  }

  return {
    storeDomain: parseStoreDomain(storeDomain),
    privateToken,
    apiVersion: getApiVersion(),
  };
}

// No caching while developing; cache for an hour in production. Shopify's
// GraphQL API only accepts POST, which Next.js caches only when opted in.
function getCacheOptions(): RequestInit {
  return process.env.NODE_ENV === "production"
    ? { cache: "force-cache", next: { revalidate: REVALIDATE_SECONDS } }
    : { cache: "no-store" };
}

/**
 * Executes a query against the Shopify Storefront GraphQL API.
 * Server-only: importing this module from a Client Component fails the build.
 */
export async function shopifyStorefrontFetch<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const config = getConfig();

  let response: Response;
  try {
    response = await fetch(
      `https://${config.storeDomain}/api/${config.apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Shopify-Storefront-Private-Token": config.privateToken,
        },
        body: JSON.stringify({ query, variables }),
        ...getCacheOptions(),
      },
    );
  } catch {
    throw new ShopifyError(
      "network",
      "Could not reach the Shopify Storefront API.",
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new ShopifyError(
      "auth",
      `Shopify Storefront API denied the request (HTTP ${response.status}). Check the storefront token and its permissions.`,
      response.status,
    );
  }

  if (!response.ok) {
    throw new ShopifyError(
      "api",
      `Shopify Storefront API request failed (HTTP ${response.status}).`,
      response.status,
    );
  }

  let body: GraphQLResponse<TData> | null;
  try {
    body = (await response.json()) as GraphQLResponse<TData>;
  } catch {
    body = null;
  }

  if (body?.errors?.length) {
    throw new ShopifyError(
      "graphql",
      `Shopify GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`,
    );
  }

  if (!body?.data) {
    throw new ShopifyError(
      "api",
      "Shopify Storefront API returned an empty response.",
    );
  }

  return body.data;
}
