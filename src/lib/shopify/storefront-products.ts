import "server-only";

import { ShopifyError } from "@/lib/shopify/errors";
import { shopifyStorefrontFetch } from "@/lib/shopify/storefront-client";
import type { Product, ProductDetail, ProductImage } from "@/types/product";

// The catalog is read in pages of Shopify's maximum size, following cursors.
// /shop filters and sorts the whole catalog in memory, so it is capped: past
// MAX_PRODUCT_PAGES pages (1,000 products) the request fails instead of
// returning an incomplete catalog. At that size, filtering, sorting and
// pagination must move into the Shopify query instead.
export const PRODUCTS_PAGE_SIZE = 250;
export const MAX_PRODUCT_PAGES = 4;
const PRODUCT_IMAGES_LIMIT = 10;
// Every product in the catalog has exactly one variant (see the seed script),
// so the first variant is the one added to the cart. Products with several
// variants (sizes, colours) would need a variant picker; not supported yet.
const PRODUCT_VARIANTS_LIMIT = 1;

const PRODUCT_FIELDS = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    productType
    featuredImage {
      url
      altText
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`;

const PRODUCTS_QUERY = /* GraphQL */ `
  ${PRODUCT_FIELDS}
  query StorefrontProducts($first: Int!, $after: String) {
    # ID order is Shopify's default; explicit so cursors stay stable.
    products(first: $first, after: $after, sortKey: ID) {
      nodes {
        ...ProductFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  ${PRODUCT_FIELDS}
  query StorefrontProductByHandle(
    $handle: String!
    $imagesFirst: Int!
    $variantsFirst: Int!
  ) {
    product(handle: $handle) {
      ...ProductFields
      images(first: $imagesFirst) {
        nodes {
          url
          altText
        }
      }
      variants(first: $variantsFirst) {
        nodes {
          id
          availableForSale
        }
      }
    }
  }
`;

type StorefrontImage = { url: string; altText: string | null };

type StorefrontProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  featuredImage: StorefrontImage | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
};

type StorefrontProductsData = {
  products: {
    nodes: StorefrontProduct[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

type StorefrontVariant = { id: string; availableForSale: boolean };

type StorefrontProductByHandleData = {
  product:
    | (StorefrontProduct & {
        images: { nodes: StorefrontImage[] };
        variants: { nodes: StorefrontVariant[] };
      })
    | null;
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Converts a decimal string such as "64.0" to integer cents (6400).
export function toCents(amount: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return null;
  return Math.round(Number(amount) * 100);
}

const toImage = (image: StorefrontImage, fallbackAlt: string): ProductImage => ({
  src: image.url,
  alt: image.altText?.trim() || fallbackAlt,
});

// Maps a Shopify product to the storefront's Product type. Returns the reason
// instead when the product cannot be displayed correctly.
function toProduct(node: StorefrontProduct): Product | string {
  const { amount, currencyCode } = node.priceRange.minVariantPrice;

  if (currencyCode !== "EUR") return `unsupported currency ${currencyCode}`;

  const cents = toCents(amount);
  if (cents === null) return "invalid price";

  const categorySlug = toSlug(node.productType);
  if (!categorySlug) return "missing product type";

  if (!node.featuredImage?.url) return "missing featured image";

  return {
    id: node.id,
    slug: node.handle,
    name: node.title,
    description: node.description,
    price: { amount: cents, currency: currencyCode },
    category: { slug: categorySlug, name: node.productType.trim() },
    image: toImage(node.featuredImage, node.title),
  };
}

// Fetches every product, page by page. Any failed page fails the whole call,
// so callers never receive a partial catalog.
async function fetchAllProductNodes(): Promise<StorefrontProduct[]> {
  const nodes: StorefrontProduct[] = [];
  const usedCursors = new Set<string>();
  const seenIds = new Set<string>();
  let after: string | null = null;

  for (let page = 1; page <= MAX_PRODUCT_PAGES; page++) {
    const data: StorefrontProductsData = await shopifyStorefrontFetch<StorefrontProductsData>(
      PRODUCTS_QUERY,
      { first: PRODUCTS_PAGE_SIZE, after },
    );
    const { nodes: pageNodes, pageInfo } = data.products;
    for (const node of pageNodes) {
      // Each page is cached separately, so pages may come from different
      // moments. Shopify cursors are opaque and give no guarantee that such
      // pages fit together. A product on two pages is the visible sign that
      // they do not (the same shift can also skip products, undetectably),
      // so fail instead of returning an inconsistent catalog.
      if (seenIds.has(node.id)) {
        throw new ShopifyError(
          "data",
          `Product "${node.handle}" appeared again on page ${page}; the catalog pages are inconsistent.`,
        );
      }
      seenIds.add(node.id);
      nodes.push(node);
    }

    if (!pageInfo.hasNextPage) return nodes;

    const cursor = pageInfo.endCursor;
    if (!cursor) {
      throw new ShopifyError(
        "data",
        `Shopify reported more products after page ${page} but returned no cursor.`,
      );
    }
    if (usedCursors.has(cursor)) {
      throw new ShopifyError(
        "data",
        `Shopify returned a repeated cursor after page ${page}; stopping to avoid an endless loop.`,
      );
    }
    usedCursors.add(cursor);
    after = cursor;
  }

  throw new ShopifyError(
    "data",
    `The catalog has more than ${MAX_PRODUCT_PAGES * PRODUCTS_PAGE_SIZE} products, the most /shop can ` +
      "filter and sort in memory. Move filtering, sorting and pagination to the Shopify query.",
  );
}

export async function getStorefrontProducts(): Promise<Product[]> {
  const nodes = await fetchAllProductNodes();
  const products: Product[] = [];
  for (const node of nodes) {
    const result = toProduct(node);
    if (typeof result === "string") {
      // Skip rather than show a product with a wrong price or no image.
      console.warn(`[shopify] Skipping product "${node.handle}": ${result}.`);
    } else {
      products.push(result);
    }
  }

  // An empty catalog is only legitimate when Shopify itself returned nothing.
  // If every product was rejected, the data is broken: surface it as an error.
  if (nodes.length > 0 && products.length === 0) {
    throw new ShopifyError(
      "data",
      `Shopify returned ${nodes.length} products, but none passed validation.`,
    );
  }

  return products;
}

/** Returns the product for a handle, or null if Shopify has no such product. */
export async function getStorefrontProduct(
  handle: string,
): Promise<ProductDetail | null> {
  const data = await shopifyStorefrontFetch<StorefrontProductByHandleData>(
    PRODUCT_BY_HANDLE_QUERY,
    {
      handle,
      imagesFirst: PRODUCT_IMAGES_LIMIT,
      variantsFirst: PRODUCT_VARIANTS_LIMIT,
    },
  );

  const node = data.product;
  if (!node) return null;

  const result = toProduct(node);
  if (typeof result === "string") {
    throw new ShopifyError(
      "data",
      `Product "${node.handle}" failed validation: ${result}.`,
    );
  }

  const variant = node.variants.nodes[0];
  if (!variant?.id) {
    throw new ShopifyError(
      "data",
      `Product "${node.handle}" failed validation: missing variant.`,
    );
  }

  // Start with the featured image, followed by any others in Shopify's order.
  const otherImages = node.images.nodes
    .filter((image) => image.url && image.url !== result.image.src)
    .map((image) => toImage(image, result.name));

  return {
    ...result,
    images: [result.image, ...otherImages],
    variantId: variant.id,
    availableForSale: variant.availableForSale,
  };
}
