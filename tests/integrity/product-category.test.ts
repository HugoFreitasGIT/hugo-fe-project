// Unit tests for /shop category filtering: deriving categories from the
// catalog, parsing ?category=, filtering, and URLs that keep both parameters.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { products as catalog } from "@/data/products";
import {
  filterByCategory,
  getCategories,
  parseCategory,
  shopHref,
} from "@/lib/product-category";
import { SORT_OPTIONS, sortProducts } from "@/lib/product-sort";

const categories = getCategories(catalog);
const kitchen = categories.find((c) => c.slug === "kitchen") ?? null;

describe("getCategories", () => {
  test("lists each catalog category once, sorted by name", () => {
    assert.deepEqual(categories, [
      { slug: "home", name: "Home" },
      { slug: "kitchen", name: "Kitchen" },
      { slug: "workspace", name: "Workspace" },
    ]);
  });

  test("returns no categories for an empty catalog", () => {
    assert.deepEqual(getCategories([]), []);
  });
});

describe("parseCategory", () => {
  test("accepts each catalog category slug", () => {
    for (const category of categories) {
      assert.deepEqual(parseCategory(category.slug, categories), category);
    }
  });

  test("falls back to all products for missing, empty or unknown values", () => {
    for (const value of [undefined, "", "garden", "Kitchen", "KITCHEN", " kitchen", "kitchen/"]) {
      assert.equal(parseCategory(value, categories), null, JSON.stringify(value));
    }
  });

  test("uses the first value when the parameter is repeated", () => {
    assert.equal(parseCategory(["workspace", "home"], categories)?.slug, "workspace");
    assert.equal(parseCategory(["garden", "home"], categories), null);
    assert.equal(parseCategory([], categories), null);
  });
});

describe("filterByCategory", () => {
  test("each category has exactly its 10 products and nothing else", () => {
    for (const category of categories) {
      const filtered = filterByCategory(catalog, category);
      assert.equal(filtered.length, 10, category.slug);
      assert.ok(filtered.every((p) => p.category.slug === category.slug), category.slug);
    }
  });

  test("null keeps the full catalog in its original order", () => {
    assert.deepEqual(filterByCategory(catalog, null), catalog);
    assert.notEqual(filterByCategory(catalog, null), catalog);
  });

  test("works with every sort option and keeps only the category", () => {
    for (const { value } of SORT_OPTIONS) {
      const sorted = sortProducts(filterByCategory(catalog, kitchen), value);
      assert.equal(sorted.length, 10, value);
      assert.ok(sorted.every((p) => p.category.slug === "kitchen"), value);
    }
  });
});

describe("shopHref", () => {
  test("leaves defaults out", () => {
    assert.equal(shopHref({ category: null, sort: "featured" }), "/shop");
  });

  test("keeps a category, a sort order, or both", () => {
    assert.equal(shopHref({ category: "kitchen", sort: "featured" }), "/shop?category=kitchen");
    assert.equal(shopHref({ category: null, sort: "price-asc" }), "/shop?sort=price-asc");
    assert.equal(
      shopHref({ category: "kitchen", sort: "price-asc" }),
      "/shop?category=kitchen&sort=price-asc",
    );
  });
});
