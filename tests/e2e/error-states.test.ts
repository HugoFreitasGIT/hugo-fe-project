// Browser checks of the error pages when Shopify rejects requests.
//
// The production server is started with a deliberately invalid Storefront
// token (overriding .env.local for that process only). Pages pre-rendered at
// build time are still served from cache, so the test uses a handle that was
// not pre-rendered: rendering it on demand calls Shopify and fails.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { launchBrowser, type Browser } from "./helpers/browser";
import { startNextServer, type NextServer } from "./helpers/next-server";

let server: NextServer;
let browser: Browser;

before(async () => {
  server = await startNextServer({
    SHOPIFY_STOREFRONT_PRIVATE_TOKEN: "e2e-deliberately-invalid-token",
  });
  browser = await launchBrowser();
});

after(async () => {
  await browser?.close();
  await server?.stop();
});

test("a Shopify failure shows the product error page", async () => {
  const status = await browser.goto(`${server.baseUrl}/shop/not-prerendered-product`);
  assert.equal(status, 500);

  await browser.waitFor(
    `document.querySelector("main h1")?.textContent === "We couldn’t load this product"`,
    "the product error message",
  );
  const page = await browser.evaluate<{ alert: boolean; retry: boolean; backLink: boolean }>(`({
    alert: !!document.querySelector('main [role="alert"]'),
    retry: [...document.querySelectorAll("main button")].some((b) => b.textContent === "Try again"),
    backLink: !!document.querySelector('main a[href="/shop"]'),
  })`);
  assert.deepEqual(page, { alert: true, retry: true, backLink: true });
});
