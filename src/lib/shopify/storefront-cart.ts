import "server-only";

import { getStoreDomain } from "@/lib/shopify/config";
import { ShopifyError } from "@/lib/shopify/errors";
import {
  shopifyStorefrontFetch,
  type StorefrontRequestOptions,
} from "@/lib/shopify/storefront-client";
import { toCents } from "@/lib/shopify/storefront-products";
import type { Cart, CartLine } from "@/types/cart";
import type { Price } from "@/types/product";

// Shopify Storefront Cart API: cartCreate, cartLinesAdd, cartLinesUpdate,
// cartLinesRemove and the cart query. Carts are buyer-specific, so requests
// are never cached.

// Far more distinct products than a cart realistically holds.
const CART_LINES_LIMIT = 100;

const CART_FIELDS = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
    }
    lines(first: $linesFirst) {
      nodes {
        id
        quantity
        cost {
          amountPerQuantity {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            product {
              handle
              title
              featuredImage {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

const USER_ERROR_FIELDS = /* GraphQL */ `
  userErrors {
    field
    message
    code
  }
`;

const CART_QUERY = /* GraphQL */ `
  ${CART_FIELDS}
  query Cart($cartId: ID!, $linesFirst: Int!) {
    cart(id: $cartId) {
      ...CartFields
    }
  }
`;

const CART_CREATE_MUTATION = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartCreate($lines: [CartLineInput!]!, $linesFirst: Int!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        ...CartFields
      }
      ${USER_ERROR_FIELDS}
    }
  }
`;

const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $linesFirst: Int!
  ) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      ${USER_ERROR_FIELDS}
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartLinesUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $linesFirst: Int!
  ) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      ${USER_ERROR_FIELDS}
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  ${CART_FIELDS}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $linesFirst: Int!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      ${USER_ERROR_FIELDS}
    }
  }
`;

type StorefrontMoney = { amount: string; currencyCode: string };

type StorefrontCartLine = {
  id: string;
  quantity: number;
  cost: {
    amountPerQuantity: StorefrontMoney;
    totalAmount: StorefrontMoney;
  };
  // Empty object for merchandise types other than ProductVariant.
  merchandise: {
    id?: string;
    product?: {
      handle: string;
      title: string;
      featuredImage: { url: string; altText: string | null } | null;
    };
  };
};

type StorefrontCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: StorefrontMoney };
  lines: { nodes: StorefrontCartLine[] };
};

type CartUserError = {
  field: string[] | null;
  message: string;
  code: string | null;
};

type CartMutationPayload = {
  cart: StorefrontCart | null;
  userErrors: CartUserError[];
};

/** A Shopify cart: its ID stays on the server, `cart` may go to the browser. */
export type ShopifyCart = {
  id: string;
  cart: Cart;
};

export type CartLineInput = { merchandiseId: string; quantity: number };
export type CartLineUpdateInput = { id: string; quantity: number };

const CART_REQUEST: StorefrontRequestOptions = { cache: "no-store" };

function toPrice(money: StorefrontMoney, label: string): Price {
  if (money.currencyCode !== "EUR") {
    throw new ShopifyError(
      "data",
      `Cart ${label} has unsupported currency ${money.currencyCode}.`,
    );
  }
  const amount = toCents(money.amount);
  if (amount === null) {
    throw new ShopifyError("data", `Cart ${label} has an invalid amount.`);
  }
  return { amount, currency: "EUR" };
}

/**
 * Returns the checkout URL only when it is an HTTPS URL on the configured
 * store domain, so the storefront never links buyers anywhere else.
 */
export function toCheckoutUrl(value: string, storeDomain: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const isStoreUrl =
    url.protocol === "https:" &&
    url.hostname === storeDomain.toLowerCase() &&
    url.port === "" &&
    url.username === "" &&
    url.password === "";

  return isStoreUrl ? url.href : null;
}

function toCartLine(node: StorefrontCartLine): CartLine {
  const { id: variantId, product } = node.merchandise;
  if (!variantId || !product) {
    throw new ShopifyError("data", `Cart line ${node.id} is not a product variant.`);
  }

  return {
    id: node.id,
    quantity: node.quantity,
    variantId,
    product: {
      slug: product.handle,
      name: product.title,
      image: product.featuredImage?.url
        ? {
            src: product.featuredImage.url,
            alt: product.featuredImage.altText?.trim() || product.title,
          }
        : null,
    },
    unitPrice: toPrice(node.cost.amountPerQuantity, "line price"),
    total: toPrice(node.cost.totalAmount, "line total"),
  };
}

function toShopifyCart(node: StorefrontCart): ShopifyCart {
  const checkoutUrl = toCheckoutUrl(node.checkoutUrl, getStoreDomain());
  if (!checkoutUrl) {
    console.warn("[shopify] Ignoring a checkout URL outside the store domain.");
  }

  return {
    id: node.id,
    cart: {
      totalQuantity: node.totalQuantity,
      subtotal: toPrice(node.cost.subtotalAmount, "subtotal"),
      lines: node.lines.nodes.map(toCartLine),
      checkoutUrl,
    },
  };
}

// Shopify reports an unknown, expired or completed cart as a user error on the
// cartId field (and may still return an unrelated cart alongside it).
const isMissingCartError = (error: CartUserError) => error.field?.[0] === "cartId";

// Returns null when the cart no longer exists.
function fromPayload(
  payload: CartMutationPayload,
  operation: string,
): ShopifyCart | null {
  if (payload.userErrors.some(isMissingCartError)) return null;

  if (payload.userErrors.length > 0) {
    throw new ShopifyError(
      "data",
      `Shopify rejected ${operation}: ${payload.userErrors.map((e) => e.message).join("; ")}`,
    );
  }

  if (!payload.cart) {
    throw new ShopifyError("api", `Shopify returned no cart for ${operation}.`);
  }

  return toShopifyCart(payload.cart);
}

/** Returns the cart, or null if it no longer exists (e.g. expired or checked out). */
export async function getShopifyCart(
  cartId: string,
  options: StorefrontRequestOptions = {},
): Promise<ShopifyCart | null> {
  const data = await shopifyStorefrontFetch<{ cart: StorefrontCart | null }>(
    CART_QUERY,
    { cartId, linesFirst: CART_LINES_LIMIT },
    { ...options, ...CART_REQUEST },
  );
  return data.cart ? toShopifyCart(data.cart) : null;
}

export async function createShopifyCart(
  lines: CartLineInput[],
  options: StorefrontRequestOptions = {},
): Promise<ShopifyCart> {
  const data = await shopifyStorefrontFetch<{ cartCreate: CartMutationPayload }>(
    CART_CREATE_MUTATION,
    { lines, linesFirst: CART_LINES_LIMIT },
    { ...options, ...CART_REQUEST },
  );
  const cart = fromPayload(data.cartCreate, "cartCreate");
  if (!cart) {
    throw new ShopifyError("api", "Shopify returned no cart for cartCreate.");
  }
  return cart;
}

/** Returns the updated cart, or null if the cart no longer exists. */
export async function addShopifyCartLines(
  cartId: string,
  lines: CartLineInput[],
  options: StorefrontRequestOptions = {},
): Promise<ShopifyCart | null> {
  const data = await shopifyStorefrontFetch<{ cartLinesAdd: CartMutationPayload }>(
    CART_LINES_ADD_MUTATION,
    { cartId, lines, linesFirst: CART_LINES_LIMIT },
    { ...options, ...CART_REQUEST },
  );
  return fromPayload(data.cartLinesAdd, "cartLinesAdd");
}

/** Returns the updated cart, or null if the cart no longer exists. */
export async function updateShopifyCartLines(
  cartId: string,
  lines: CartLineUpdateInput[],
  options: StorefrontRequestOptions = {},
): Promise<ShopifyCart | null> {
  const data = await shopifyStorefrontFetch<{ cartLinesUpdate: CartMutationPayload }>(
    CART_LINES_UPDATE_MUTATION,
    { cartId, lines, linesFirst: CART_LINES_LIMIT },
    { ...options, ...CART_REQUEST },
  );
  return fromPayload(data.cartLinesUpdate, "cartLinesUpdate");
}

/** Returns the updated cart, or null if the cart no longer exists. */
export async function removeShopifyCartLines(
  cartId: string,
  lineIds: string[],
  options: StorefrontRequestOptions = {},
): Promise<ShopifyCart | null> {
  const data = await shopifyStorefrontFetch<{ cartLinesRemove: CartMutationPayload }>(
    CART_LINES_REMOVE_MUTATION,
    { cartId, lineIds, linesFirst: CART_LINES_LIMIT },
    { ...options, ...CART_REQUEST },
  );
  return fromPayload(data.cartLinesRemove, "cartLinesRemove");
}
