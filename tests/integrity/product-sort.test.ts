// Unit tests for /shop sorting: parsing ?sort= and the sort orders themselves,
// including deterministic tie-breaking for identical prices.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseSort, sortProducts, SORT_OPTIONS } from "@/lib/product-sort";
import type { Product } from "@/types/product";

function product(slug: string, name: string, euros: number): Product {
  return {
    id: slug,
    slug,
    name,
    description: "",
    price: { amount: euros * 100, currency: "EUR" },
    category: { slug: "home", name: "Home" },
    image: { src: `/images/products/${slug}.png`, alt: name },
  };
}

// Shopify order ("featured"). Three products share €24, as in the real catalog,
// and are deliberately listed out of alphabetical order.
const catalog: readonly Product[] = Object.freeze([
  product("stoneware-pencil-cup", "Stoneware Pencil Cup", 24),
  product("oak-bookends", "Oak Bookends", 45),
  product("linen-tea-towels", "Linen Tea Towels", 24),
  product("aluminium-task-light", "Aluminium Task Light", 149),
  product("ceramic-incense-holder", "Ceramic Incense Holder", 24),
  product("linen-notebook", "Linen Notebook", 18),
]);

const slugs = (products: Product[]) => products.map((p) => p.slug);

describe("parseSort", () => {
  test("accepts every listed option", () => {
    for (const { value } of SORT_OPTIONS) assert.equal(parseSort(value), value);
  });

  test("falls back to featured for missing, empty or unknown values", () => {
    for (const value of [undefined, "", "price", "PRICE-ASC", "name-asc ", "<script>"]) {
      assert.equal(parseSort(value), "featured", JSON.stringify(value));
    }
  });

  test("uses the first value when the parameter is repeated", () => {
    assert.equal(parseSort(["price-desc", "name-asc"]), "price-desc");
    assert.equal(parseSort(["bogus", "name-asc"]), "featured");
    assert.equal(parseSort([]), "featured");
  });
});

describe("sortProducts", () => {
  test("featured keeps the Shopify order", () => {
    assert.deepEqual(slugs(sortProducts(catalog, "featured")), slugs([...catalog]));
  });

  test("price low to high, identical prices by name A–Z", () => {
    assert.deepEqual(slugs(sortProducts(catalog, "price-asc")), [
      "linen-notebook", // €18
      "ceramic-incense-holder", // €24
      "linen-tea-towels", // €24
      "stoneware-pencil-cup", // €24
      "oak-bookends", // €45
      "aluminium-task-light", // €149
    ]);
  });

  test("price high to low, identical prices still by name A–Z", () => {
    assert.deepEqual(slugs(sortProducts(catalog, "price-desc")), [
      "aluminium-task-light",
      "oak-bookends",
      "ceramic-incense-holder",
      "linen-tea-towels",
      "stoneware-pencil-cup",
      "linen-notebook",
    ]);
  });

  test("name A–Z and Z–A", () => {
    const aToZ = [
      "aluminium-task-light",
      "ceramic-incense-holder",
      "linen-notebook",
      "linen-tea-towels",
      "oak-bookends",
      "stoneware-pencil-cup",
    ];
    assert.deepEqual(slugs(sortProducts(catalog, "name-asc")), aToZ);
    assert.deepEqual(slugs(sortProducts(catalog, "name-desc")), aToZ.toReversed());
  });

  test("names compare case- and accent-insensitively, then by slug", () => {
    const items = [
      product("b", "oak tray", 10),
      product("c", "Éclair Dish", 10),
      product("a", "Oak Tray", 10),
    ];
    assert.deepEqual(slugs(sortProducts(items, "name-asc")), ["c", "a", "b"]);
  });

  test("the order does not depend on the input order", () => {
    for (const { value } of SORT_OPTIONS.filter((o) => o.value !== "featured")) {
      assert.deepEqual(
        slugs(sortProducts(catalog.toReversed(), value)),
        slugs(sortProducts(catalog, value)),
        value,
      );
    }
  });

  test("returns a new array and leaves the input untouched", () => {
    for (const { value } of SORT_OPTIONS) {
      const sorted = sortProducts(catalog, value);
      assert.notEqual(sorted, catalog);
    }
    // `catalog` is frozen, so an in-place sort would already have thrown.
    assert.equal(catalog[0].slug, "stoneware-pencil-cup");
  });

  test("handles an empty catalog", () => {
    assert.deepEqual(sortProducts([], "price-asc"), []);
  });
});
