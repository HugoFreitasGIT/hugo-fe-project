// Data-integrity tests for the Shopify → Product conversion.
// Shopify responses are mocked, so no credentials or network are needed.

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { ShopifyError } from "@/lib/shopify/errors";
import {
  getStorefrontProduct,
  getStorefrontProducts,
} from "@/lib/shopify/storefront-products";

type MockProduct = Record<string, unknown>;

const IMAGE_A = "https://cdn.shopify.com/s/files/a.png?v=1";
const IMAGE_B = "https://cdn.shopify.com/s/files/b.png?v=1";
const VARIANT_ID = "gid://shopify/ProductVariant/11";

function shopifyProduct(overrides: MockProduct = {}): MockProduct {
  return {
    id: "gid://shopify/Product/1",
    handle: "arc-ceramic-vase",
    title: "Arc Ceramic Vase",
    description: "A hand-thrown stoneware vase.",
    productType: "Home",
    featuredImage: { url: IMAGE_A, altText: "Tall ceramic vase" },
    priceRange: { minVariantPrice: { amount: "64.0", currencyCode: "EUR" } },
    images: { nodes: [{ url: IMAGE_A, altText: "Tall ceramic vase" }] },
    variants: { nodes: [{ id: VARIANT_ID, availableForSale: true }] },
    ...overrides,
  };
}

const withPrice = (amount: string, currencyCode = "EUR") => ({
  priceRange: { minVariantPrice: { amount, currencyCode } },
});

// Replaces fetch so the Storefront client receives `data` as its response.
function mockStorefront(data: unknown) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ data }), { status: 200 });
}

async function assertDataError(promise: Promise<unknown>, message: RegExp) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ShopifyError);
    assert.equal(error.kind, "data");
    assert.match(error.message, message);
    return true;
  });
}

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

beforeEach(() => {
  // Dummy values: the client only needs them to be present and well-formed.
  process.env.SHOPIFY_STORE_DOMAIN = "example.myshopify.com";
  process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN = "mock-token";
  console.warn = () => {}; // Skipped products are logged; keep output clean.
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
});

describe("getStorefrontProducts", () => {
  test("maps a valid product to the storefront Product type", async () => {
    mockStorefront({ products: { nodes: [shopifyProduct()] } });

    assert.deepEqual(await getStorefrontProducts(), [
      {
        id: "gid://shopify/Product/1",
        slug: "arc-ceramic-vase",
        name: "Arc Ceramic Vase",
        description: "A hand-thrown stoneware vase.",
        price: { amount: 6400, currency: "EUR" },
        category: { slug: "home", name: "Home" },
        image: { src: IMAGE_A, alt: "Tall ceramic vase" },
      },
    ]);
  });

  test("converts decimal prices to integer cents", async () => {
    mockStorefront({
      products: {
        nodes: [
          shopifyProduct({ handle: "a", ...withPrice("29.9") }),
          shopifyProduct({ handle: "b", ...withPrice("149") }),
          shopifyProduct({ handle: "c", ...withPrice("0.05") }),
        ],
      },
    });

    const prices = (await getStorefrontProducts()).map((p) => p.price.amount);
    assert.deepEqual(prices, [2990, 14900, 5]);
  });

  test("returns an empty list when Shopify has no products", async () => {
    mockStorefront({ products: { nodes: [] } });
    assert.deepEqual(await getStorefrontProducts(), []);
  });

  test("skips invalid products but keeps valid ones", async () => {
    mockStorefront({
      products: {
        nodes: [
          shopifyProduct(),
          shopifyProduct({ handle: "usd", ...withPrice("10.0", "USD") }),
          shopifyProduct({ handle: "bad-price", ...withPrice("abc") }),
          shopifyProduct({ handle: "no-type", productType: " " }),
          shopifyProduct({ handle: "no-image", featuredImage: null }),
        ],
      },
    });

    const handles = (await getStorefrontProducts()).map((p) => p.slug);
    assert.deepEqual(handles, ["arc-ceramic-vase"]);
  });

  test("throws a data error when every product is invalid", async () => {
    mockStorefront({
      products: {
        nodes: [
          shopifyProduct(withPrice("64.0", "USD")),
          shopifyProduct({ handle: "b", featuredImage: null }),
        ],
      },
    });

    await assertDataError(
      getStorefrontProducts(),
      /returned 2 products, but none passed validation/,
    );
  });
});

describe("getStorefrontProduct", () => {
  test("returns null for an unknown handle", async () => {
    mockStorefront({ product: null });
    assert.equal(await getStorefrontProduct("does-not-exist"), null);
  });

  test("throws a data error for an invalid product", async () => {
    mockStorefront({ product: shopifyProduct(withPrice("64.0", "USD")) });
    await assertDataError(
      getStorefrontProduct("arc-ceramic-vase"),
      /unsupported currency USD/,
    );
  });

  test("lists the featured image first, falling back to the title for alt text", async () => {
    mockStorefront({
      product: shopifyProduct({
        images: {
          nodes: [
            { url: IMAGE_B, altText: null },
            { url: IMAGE_A, altText: "Tall ceramic vase" },
          ],
        },
      }),
    });

    const product = await getStorefrontProduct("arc-ceramic-vase");
    assert.deepEqual(product?.images, [
      { src: IMAGE_A, alt: "Tall ceramic vase" },
      { src: IMAGE_B, alt: "Arc Ceramic Vase" },
    ]);
  });

  test("exposes the first variant for the cart", async () => {
    mockStorefront({
      product: shopifyProduct({
        variants: { nodes: [{ id: VARIANT_ID, availableForSale: false }] },
      }),
    });

    const product = await getStorefrontProduct("arc-ceramic-vase");
    assert.equal(product?.variantId, VARIANT_ID);
    assert.equal(product?.availableForSale, false);
  });

  test("throws a data error when the product has no variant", async () => {
    mockStorefront({ product: shopifyProduct({ variants: { nodes: [] } }) });
    await assertDataError(
      getStorefrontProduct("arc-ceramic-vase"),
      /missing variant/,
    );
  });

  test("keeps catalog requests cached in production", async () => {
    let init: RequestInit | undefined;
    globalThis.fetch = async (_input, requestInit) => {
      init = requestInit;
      return new Response(JSON.stringify({ data: { products: { nodes: [] } } }));
    };
    const env = process.env as Record<string, string | undefined>;
    const nodeEnv = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      await getStorefrontProducts();
    } finally {
      env.NODE_ENV = nodeEnv;
    }

    assert.equal(init?.cache, "force-cache");
    assert.ok(!new Headers(init?.headers).has("Shopify-Storefront-Buyer-IP"));
  });
});
