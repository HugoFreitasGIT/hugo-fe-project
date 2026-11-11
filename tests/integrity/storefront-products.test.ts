// Data-integrity tests for the Shopify → Product conversion.
// Shopify responses are mocked, so no credentials or network are needed.

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { ShopifyError } from "@/lib/shopify/errors";
import {
  getStorefrontProduct,
  getStorefrontProducts,
  MAX_PRODUCT_PAGES,
  PRODUCTS_PAGE_SIZE,
} from "@/lib/shopify/storefront-products";

type MockProduct = Record<string, unknown>;

const IMAGE_A = "https://cdn.shopify.com/s/files/a.png?v=1";
const IMAGE_B = "https://cdn.shopify.com/s/files/b.png?v=1";
const VARIANT_ID = "gid://shopify/ProductVariant/11";

// Shopify IDs are unique: a product given its own handle also gets its own ID.
function shopifyProduct(overrides: MockProduct = {}): MockProduct {
  return {
    id: overrides.handle ? `gid://shopify/Product/${overrides.handle}` : "gid://shopify/Product/1",
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

// pageInfo of the last (or only) page of a product list.
const LAST_PAGE = { hasNextPage: false, endCursor: null };

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
    mockStorefront({ products: { nodes: [shopifyProduct()], pageInfo: LAST_PAGE } });

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
        pageInfo: LAST_PAGE,
      },
    });

    const prices = (await getStorefrontProducts()).map((p) => p.price.amount);
    assert.deepEqual(prices, [2990, 14900, 5]);
  });

  test("returns an empty list when Shopify has no products", async () => {
    mockStorefront({ products: { nodes: [], pageInfo: LAST_PAGE } });
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
        pageInfo: LAST_PAGE,
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
        pageInfo: LAST_PAGE,
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
      return new Response(JSON.stringify({ data: { products: { nodes: [], pageInfo: LAST_PAGE } } }));
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

describe("getStorefrontProducts pagination", () => {
  type Page = { nodes: MockProduct[]; hasNextPage: boolean; endCursor: string | null };
  type Request = { first: unknown; after: unknown; query: string; init: RequestInit | undefined };

  // `count` valid products with unique IDs and handles, starting at `start`.
  const productsFrom = (start: number, count: number) =>
    Array.from({ length: count }, (_, i) => shopifyProduct({ handle: `p-${start + i}` }));

  // Pages of PRODUCTS_PAGE_SIZE for `total` products, linked by cursors.
  function pagesFor(total: number): Page[] {
    const pages: Page[] = [];
    for (let start = 0; start < total || pages.length === 0; start += PRODUCTS_PAGE_SIZE) {
      const count = Math.min(PRODUCTS_PAGE_SIZE, total - start);
      const hasNextPage = start + count < total;
      pages.push({
        nodes: productsFrom(start, count),
        hasNextPage,
        endCursor: count > 0 ? `cursor-${pages.length + 1}` : null,
      });
    }
    return pages;
  }

  // Serves `responses` in order (a Page, or a Response for errors) and records
  // every request. A request beyond the list fails the test.
  function mockPages(responses: (Page | Response)[]): Request[] {
    const requests: Request[] = [];
    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        query: string;
        variables: { first: unknown; after: unknown };
      };
      requests.push({ ...body.variables, query: body.query, init });
      const response = responses[requests.length - 1];
      if (!response) throw new Error(`unexpected request #${requests.length}`);
      if (response instanceof Response) return response;
      const { nodes, hasNextPage, endCursor } = response;
      return new Response(
        JSON.stringify({ data: { products: { nodes, pageInfo: { hasNextPage, endCursor } } } }),
      );
    };
    return requests;
  }

  const slugs = (products: { slug: string }[]) => products.map((p) => p.slug);
  const expectedSlugs = (count: number) => Array.from({ length: count }, (_, i) => `p-${i}`);

  test("uses Shopify's maximum page size and a stable ID order", () => {
    assert.equal(PRODUCTS_PAGE_SIZE, 250);
    assert.equal(MAX_PRODUCT_PAGES, 4);
  });

  test("a single page with fewer than 250 products takes one request", async () => {
    const requests = mockPages(pagesFor(30));
    assert.deepEqual(slugs(await getStorefrontProducts()), expectedSlugs(30));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].first, 250);
    assert.equal(requests[0].after, null);
    assert.match(requests[0].query, /products\(first: \$first, after: \$after, sortKey: ID\)/);
    assert.match(requests[0].query, /pageInfo \{\s*hasNextPage\s*endCursor\s*\}/);
  });

  test("follows cursors across pages and keeps Shopify's order", async () => {
    const requests = mockPages(pagesFor(510));
    assert.deepEqual(slugs(await getStorefrontProducts()), expectedSlugs(510));
    assert.deepEqual(
      requests.map((r) => r.after),
      [null, "cursor-1", "cursor-2"],
    );
    assert.ok(requests.every((r) => r.first === 250));
  });

  test("exactly 250 products fit in one request", async () => {
    const requests = mockPages(pagesFor(250));
    assert.equal((await getStorefrontProducts()).length, 250);
    assert.equal(requests.length, 1);
  });

  test("251 products take a second request", async () => {
    const requests = mockPages(pagesFor(251));
    const products = await getStorefrontProducts();
    assert.equal(products.length, 251);
    assert.equal(products.at(-1)?.slug, "p-250");
    assert.equal(requests.length, 2);
  });

  test("exactly 1,000 products are returned in full", async () => {
    const requests = mockPages(pagesFor(1000));
    assert.deepEqual(slugs(await getStorefrontProducts()), expectedSlugs(1000));
    assert.equal(requests.length, MAX_PRODUCT_PAGES);
  });

  test("more than 1,000 products fail instead of returning an incomplete catalog", async () => {
    const requests = mockPages(pagesFor(1001));
    await assertDataError(getStorefrontProducts(), /more than 1000 products/);
    // Stops after the last allowed page; the 1,001st product is never requested.
    assert.equal(requests.length, MAX_PRODUCT_PAGES);
  });

  test("a next page without a cursor is a data error", async () => {
    const requests = mockPages([{ nodes: productsFrom(0, 250), hasNextPage: true, endCursor: null }]);
    await assertDataError(getStorefrontProducts(), /more products after page 1 but returned no cursor/);
    assert.equal(requests.length, 1);
  });

  test("a repeated cursor is a data error instead of an endless loop", async () => {
    const requests = mockPages([
      { nodes: productsFrom(0, 250), hasNextPage: true, endCursor: "cursor-1" },
      { nodes: productsFrom(250, 250), hasNextPage: true, endCursor: "cursor-1" },
    ]);
    await assertDataError(getStorefrontProducts(), /repeated cursor after page 2/);
    assert.equal(requests.length, 2);
  });

  test("an HTTP error on a later page fails the whole catalog", async () => {
    const [first] = pagesFor(300);
    mockPages([first, new Response("Service unavailable", { status: 503 })]);
    await assert.rejects(getStorefrontProducts(), (error: unknown) => {
      assert.ok(error instanceof ShopifyError);
      assert.equal(error.kind, "api");
      assert.equal(error.status, 503);
      return true;
    });
  });

  test("a GraphQL error on a later page fails the whole catalog", async () => {
    const [first] = pagesFor(300);
    mockPages([
      first,
      new Response(JSON.stringify({ errors: [{ message: "Throttled" }] }), { status: 200 }),
    ]);
    await assert.rejects(getStorefrontProducts(), (error: unknown) => {
      assert.ok(error instanceof ShopifyError);
      assert.equal(error.kind, "graphql");
      assert.match(error.message, /Throttled/);
      return true;
    });
  });

  test("validation applies across pages: invalid products are skipped on every page", async () => {
    mockPages([
      {
        nodes: [shopifyProduct({ handle: "usd", ...withPrice("10.0", "USD") }), ...productsFrom(0, 2)],
        hasNextPage: true,
        endCursor: "cursor-1",
      },
      {
        nodes: [...productsFrom(2, 1), shopifyProduct({ handle: "no-image", featuredImage: null })],
        hasNextPage: false,
        endCursor: "cursor-2",
      },
    ]);
    assert.deepEqual(slugs(await getStorefrontProducts()), ["p-0", "p-1", "p-2"]);
  });

  test("validation applies across pages: all products invalid is a data error", async () => {
    mockPages([
      { nodes: [shopifyProduct({ handle: "usd", ...withPrice("1.0", "USD") })], hasNextPage: true, endCursor: "cursor-1" },
      { nodes: [shopifyProduct({ handle: "no-image", featuredImage: null })], hasNextPage: false, endCursor: "cursor-2" },
    ]);
    await assertDataError(getStorefrontProducts(), /returned 2 products, but none passed validation/);
  });

  test("a product repeated on a later page is a data error, not a deduplicated catalog", async () => {
    const requests = mockPages([
      { nodes: productsFrom(0, 2), hasNextPage: true, endCursor: "cursor-1" },
      { nodes: [...productsFrom(1, 1), ...productsFrom(2, 1)], hasNextPage: false, endCursor: "cursor-2" },
    ]);
    await assertDataError(
      getStorefrontProducts(),
      /Product "p-1" appeared again on page 2; the catalog pages are inconsistent/,
    );
    assert.equal(requests.length, 2);
  });

  test("every page request is cached in production", async () => {
    const requests = mockPages(pagesFor(600));
    const env = process.env as Record<string, string | undefined>;
    const nodeEnv = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      await getStorefrontProducts();
    } finally {
      env.NODE_ENV = nodeEnv;
    }

    assert.equal(requests.length, 3);
    for (const { init } of requests) {
      assert.equal(init?.cache, "force-cache");
      assert.deepEqual((init as RequestInit & { next?: unknown })?.next, { revalidate: 3600 });
      assert.ok(!new Headers(init?.headers).has("Shopify-Storefront-Buyer-IP"));
    }
  });

  test("page requests are not cached during development", async () => {
    const requests = mockPages(pagesFor(300));
    await getStorefrontProducts();
    assert.equal(requests.length, 2);
    assert.ok(requests.every(({ init }) => init?.cache === "no-store"));
  });
});
