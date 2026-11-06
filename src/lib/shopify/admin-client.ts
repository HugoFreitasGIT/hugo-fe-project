import "server-only";

import { getApiVersion, parseStoreDomain } from "@/lib/shopify/config";
import { ShopifyError } from "@/lib/shopify/errors";

// Re-exported so existing callers can keep importing it from the client.
export { ShopifyError } from "@/lib/shopify/errors";
export type { ShopifyErrorKind } from "@/lib/shopify/errors";

// Minimal Shopify Admin GraphQL client authenticated with the Client
// Credentials Grant. Credentials and access tokens never leave this module:
// error messages only describe what failed, never the secret values involved.

// Refresh a little before Shopify's stated expiry to avoid using a token that
// expires mid-request.
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

type ShopifyConfig = {
  storeDomain: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
};

type CachedToken = {
  value: string;
  expiresAt: number;
};

type AccessTokenResponse = {
  access_token?: unknown;
  expires_in?: unknown;
};

type OAuthErrorResponse = {
  error?: unknown;
  error_description?: unknown;
};

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: { message: string }[];
};

let cachedToken: CachedToken | null = null;
let pendingToken: Promise<string> | null = null;

function getConfig(): ShopifyConfig {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();

  const missing = [
    !storeDomain && "SHOPIFY_STORE_DOMAIN",
    !clientId && "SHOPIFY_CLIENT_ID",
    !clientSecret && "SHOPIFY_CLIENT_SECRET",
  ].filter(Boolean);

  if (!storeDomain || !clientId || !clientSecret) {
    throw new ShopifyError(
      "config",
      `Missing Shopify environment variables: ${missing.join(", ")}.`,
    );
  }

  return {
    storeDomain: parseStoreDomain(storeDomain),
    clientId,
    clientSecret,
    apiVersion: getApiVersion(),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestAccessToken(config: ShopifyConfig): Promise<string> {
  let response: Response;
  try {
    response = await fetch(
      `https://${config.storeDomain}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        cache: "no-store",
      },
    );
  } catch {
    throw new ShopifyError(
      "network",
      "Could not reach Shopify to request an access token.",
    );
  }

  const body = await readJson(response);

  if (!response.ok) {
    // Only Shopify's OAuth error code/description are surfaced; they never
    // contain the submitted credentials.
    const { error, error_description: description } = (body ??
      {}) as OAuthErrorResponse;
    const detail = [error, description]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(": ");
    throw new ShopifyError(
      "auth",
      `Shopify rejected the access token request (HTTP ${response.status})${detail ? ` — ${detail}` : ""}. Check the client ID/secret and that the app is installed on the store.`,
      response.status,
    );
  }

  const { access_token: accessToken, expires_in: expiresIn } = (body ??
    {}) as AccessTokenResponse;

  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new ShopifyError(
      "auth",
      "Shopify returned an unexpected access token response.",
      response.status,
    );
  }

  const lifetimeMs =
    typeof expiresIn === "number" && expiresIn > 0 ? expiresIn * 1000 : 0;
  cachedToken = {
    value: accessToken,
    expiresAt: Date.now() + Math.max(lifetimeMs - TOKEN_EXPIRY_BUFFER_MS, 0),
  };

  return accessToken;
}

async function getAccessToken(config: ShopifyConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  // Share a single in-flight request between concurrent callers.
  pendingToken ??= requestAccessToken(config).finally(() => {
    pendingToken = null;
  });

  return pendingToken;
}

/**
 * Executes a query against the Shopify Admin GraphQL API.
 * Server-only: importing this module from a Client Component fails the build.
 */
export async function shopifyAdminFetch<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const config = getConfig();
  const accessToken = await getAccessToken(config);

  let response: Response;
  try {
    response = await fetch(
      `https://${config.storeDomain}/admin/api/${config.apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
      },
    );
  } catch {
    throw new ShopifyError("network", "Could not reach the Shopify Admin API.");
  }

  if (response.status === 401 || response.status === 403) {
    // The token may have been revoked or lacks scopes; force a fresh one next time.
    cachedToken = null;
    throw new ShopifyError(
      "auth",
      `Shopify Admin API denied the request (HTTP ${response.status}). Check the app's access scopes.`,
      response.status,
    );
  }

  if (!response.ok) {
    throw new ShopifyError(
      "api",
      `Shopify Admin API request failed (HTTP ${response.status}).`,
      response.status,
    );
  }

  const body = (await readJson(response)) as GraphQLResponse<TData> | null;

  if (body?.errors?.length) {
    throw new ShopifyError(
      "graphql",
      `Shopify GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`,
    );
  }

  if (!body?.data) {
    throw new ShopifyError(
      "api",
      "Shopify Admin API returned an empty response.",
    );
  }

  return body.data;
}
