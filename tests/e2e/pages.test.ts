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

  test("shows the full catalog: 30 products, 10 per category, as in the catalog", async () => {
    const cards = cardsOf((await getPage("/shop")).html);
    const countBy = (items: { category: string }[]) =>
      Object.fromEntries(
        Object.entries(Object.groupBy(items, (item) => item.category))
          .map(([category, group]) => [category, group?.length ?? 0])
          .toSorted(([a], [b]) => String(a).localeCompare(String(b))),
      );

    // The PR5 catalog: guards against products silently going missing.
    assert.equal(products.length, 30);
    assert.deepEqual(
      countBy(products.map((p) => ({ category: p.category.name }))),
      { Home: 10, Kitchen: 10, Workspace: 10 },
    );

    // Every card matches its catalog entry: name, price and category.
    assert.equal(cards.length, products.length);
    assert.deepEqual(countBy(cards), { Home: 10, Kitchen: 10, Workspace: 10 });
    for (const card of cards) {
      const product = products.find((p) => p.slug === card.slug);
      assert.ok(product, `unexpected product ${card.slug}`);
      assert.deepEqual(
        { name: card.name, cents: card.cents, category: card.category },
        { name: product.name, cents: product.price.amount, category: product.category.name },
        card.slug,
      );
    }
  });
});

// Product cards in page order: slug, name, price in cents and category.
function cardsOf(html: string) {
  return [
    ...html.matchAll(
      /<article[\s\S]*?href="\/shop\/([^"]+)"[^>]*>([^<]*)<\/a><\/h2><p[^>]*>([^<]*)<\/p><\/div><p[^>]*>([^<]*)<\/p><\/article>/g,
    ),
  ].map(([, slug, name, price, category]) => ({
    slug,
    name: decodeEntities(name),
    cents: Math.round(Number(decodeEntities(price).replace(/[^\d.]/g, "")) * 100),
    category: decodeEntities(category),
  }));
}

const collator = new Intl.Collator("en", { sensitivity: "base" });

// Expected order of cards for each non-default ?sort= value; identical prices
// are listed by name A–Z.
const orders = {
  "price-asc": (a, b) => a.cents - b.cents || collator.compare(a.name, b.name),
  "price-desc": (a, b) => b.cents - a.cents || collator.compare(a.name, b.name),
  "name-asc": (a, b) => collator.compare(a.name, b.name),
  "name-desc": (a, b) => collator.compare(b.name, a.name),
} satisfies Record<string, (a: { name: string; cents: number }, b: { name: string; cents: number }) => number>;

describe("/shop sorting", () => {
  test("featured is the default, and unknown values fall back to it", async () => {
    const names = async (path: string) => cardsOf((await getPage(path)).html).map((c) => c.name);
    const featured = await names("/shop");
    assert.ok(featured.length > 1, "expected several products");
    assert.deepEqual(await names("/shop?sort=featured"), featured);
    assert.deepEqual(await names("/shop?sort=bogus"), featured);
  });

  for (const [sort, compare] of Object.entries(orders)) {
    test(`?sort=${sort} orders the products and selects the option`, async () => {
      const { status, html } = await getPage(`/shop?sort=${sort}`);
      assert.equal(status, 200);
      const cards = cardsOf(html);
      assert.ok(cards.length > 1, "expected several products");
      assert.deepEqual(cards, cards.toSorted(compare));
      assert.match(html, new RegExp(`<option value="${sort}" selected=""`));
    });
  }
});

// Links in the category nav: text, decoded href and whether it is current.
function categoryLinksOf(html: string) {
  const nav = html.match(/<nav aria-label="Product categories">[\s\S]*?<\/nav>/)?.[0] ?? "";
  return [...nav.matchAll(/<a([^>]*)>([^<]*)<\/a>/g)].map(([, attributes, text]) => ({
    text: decodeEntities(text),
    href: decodeEntities(attributes.match(/href="([^"]*)"/)?.[1] ?? ""),
    current: attributes.includes('aria-current="page"'),
  }));
}

const categories = [
  { slug: "home", name: "Home" },
  { slug: "kitchen", name: "Kitchen" },
  { slug: "workspace", name: "Workspace" },
];

