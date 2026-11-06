// HTTP-level checks of the production build against the live Shopify store.
// The local catalog (src/data/products.ts) is the expected source of truth,
// since it is what the seed script created in Shopify.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { products } from "@/data/products";

import { attributeOf, decodeEntities, formatEuro, textOf } from "./helpers/html";
import { startNextServer, type NextServer } from "./helpers/next-server";

let server: NextServer;
const fetchedHtml: string[] = [];

async function getPage(path: string) {
  const response = await fetch(`${server.baseUrl}${path}`);
  const html = await response.text();
  fetchedHtml.push(html);
  return { status: response.status, html };
}

before(async () => {
  server = await startNextServer();
});

after(async () => {
  await server?.stop();
});

describe("/shop", () => {
  test("links to every catalog product", async () => {
    const { status, html } = await getPage("/shop");
    assert.equal(status, 200);

    const links = [...html.matchAll(/<article[\s\S]*?href="(\/shop\/[^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(
      links.toSorted(),
      products.map((product) => `/shop/${product.slug}`).toSorted(),
    );
  });
});

describe("/shop/[handle]", () => {
  for (const product of products) {
    test(product.slug, async () => {
      const { status, html } = await getPage(`/shop/${product.slug}`);
      assert.equal(status, 200);

      assert.equal(textOf(html, "h1"), product.name);
      assert.equal(textOf(html, "title"), `${product.name} · NOMA`);
      assert.ok(html.includes(`>${formatEuro(product.price.amount)}<`), "price");
      assert.ok(html.includes(`>${product.category.name}</p>`), "category");
      assert.ok(decodeEntities(html).includes(product.description), "description");
      assert.match(html, /href="\/shop"[^>]*>(?:<span[^>]*>←<\/span>)?Back to all products/);

      // Main image: Shopify CDN source, catalog alt text, served by next/image.
      const mainImage = /<img[^>]*fetchPriority="high"[^>]*>/i;
      assert.equal(attributeOf(html, mainImage, "alt"), product.image.alt);
      const src = attributeOf(html, mainImage, "src") ?? "";
      const imageUrl = new URL(src, server.baseUrl);
      assert.match(imageUrl.searchParams.get("url") ?? "", /^https:\/\/cdn\.shopify\.com\//);

      const image = await fetch(imageUrl);
      assert.equal(image.status, 200);
      assert.match(image.headers.get("content-type") ?? "", /^image\//);
    });
  }

  test("unknown handle returns 404 with noindex", async () => {
    // Next.js serves notFound() pages as an empty document and renders the
    // not-found UI in the browser; navigation.test.ts checks what users see.
    const { status, html } = await getPage("/shop/does-not-exist");
    assert.equal(status, 404);
    assert.match(html, /<meta name="robots" content="noindex"\/>/);
  });
});

test("no page exposes the Storefront API token", (t) => {
  const token = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.trim();
  if (!token) {
    t.skip("SHOPIFY_STOREFRONT_PRIVATE_TOKEN is not set in this process");
    return;
  }
  assert.ok(fetchedHtml.length > 0);
  assert.ok(fetchedHtml.every((html) => !html.includes(token)));
});
