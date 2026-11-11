// Cart tests: Shopify cart → Cart conversion, checkout URL validation, request
// options, the create/add/update/remove flow and input validation.
// Shopify responses are mocked, so no credentials or network are needed.

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { getBuyerIp } from "@/lib/buyer-ip";
import {
  addToCart,
  isCartId,
  isCartLineId,
  isLineQuantity,
  isVariantId,
  loadCart,
  removeCartLine,
  updateCartLine,
} from "@/lib/cart";
import { ShopifyError } from "@/lib/shopify/errors";
import { getShopifyCart, toCheckoutUrl } from "@/lib/shopify/storefront-cart";

const STORE = "example.myshopify.com";
const CART_ID = "gid://shopify/Cart/abc123?key=def456";
const NEW_CART_ID = "gid://shopify/Cart/new789?key=fed654";
const VARIANT_ID = "gid://shopify/ProductVariant/11";
const LINE_ID = "gid://shopify/CartLine/0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b?cart=abc123";
const CHECKOUT_URL = `https://${STORE}/cart/c/abc123?key=def456`;
const IMAGE = "https://cdn.shopify.com/s/files/a.png?v=1";

const eur = (amount: string) => ({ amount, currencyCode: "EUR" });

function shopifyCart(overrides: Record<string, unknown> = {}) {
  return {
    id: CART_ID,
    checkoutUrl: CHECKOUT_URL,
    totalQuantity: 2,
    cost: { subtotalAmount: eur("128.0") },
    lines: {
      nodes: [
        {
          id: LINE_ID,
          quantity: 2,
          cost: { amountPerQuantity: eur("64.0"), totalAmount: eur("128.0") },
          merchandise: {
            id: VARIANT_ID,
            product: {
              handle: "arc-ceramic-vase",
              title: "Arc Ceramic Vase",
              featuredImage: { url: IMAGE, altText: null },
            },
          },
        },
      ],
    },
    ...overrides,
  };
}

type Request = {
  operation: string;
  variables: Record<string, unknown>;
  init: RequestInit;
};

let requests: Request[] = [];

// Replaces fetch: `respond` receives the GraphQL operation name (e.g.
// "cartLinesAdd") and returns the response `data` for it.
function mockStorefront(respond: (operation: string) => unknown) {
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as {
      query: string;
      variables: Record<string, unknown>;
    };
    const operation = body.query.match(/(?:query|mutation) (\w+)/)?.[1] ?? "";
    const name = operation.charAt(0).toLowerCase() + operation.slice(1);
    requests.push({ operation: name, variables: body.variables, init: init ?? {} });
    return new Response(JSON.stringify({ data: respond(name) }), { status: 200 });
  };
}

const payload = (cart: unknown, userErrors: unknown[] = []) => ({ cart, userErrors });
const missingCart = payload(null, [
  { field: ["cartId"], message: "The specified cart does not exist.", code: "INVALID" },
]);

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

beforeEach(() => {
  process.env.SHOPIFY_STORE_DOMAIN = STORE;
  process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN = "mock-token";
  requests = [];
  console.warn = () => {};
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
});