describe("/shop categories", () => {
  for (const { slug, name } of categories) {
    test(`?category=${slug} shows exactly its 10 products`, async () => {
      const { status, html } = await getPage(`/shop?category=${slug}`);
      assert.equal(status, 200);

      const cards = cardsOf(html);
      assert.equal(cards.length, 10);
      assert.deepEqual(
        cards.filter((card) => card.category !== name),
        [],
        "products from other categories",
      );
      assert.deepEqual(
        cards.map((card) => card.slug).toSorted(),
        products.filter((p) => p.category.slug === slug).map((p) => p.slug).toSorted(),
      );

      assert.equal(textOf(html, "h1"), name);
      assert.equal(textOf(html, "title"), `${name} · NOMA`);
      assert.equal(textOf(html, 'p role="status"'), "10 products");
      assert.deepEqual(
        categoryLinksOf(html).filter((link) => link.current).map((link) => link.text),
        [name],
      );
    });
  }

  for (const value of ["garden", "KITCHEN", "", "kitchen%20"]) {
    test(`?category=${value} falls back to the full catalog`, async () => {
      const { status, html } = await getPage(`/shop?category=${value}`);
      assert.equal(status, 200);
      assert.equal(cardsOf(html).length, products.length);
      assert.equal(textOf(html, "h1"), "Shop all products");
      assert.deepEqual(
        categoryLinksOf(html).filter((link) => link.current).map((link) => link.text),
        ["All"],
      );
    });
  }

  test("featured order within a category follows the full catalog's order", async () => {
    const all = cardsOf((await getPage("/shop")).html);
    for (const { slug, name } of categories) {
      const filtered = cardsOf((await getPage(`/shop?category=${slug}`)).html);
      assert.deepEqual(filtered, all.filter((card) => card.category === name), slug);
    }
  });

  for (const { slug, name } of categories) {
    for (const [sort, compare] of Object.entries(orders)) {
      test(`?category=${slug}&sort=${sort} filters and sorts`, async () => {
        const { status, html } = await getPage(`/shop?category=${slug}&sort=${sort}`);
        assert.equal(status, 200);
        const cards = cardsOf(html);
        assert.equal(cards.length, 10);
        assert.ok(cards.every((card) => card.category === name), "only this category");
        assert.deepEqual(cards, cards.toSorted(compare));
        assert.match(html, new RegExp(`<option value="${sort}" selected=""`));
      });
    }
  }

  test("category links keep the sort order, and the sort form keeps the category", async () => {
    const { html } = await getPage("/shop?category=kitchen&sort=price-desc");
    assert.deepEqual(categoryLinksOf(html), [
      { text: "All", href: "/shop?sort=price-desc", current: false },
      { text: "Home", href: "/shop?category=home&sort=price-desc", current: false },
      { text: "Kitchen", href: "/shop?category=kitchen&sort=price-desc", current: true },
      { text: "Workspace", href: "/shop?category=workspace&sort=price-desc", current: false },
    ]);
    // Without JavaScript, submitting the sort form must not drop the category.
    assert.match(html, /<input type="hidden" name="category" value="kitchen"\/>/);
  });

  test("without a sort order, category links carry only the category", async () => {
    const { html } = await getPage("/shop");
    assert.deepEqual(
      categoryLinksOf(html).map((link) => link.href),
      ["/shop", "/shop?category=home", "/shop?category=kitchen", "/shop?category=workspace"],
    );
    assert.doesNotMatch(html, /<input type="hidden" name="category"/);
  });
});

describe("homepage categories", () => {
  test("each category card links to its filtered shop page", async () => {
    const { status, html } = await getPage("/");
    assert.equal(status, 200);
    const section = html.match(/<section id="categories"[\s\S]*?<\/section>/)?.[0] ?? "";
    const links = [...section.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(
      ([, href, content]) => ({ href: decodeEntities(href), text: content.replace(/<[^>]+>|→/g, "").trim() }),
    );
    assert.deepEqual(links, [
      { href: "/shop?category=home", text: "Explore Home" },
      { href: "/shop?category=kitchen", text: "Explore Kitchen" },
      { href: "/shop?category=workspace", text: "Explore Workspace" },
    ]);
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
