// Browser checks: navigation between /shop and product pages, the 404 page
// as users see it, and mobile layout.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launchBrowser, type Browser } from "./helpers/browser";
import { startNextServer, type NextServer } from "./helpers/next-server";

let server: NextServer;
let browser: Browser;

const url = (path: string) => `${server.baseUrl}${path}`;
const backToShopLink = `[...document.querySelectorAll('main a[href="/shop"]')]
  .find((a) => a.textContent.includes("Back to all products"))`;

// Marks the current document; it survives client-side navigation only.
const markDocument = () => browser.evaluate(`window.__e2eMarker = true`);
const isSameDocument = () => browser.evaluate<boolean>(`window.__e2eMarker === true`);

before(async () => {
  server = await startNextServer();
  browser = await launchBrowser();
});

after(async () => {
  await browser?.close();
  await server?.stop();
});

describe("navigation", () => {
  test("clicking a product card opens its page client-side", async () => {
    await browser.goto(url("/shop"));
    await browser.waitForHydration();
    await markDocument();

    // Click the image, not the link text: the whole card must be clickable.
    await browser.click(`[...document.querySelectorAll("article")]
      .find((card) => card.textContent.includes("Linen Throw"))?.querySelector("img")`);
    await browser.waitFor(
      `location.pathname === "/shop/linen-throw" && document.querySelector("h1")?.textContent === "Linen Throw"`,
      "the Linen Throw product page",
    );

    assert.equal(await isSameDocument(), true, "expected client-side navigation");
    assert.equal(await browser.evaluate(`document.title`), "Linen Throw · NOMA");
    assert.equal(await browser.evaluate(`document.querySelector("main .tabular-nums")?.textContent`), "€89.00");
    await browser.waitFor(
      `document.querySelector("main img")?.complete && document.querySelector("main img").naturalWidth > 0`,
      "the product image to load",
    );
  });

  test("the back link returns to /shop", async () => {
    await browser.waitForHydration();
    await markDocument();
    await browser.click(backToShopLink);
    await browser.waitFor(
      `location.pathname === "/shop" && document.querySelectorAll("article").length === 9`,
      "/shop with 9 products",
    );
    assert.equal(await isSameDocument(), true, "expected client-side navigation");
  });

  test("the browser back button returns to the product", async () => {
    await browser.evaluate(`history.back()`);
    await browser.waitFor(`location.pathname === "/shop/linen-throw"`, "/shop/linen-throw");
  });
});

describe("unknown product handle", () => {
  test("returns HTTP 404 and shows the not-found page", async () => {
    const status = await browser.goto(url("/shop/does-not-exist"));
    assert.equal(status, 404);

    await browser.waitFor(
      `document.querySelector("main h1")?.textContent === "We couldn’t find this product"`,
      "the not-found message",
    );
    assert.equal(await browser.evaluate(`document.title`), "Product not found · NOMA");
    assert.equal(
      await browser.evaluate(`document.querySelector('meta[name="robots"]')?.content`),
      "noindex",
    );
  });

  test("shows a visible back link that navigates to /shop", async () => {
    await browser.waitForHydration();
    const visible = await browser.evaluate<boolean>(`(() => {
      const link = ${backToShopLink};
      if (!link) return false;
      const rect = link.getBoundingClientRect();
      const style = getComputedStyle(link);
      return rect.width > 0 && rect.height > 0 && rect.top < innerHeight &&
        style.visibility !== "hidden" && style.display !== "none";
    })()`);
    assert.equal(visible, true);

    await browser.click(backToShopLink);
    await browser.waitFor(
      `location.pathname === "/shop" && document.querySelectorAll("article").length === 9`,
      "/shop with 9 products",
    );
  });
});

describe("mobile layout (390px)", () => {
  before(async () => {
    await browser.setViewport(390, 844);
  });

  for (const path of ["/shop", "/shop/pour-over-set", "/shop/does-not-exist"]) {
    test(`${path} has no horizontal overflow`, async () => {
      await browser.goto(url(path));
      await browser.waitFor(`document.querySelector("main h1")`, "the page heading");
      const { viewport, content } = await browser.evaluate<{ viewport: number; content: number }>(
        `({ viewport: innerWidth, content: document.documentElement.scrollWidth })`,
      );
      assert.equal(viewport, 390);
      assert.ok(content <= viewport, `content is ${content}px wide`);
    });
  }
});