describe("Shopify cart conversion", () => {
  test("maps a Shopify cart to the storefront Cart type", async () => {
    mockStorefront(() => ({ cart: shopifyCart() }));

    assert.deepEqual(await getShopifyCart(CART_ID), {
      id: CART_ID,
      cart: {
        totalQuantity: 2,
        subtotal: { amount: 12800, currency: "EUR" },
        checkoutUrl: CHECKOUT_URL,
        lines: [
          {
            id: LINE_ID,
            quantity: 2,
            variantId: VARIANT_ID,
            product: {
              slug: "arc-ceramic-vase",
              name: "Arc Ceramic Vase",
              image: { src: IMAGE, alt: "Arc Ceramic Vase" },
            },
            unitPrice: { amount: 6400, currency: "EUR" },
            total: { amount: 12800, currency: "EUR" },
          },
        ],
      },
    });
  });

  test("returns null for an expired or unknown cart", async () => {
    mockStorefront(() => ({ cart: null }));
    assert.equal(await getShopifyCart(CART_ID), null);
  });

  test("rejects a cart in another currency", async () => {
    mockStorefront(() => ({
      cart: shopifyCart({
        cost: { subtotalAmount: { amount: "128.0", currencyCode: "USD" } },
      }),
    }));

    await assert.rejects(getShopifyCart(CART_ID), (error: unknown) => {
      assert.ok(error instanceof ShopifyError);
      assert.equal(error.kind, "data");
      assert.match(error.message, /unsupported currency USD/);
      return true;
    });
  });

  test("drops a checkout URL outside the store domain", async () => {
    mockStorefront(() => ({
      cart: shopifyCart({ checkoutUrl: "https://evil.example/cart/c/abc123" }),
    }));
    assert.equal((await getShopifyCart(CART_ID))?.cart.checkoutUrl, null);
  });

  test("sends cart requests uncached, with the buyer IP when given", async () => {
    mockStorefront(() => ({ cart: shopifyCart() }));

    await getShopifyCart(CART_ID, { buyerIp: "203.0.113.7" });
    await getShopifyCart(CART_ID);

    const [withIp, withoutIp] = requests.map((request) => request.init);
    assert.equal(withIp.cache, "no-store");
    assert.equal(new Headers(withIp.headers).get("Shopify-Storefront-Buyer-IP"), "203.0.113.7");
    assert.equal(withoutIp.cache, "no-store");
    assert.ok(!new Headers(withoutIp.headers).has("Shopify-Storefront-Buyer-IP"));
  });
});

describe("toCheckoutUrl", () => {
  test("accepts an HTTPS URL on the store domain", () => {
    assert.equal(toCheckoutUrl(CHECKOUT_URL, STORE), CHECKOUT_URL);
    assert.equal(toCheckoutUrl(CHECKOUT_URL, "EXAMPLE.myshopify.com"), CHECKOUT_URL);
  });

  for (const [reason, url] of [
    ["plain HTTP", `http://${STORE}/cart/c/abc`],
    ["another host", "https://checkout.example.com/cart/c/abc"],
    ["a look-alike host", `https://${STORE}.evil.example/cart/c/abc`],
    ["a subdomain", `https://pay.${STORE}/cart/c/abc`],
    ["credentials", `https://user@${STORE}/cart/c/abc`],
    ["a custom port", `https://${STORE}:8443/cart/c/abc`],
    ["a javascript: URL", "javascript:alert(1)"],
    ["not a URL", "/cart/c/abc"],
  ]) {
    test(`rejects ${reason}`, () => {
      assert.equal(toCheckoutUrl(url, STORE), null);
    });
  }
});

