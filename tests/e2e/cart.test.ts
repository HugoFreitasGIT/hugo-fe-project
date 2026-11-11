// Browser checks of the cart against the live Shopify store: adding from a
// product page, the header count, persistence across reloads, quantity
// changes, removal, the checkout link and that the cart ID stays httpOnly.
//
// Uses a real (temporary) Shopify cart, which is emptied again at the end.
// Each run starts with a fresh browser profile, so the cart starts empty.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launchBrowser, type Browser } from "./helpers/browser";
import { formatEuro } from "./helpers/html";
import { startNextServer, type NextServer } from "./helpers/next-server";

let server: NextServer;
let browser: Browser;

const PRODUCT = { slug: "linen-throw", name: "Linen Throw", price: 8900 };

const url = (path: string) => `${server.baseUrl}${path}`;
const cartLabel = () =>
  browser.evaluate<string | null>(
    `document.querySelector('header a[href="/cart"]')?.getAttribute("aria-label")`,
  );
const waitForCartLabel = (label: string) =>
  browser.waitFor(
    `document.querySelector('header a[href="/cart"]')?.getAttribute("aria-label") === ${JSON.stringify(label)}`,
    `header cart link "${label}"`,
  );
const button = (text: string) =>
  `[...document.querySelectorAll("main button")].find((b) => b.textContent.trim() === ${JSON.stringify(text)})`;
const lineButton = (label: string) =>
  `document.querySelector('main button[aria-label="${label} ${PRODUCT.name}"]')`;
const text = (selector: string) =>
  browser.evaluate<string | null>(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`);

async function waitForCart(quantity: number) {
  await browser.waitFor(
    `document.querySelector("[data-line-quantity]")?.textContent === "${quantity}" &&
      !document.querySelector("main [aria-live]")?.textContent.includes("Updating")`,
    `cart line quantity ${quantity}`,
  );
  assert.equal(await text("[data-line-total]"), formatEuro(PRODUCT.price * quantity));
  assert.equal(await text("[data-cart-subtotal]"), formatEuro(PRODUCT.price * quantity));
  await waitForCartLabel(`Cart, ${quantity} ${quantity === 1 ? "item" : "items"}`);
}

before(async () => {
  server = await startNextServer();
  browser = await launchBrowser();
});

after(async () => {
  await browser?.close();
  await server?.stop();
});

describe("cart", () => {
  test("starts empty", async () => {
    await browser.goto(url("/cart"));
    await browser.waitFor(
      `document.querySelector("main h1")?.textContent === "Your cart is empty"`,
      "the empty cart message",
    );
    await waitForCartLabel("Cart, 0 items");
    assert.ok(await browser.evaluate(`!!document.querySelector('main a[href="/shop"]')`));
  });

  test("adds a product from its page and updates the header", async () => {
    await browser.goto(url(`/shop/${PRODUCT.slug}`));
    await browser.waitForHydration();
    await waitForCartLabel("Cart, 0 items");

    await browser.click(button("Add to cart"));
    await browser.waitFor(
      `document.querySelector("main [aria-live]")?.textContent.includes("Added to your cart.")`,
      "the added confirmation",
    );
    await waitForCartLabel("Cart, 1 item");
  });

  test("ignores a second click while an add is in progress", async () => {
    // Two clicks back to back, before the first add has finished.
    await browser.evaluate(`(() => { const b = ${button("Add to cart")}; b.click(); b.click(); })()`);
    await waitForCartLabel("Cart, 2 items");

    // Next.js queues Server Actions, so a second add that slipped through
    // would only land after the first: wait before checking the cart.
    await browser.evaluate(`new Promise((resolve) => setTimeout(resolve, 3000))`);
    const quantity = await browser.evaluate<number>(
      `fetch("/api/cart").then((r) => r.json()).then((r) => r.cart.totalQuantity)`,
    );
    assert.equal(quantity, 2);
    assert.equal(await cartLabel(), "Cart, 2 items");
  });

  test("keeps the cart ID in an httpOnly cookie", async () => {
    assert.equal(await browser.evaluate(`document.cookie.includes("noma_cart")`), false);
  });

  test("persists across a full reload", async () => {
    await browser.goto(url(`/shop/${PRODUCT.slug}`));
    await waitForCartLabel("Cart, 2 items");
  });

  test("shows the line and subtotal on /cart", async () => {
    await browser.waitForHydration();
    await browser.click(`document.querySelector('header a[href="/cart"]')`);
    await browser.waitFor(`location.pathname === "/cart"`, "/cart");
    await waitForCart(2);
    assert.equal(await text("main li h2"), PRODUCT.name);
    assert.equal(await cartLabel(), "Cart, 2 items");
  });

  test("links to Shopify checkout on the store domain", async () => {
    const href = await browser.evaluate<string>(
      `[...document.querySelectorAll("main a")].find((a) => a.textContent === "Checkout")?.href ?? ""`,
    );
    const checkout = new URL(href);
    const storeDomain = (process.env.SHOPIFY_STORE_DOMAIN ?? "")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();
    assert.equal(checkout.protocol, "https:");
    assert.equal(checkout.hostname, storeDomain);
    assert.match(checkout.pathname, /^\/cart\/c\//);
  });

  test("increases and decreases the quantity", async () => {
    await browser.click(lineButton("Increase quantity of"));
    await waitForCart(3);
    await browser.click(lineButton("Decrease quantity of"));
    await waitForCart(2);
  });

  test("has no horizontal overflow at 390px", async () => {
    await browser.setViewport(390, 844);
    try {
      const { viewport, content } = await browser.evaluate<{ viewport: number; content: number }>(
        `({ viewport: innerWidth, content: document.documentElement.scrollWidth })`,
      );
      assert.equal(viewport, 390);
      assert.ok(content <= viewport, `content is ${content}px wide`);
    } finally {
      await browser.setViewport(1280, 900);
    }
  });

  test("removes the line and shows the empty state", async () => {
    await browser.click(`document.querySelector("main li button:not([aria-label])")`);
    await browser.waitFor(
      `document.querySelector("main h1")?.textContent === "Your cart is empty"`,
      "the empty cart message",
    );
    await waitForCartLabel("Cart, 0 items");
  });
});

test("no cart page, response or script exposes the Storefront API token", async (t) => {
  const token = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.trim();
  if (!token) {
    t.skip("SHOPIFY_STOREFRONT_PRIVATE_TOKEN is not set in this process");
    return;
  }

  const bodies: string[] = [];
  for (const path of ["/cart", `/shop/${PRODUCT.slug}`, "/api/cart"]) {
    bodies.push(await (await fetch(url(path))).text());
  }
  const scripts = new Set(
    bodies.flatMap((body) => [...body.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1])),
  );
  assert.ok(scripts.size > 0, "expected client scripts");
  for (const script of scripts) {
    bodies.push(await (await fetch(url(script))).text());
  }

  assert.ok(bodies.every((body) => !body.includes(token)));
});
