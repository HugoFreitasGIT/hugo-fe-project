// Browser checks: navigation between /shop and product pages, the 404 page
// as users see it, and mobile layout.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { products } from "@/data/products";

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
      `location.pathname === "/shop" && document.querySelectorAll("article").length === ${products.length}`,
      `/shop with all ${products.length} products`,
    );
    assert.equal(await isSameDocument(), true, "expected client-side navigation");
  });

  test("the browser back button returns to the product", async () => {
    await browser.evaluate(`history.back()`);
    await browser.waitFor(`location.pathname === "/shop/linen-throw"`, "/shop/linen-throw");
  });
});

describe("sorting", () => {
  const sortSelect = `document.querySelector("#product-sort")`;
  const choose = (value: string) =>
    browser.evaluate(`(() => {
      const select = ${sortSelect};
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);

  test("choosing an option updates the URL and the order client-side", async () => {
    await browser.goto(url("/shop"));
    await browser.waitForHydration();
    await markDocument();

    assert.equal(
      await browser.evaluate(`document.querySelector('label[for="product-sort"]')?.textContent`),
      "Sort by",
    );
    await choose("price-desc");
    await browser.waitFor(`location.search === "?sort=price-desc"`, "?sort=price-desc in the URL");

    // The first card must now carry the highest price on the page.
    await browser.waitFor(`(() => {
      const prices = [...document.querySelectorAll("main article .tabular-nums")]
        .map((el) => Number(el.textContent.replace(/[^\\d.]/g, "")));
      return prices.length > 1 && prices[0] === Math.max(...prices);
    })()`, "the most expensive product first");
    assert.equal(await isSameDocument(), true, "expected client-side navigation");
  });

  test("choosing Featured removes the parameter", async () => {
    await choose("featured");
    await browser.waitFor(`location.pathname === "/shop" && location.search === ""`, "/shop without ?sort");
    assert.equal(await browser.evaluate(`${sortSelect}.value`), "featured");
  });

  test("the back button restores the previous sort order", async () => {
    await browser.evaluate(`history.back()`);
    await browser.waitFor(
      `location.search === "?sort=price-desc" && ${sortSelect}.value === "price-desc"`,
      "?sort=price-desc restored with the select in sync",
    );
  });
});

describe("category navigation", () => {
  const categoryLink = (text: string) =>
    `[...document.querySelectorAll('nav[aria-label="Product categories"] a')].find((a) => a.textContent === ${JSON.stringify(text)})`;
  const chooseSort = (value: string) =>
    browser.evaluate(`(() => {
      const select = document.querySelector("#product-sort");
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);

  // Waits until the URL, heading, cards, current category link and sort select
  // all show the expected state.
  const waitForShop = (state: {
    search: string;
    heading: string;
    category: string | null;
    sort: string;
  }) => {
    const count = state.category
      ? products.filter((p) => p.category.name === state.category).length
      : products.length;
    return browser.waitFor(
      `(() => {
        const cards = [...document.querySelectorAll("main article")];
        const categories = cards.map((card) => card.querySelector(":scope > p")?.textContent);
        return location.pathname === "/shop" &&
          location.search === ${JSON.stringify(state.search)} &&
          document.querySelector("main h1")?.textContent === ${JSON.stringify(state.heading)} &&
          cards.length === ${count} &&
          (${JSON.stringify(state.category)} === null ||
            categories.every((c) => c === ${JSON.stringify(state.category)})) &&
          document.querySelector('nav[aria-label="Product categories"] a[aria-current="page"]')
            ?.textContent === ${JSON.stringify(state.category ?? "All")} &&
          document.querySelector("#product-sort")?.value === ${JSON.stringify(state.sort)};
      })()`,
      `/shop${state.search} (${state.heading}, ${count} products, sort ${state.sort})`,
    );
  };

  const kitchen = { search: "?category=kitchen", heading: "Kitchen", category: "Kitchen", sort: "featured" };
  const kitchenByPrice = { ...kitchen, search: "?category=kitchen&sort=price-asc", sort: "price-asc" };
  const workspaceByPrice = {
    search: "?category=workspace&sort=price-asc",
    heading: "Workspace",
    category: "Workspace",
    sort: "price-asc",
  };
  const allByPrice = { search: "?sort=price-asc", heading: "Shop all products", category: null, sort: "price-asc" };

  test("a homepage category card opens the filtered shop", async () => {
    await browser.goto(url("/"));
    await browser.waitForHydration();
    await markDocument();
    await browser.click(`[...document.querySelectorAll("#categories a")]
      .find((a) => a.textContent.includes("Explore Kitchen"))`);
    await waitForShop(kitchen);
    assert.equal(await isSameDocument(), true, "expected client-side navigation");
  });

  test("changing the sort order keeps the category", async () => {
    await browser.waitForHydration();
    await chooseSort("price-asc");
    await waitForShop(kitchenByPrice);
    const prices = await browser.evaluate<number[]>(`[...document.querySelectorAll("main article .tabular-nums")]
      .map((el) => Number(el.textContent.replace(/[^\\d.]/g, "")))`);
    assert.deepEqual(prices, prices.toSorted((a, b) => a - b));
  });

  test("changing the category keeps the sort order", async () => {
    await browser.click(categoryLink("Workspace"));
    await waitForShop(workspaceByPrice);
  });

  test("All returns to the full catalog and keeps the sort order", async () => {
    await browser.click(categoryLink("All"));
    await waitForShop(allByPrice);
    assert.equal(await isSameDocument(), true, "expected client-side navigation");
  });

  test("the back button restores each earlier state", async () => {
    await browser.evaluate(`history.back()`);
    await waitForShop(workspaceByPrice);
    await browser.evaluate(`history.back()`);
    await waitForShop(kitchenByPrice);
    await browser.evaluate(`history.back()`);
    await waitForShop(kitchen);
  });

  test("the forward button restores the later states", async () => {
    await browser.evaluate(`history.forward()`);
    await waitForShop(kitchenByPrice);
    await browser.evaluate(`history.forward()`);
    await waitForShop(workspaceByPrice);
    await browser.evaluate(`history.forward()`);
    await waitForShop(allByPrice);
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
      `location.pathname === "/shop" && document.querySelectorAll("article").length === ${products.length}`,
      `/shop with all ${products.length} products`,
    );
  });
});

describe("mobile layout (390px)", () => {
  before(async () => {
    await browser.setViewport(390, 844);
  });

  for (const path of ["/shop", "/shop?category=workspace&sort=price-desc", "/shop/pour-over-set", "/shop/does-not-exist"]) {
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