describe("cart operations", () => {
  test("loading without a cart ID does not call Shopify", async () => {
    mockStorefront(() => assert.fail("unexpected request"));
    assert.deepEqual(await loadCart(null), { cartId: null, cart: null });
  });

  test("loading an expired cart clears the cart ID", async () => {
    mockStorefront(() => ({ cart: null }));
    assert.deepEqual(await loadCart(CART_ID), { cartId: null, cart: null });
  });

  test("the first add creates a cart with one unit", async () => {
    mockStorefront(() => ({ cartCreate: payload(shopifyCart()) }));

    const state = await addToCart(null, VARIANT_ID);
    assert.equal(state.cartId, CART_ID);
    assert.equal(state.cart?.totalQuantity, 2);
    assert.deepEqual(
      requests.map(({ operation, variables }) => [operation, variables.lines]),
      [["cartCreate", [{ merchandiseId: VARIANT_ID, quantity: 1 }]]],
    );
  });

  test("later adds use the existing cart", async () => {
    mockStorefront(() => ({ cartLinesAdd: payload(shopifyCart()) }));

    assert.equal((await addToCart(CART_ID, VARIANT_ID)).cartId, CART_ID);
    assert.deepEqual(
      requests.map(({ operation, variables }) => [operation, variables.cartId]),
      [["cartLinesAdd", CART_ID]],
    );
  });

  test("adding to an expired cart starts a new one", async () => {
    mockStorefront((operation) =>
      operation === "cartLinesAdd"
        ? { cartLinesAdd: missingCart }
        : { cartCreate: payload(shopifyCart({ id: NEW_CART_ID })) },
    );

    assert.equal((await addToCart(CART_ID, VARIANT_ID)).cartId, NEW_CART_ID);
    assert.deepEqual(
      requests.map((request) => request.operation),
      ["cartLinesAdd", "cartCreate"],
    );
  });

  test("updates a line's quantity", async () => {
    mockStorefront(() => ({ cartLinesUpdate: payload(shopifyCart()) }));

    await updateCartLine(CART_ID, LINE_ID, 3);
    assert.deepEqual(requests[0].variables.lines, [{ id: LINE_ID, quantity: 3 }]);
  });

  test("a quantity of 0 removes the line", async () => {
    mockStorefront(() => ({ cartLinesRemove: payload(shopifyCart()) }));

    await updateCartLine(CART_ID, LINE_ID, 0);
    assert.equal(requests[0].operation, "cartLinesRemove");
    assert.deepEqual(requests[0].variables.lineIds, [LINE_ID]);
  });

  test("changing an expired cart clears the cart ID", async () => {
    // Shopify may return an unrelated cart alongside the missing-cart error.
    mockStorefront(() => ({
      cartLinesRemove: { ...missingCart, cart: shopifyCart({ id: NEW_CART_ID }) },
    }));
    assert.deepEqual(await removeCartLine(CART_ID, LINE_ID), { cartId: null, cart: null });
  });

  test("changing lines without a cart does not call Shopify", async () => {
    mockStorefront(() => assert.fail("unexpected request"));
    assert.deepEqual(await updateCartLine(null, LINE_ID, 2), { cartId: null, cart: null });
    assert.deepEqual(await removeCartLine(null, LINE_ID), { cartId: null, cart: null });
  });

  test("other Shopify user errors become data errors", async () => {
    mockStorefront(() => ({
      cartLinesAdd: payload(null, [
        { field: ["lines", "0", "merchandiseId"], message: "Not available", code: "INVALID" },
      ]),
    }));

    await assert.rejects(addToCart(CART_ID, VARIANT_ID), (error: unknown) => {
      assert.ok(error instanceof ShopifyError);
      assert.equal(error.kind, "data");
      assert.match(error.message, /Not available/);
      return true;
    });
  });
});

describe("input validation", () => {
  test("cart IDs", () => {
    assert.equal(isCartId(CART_ID), true);
    assert.equal(isCartId("gid://shopify/Cart/abc123"), false);
    assert.equal(isCartId(`${CART_ID}&x=1`), false);
  });

  test("variant IDs", () => {
    assert.equal(isVariantId(VARIANT_ID), true);
    assert.equal(isVariantId("gid://shopify/Product/11"), false);
    assert.equal(isVariantId(11), false);
  });

  test("cart line IDs", () => {
    assert.equal(isCartLineId(LINE_ID), true);
    assert.equal(isCartLineId("gid://shopify/CartLine/abc"), true);
    assert.equal(isCartLineId(VARIANT_ID), false);
    assert.equal(isCartLineId(`gid://shopify/CartLine/${"a".repeat(200)}`), false);
    assert.equal(isCartLineId(null), false);
  });

  test("quantities", () => {
    for (const valid of [0, 1, 99]) assert.equal(isLineQuantity(valid), true, `${valid}`);
    for (const invalid of [-1, 100, 1.5, Number.NaN, "2", null]) {
      assert.equal(isLineQuantity(invalid), false, `${invalid}`);
    }
  });
});

describe("getBuyerIp", () => {
  test("is not trusted without configured proxies", () => {
    assert.equal(getBuyerIp("203.0.113.7", 0), undefined);
  });

  test("takes the address added by the trusted proxy, not a spoofed one", () => {
    // The client sent "198.51.100.1"; the single trusted proxy appended the real address.
    assert.equal(getBuyerIp("198.51.100.1, 203.0.113.7", 1), "203.0.113.7");
    assert.equal(getBuyerIp("198.51.100.1, 203.0.113.7, 10.0.0.2", 2), "203.0.113.7");
    assert.equal(getBuyerIp("2001:db8::1", 1), "2001:db8::1");
  });

  test("rejects missing or malformed addresses", () => {
    assert.equal(getBuyerIp(null, 1), undefined);
    assert.equal(getBuyerIp("203.0.113.7", 2), undefined);
    assert.equal(getBuyerIp("not-an-ip", 1), undefined);
    assert.equal(getBuyerIp("203.0.113.7, ", 1), undefined);
  });
});
