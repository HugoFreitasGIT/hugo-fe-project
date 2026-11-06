// Seeds the Shopify store with the local NOMA catalog (src/data/products.ts).
//
// Idempotent: products are looked up by handle first and never duplicated.
// Existing products are left untouched, except that a missing image is attached.
//
// Usage:
//   node --env-file=.env.local --import ./scripts/node-aliases.mjs \
//     scripts/shopify-seed-products.ts [--images-dir <dir>] [--dry-run]
//
// Images default to public/images/products/, which holds one PNG per product
// named `<handle>.png`. Use --images-dir to read them from elsewhere.
// --dry-run makes no changes; it also checks every product's PNG.

import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { products } from "@/data/products";
import { ShopifyError, shopifyAdminFetch } from "@/lib/shopify/admin-client";
import type { Product } from "@/types/product";

const VENDOR = "NOMA";
const DEFAULT_IMAGES_DIR = fileURLToPath(
  new URL("../public/images/products/", import.meta.url),
);
const MEDIA_POLL_ATTEMPTS = 20;
const MEDIA_POLL_INTERVAL_MS = 3000;

type UserError = { field?: string[] | null; message: string };

type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  status: string;
  variants: { nodes: { sku: string | null; price: string }[] };
  media: {
    nodes: { alt: string | null; status: string; mediaContentType: string }[];
  };
};

type Outcome = "created" | "existing" | "failed";

type Result = {
  handle: string;
  outcome: Outcome;
  imageAttached: boolean;
  error?: string;
};

const PRODUCT_FIELDS = /* GraphQL */ `
  fragment SeedProduct on Product {
    id
    handle
    title
    description
    productType
    vendor
    tags
    status
    variants(first: 5) {
      nodes {
        sku
        price
      }
    }
    media(first: 5) {
      nodes {
        alt
        status
        mediaContentType
      }
    }
  }
`;

const skuFor = (product: Product) => `NOMA-${product.slug.toUpperCase()}`;

const priceFor = (product: Product) => (product.price.amount / 100).toFixed(2);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

const describeError = (error: unknown) =>
  error instanceof ShopifyError || error instanceof Error
    ? error.message
    : "Unexpected error.";

function assertNoUserErrors(operation: string, errors: UserError[]) {
  if (errors.length > 0) {
    const detail = errors
      .map((e) => (e.field?.length ? `${e.field.join(".")}: ` : "") + e.message)
      .join("; ");
    throw new Error(`${operation} failed: ${detail}`);
  }
}

async function getShopCurrency(): Promise<string> {
  const data = await shopifyAdminFetch<{ shop: { currencyCode: string } }>(
    `query SeedShopCurrency { shop { currencyCode } }`,
  );
  return data.shop.currencyCode;
}

async function findProductByHandle(
  handle: string,
): Promise<ShopifyProduct | null> {
  const data = await shopifyAdminFetch<{
    productByIdentifier: ShopifyProduct | null;
  }>(
    `${PRODUCT_FIELDS}
    query SeedFindProduct($handle: String!) {
      productByIdentifier(identifier: { handle: $handle }) {
        ...SeedProduct
      }
    }`,
    { handle },
  );
  return data.productByIdentifier;
}

async function readPng(imagesDir: string, handle: string) {
  const path = join(imagesDir, `${handle}.png`);
  const bytes = await readFile(path).catch(() => {
    throw new Error(`Image not found: ${handle}.png`);
  });
  const pngSignature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`Not a valid PNG file: ${handle}.png`);
  }
  return { bytes, filename: `${handle}.png` };
}

// Uploads an image via Shopify's staged upload flow and returns the
// resource URL to reference when attaching media to a product.
async function stageImage(bytes: Buffer, filename: string): Promise<string> {
  const data = await shopifyAdminFetch<{
    stagedUploadsCreate: {
      stagedTargets: {
        url: string;
        resourceUrl: string;
        parameters: { name: string; value: string }[];
      }[];
      userErrors: UserError[];
    };
  }>(
    `mutation SeedStageImage($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          resource: "IMAGE",
          filename,
          mimeType: "image/png",
          httpMethod: "POST",
          fileSize: String(bytes.byteLength),
        },
      ],
    },
  );

  const { stagedTargets, userErrors } = data.stagedUploadsCreate;
  assertNoUserErrors("Staged upload", userErrors);
  const target = stagedTargets[0];
  if (!target) throw new Error("Staged upload returned no target.");

  const form = new FormData();
  for (const { name, value } of target.parameters) form.append(name, value);
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    filename,
  );

  let response: Response;
  try {
    response = await fetch(target.url, { method: "POST", body: form });
  } catch {
    throw new Error(`Image upload failed: could not reach the upload target.`);
  }
  if (!response.ok) {
    throw new Error(`Image upload failed (HTTP ${response.status}).`);
  }

  return target.resourceUrl;
}

async function createProduct(product: Product, imageSource: string) {
  const data = await shopifyAdminFetch<{
    productSet: { product: { id: string } | null; userErrors: UserError[] };
  }>(
    `mutation SeedCreateProduct($input: ProductSetInput!) {
      productSet(synchronous: true, input: $input) {
        product { id }
        userErrors { field message }
      }
    }`,
    {
      input: {
        handle: product.slug,
        title: product.name,
        descriptionHtml: `<p>${escapeHtml(product.description)}</p>`,
        vendor: VENDOR,
        productType: product.category.name,
        tags: [product.category.slug],
        status: "ACTIVE",
        productOptions: [{ name: "Title", values: [{ name: "Default Title" }] }],
        variants: [
          {
            optionValues: [{ optionName: "Title", name: "Default Title" }],
            price: priceFor(product),
            inventoryPolicy: "DENY",
            taxable: true,
            inventoryItem: {
              sku: skuFor(product),
              tracked: false,
              requiresShipping: true,
            },
          },
        ],
        files: [
          {
            originalSource: imageSource,
            contentType: "IMAGE",
            alt: product.image.alt,
            filename: `${product.slug}.png`,
          },
        ],
      },
    },
  );

  assertNoUserErrors("Product creation", data.productSet.userErrors);
  if (!data.productSet.product) throw new Error("Product creation returned no product.");
}

async function attachImage(productId: string, product: Product, imageSource: string) {
  const data = await shopifyAdminFetch<{
    productUpdate: { userErrors: UserError[] };
  }>(
    `mutation SeedAttachImage($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
      productUpdate(product: $product, media: $media) {
        userErrors { field message }
      }
    }`,
    {
      product: { id: productId },
      media: [
        {
          originalSource: imageSource,
          mediaContentType: "IMAGE",
          alt: product.image.alt,
        },
      ],
    },
  );
  assertNoUserErrors("Image attachment", data.productUpdate.userErrors);
}

async function seedProduct(
  product: Product,
  imagesDir: string,
  dryRun: boolean,
): Promise<Result> {
  const handle = product.slug;
  const existing = await findProductByHandle(handle);

  if (existing) {
    const hasImage = existing.media.nodes.length > 0;
    if (dryRun) {
      // Still confirm the local image is available, so a dry run proves the
      // seed is reproducible from the images directory.
      await readPng(imagesDir, handle);
      return { handle, outcome: "existing", imageAttached: hasImage };
    }
    if (hasImage) {
      return { handle, outcome: "existing", imageAttached: true };
    }
    // Recover from an earlier partial run: attach the missing image only.
    const { bytes, filename } = await readPng(imagesDir, handle);
    await attachImage(existing.id, product, await stageImage(bytes, filename));
    return { handle, outcome: "existing", imageAttached: true };
  }

  // Validate and upload the image before creating the product, so a bad image
  // never leaves a product behind without one.
  const { bytes, filename } = await readPng(imagesDir, handle);
  if (dryRun) return { handle, outcome: "created", imageAttached: false };

  await createProduct(product, await stageImage(bytes, filename));
  return { handle, outcome: "created", imageAttached: true };
}

// Compares a Shopify product against the catalog; returns a list of problems.
function verifyProduct(product: Product, remote: ShopifyProduct | null): string[] {
  if (!remote) return ["not found in Shopify"];

  const problems: string[] = [];
  const check = (label: string, actual: unknown, expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  };

  check("handle", remote.handle, product.slug);
  check("title", remote.title, product.name);
  check("description", remote.description.trim(), product.description);
  check("productType", remote.productType, product.category.name);
  check("tags", remote.tags, [product.category.slug]);
  check("status", remote.status, "ACTIVE");

  const variants = remote.variants.nodes;
  check("variant count", variants.length, 1);
  if (variants[0]) {
    check("price", Number(variants[0].price).toFixed(2), priceFor(product));
    check("sku", variants[0].sku, skuFor(product));
  }

  const images = remote.media.nodes.filter((m) => m.mediaContentType === "IMAGE");
  check("image count", images.length, 1);
  if (images[0]) {
    check("image status", images[0].status, "READY");
    check("image alt", images[0].alt, product.image.alt);
  }

  return problems;
}

async function waitForMedia(handle: string): Promise<ShopifyProduct | null> {
  for (let attempt = 1; attempt <= MEDIA_POLL_ATTEMPTS; attempt++) {
    const remote = await findProductByHandle(handle);
    const processing = remote?.media.nodes.some(
      (m) => m.status === "UPLOADED" || m.status === "PROCESSING",
    );
    if (!processing || attempt === MEDIA_POLL_ATTEMPTS) return remote;
    await sleep(MEDIA_POLL_INTERVAL_MS);
  }
  return null;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "images-dir": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  const imagesDir = resolve(values["images-dir"] ?? DEFAULT_IMAGES_DIR);
  if (!(await stat(imagesDir).catch(() => null))?.isDirectory()) {
    throw new Error("--images-dir does not point to a directory.");
  }
  const dryRun = values["dry-run"];

  // Prices are created in the shop's currency, so it must match the catalog.
  const shopCurrency = await getShopCurrency();
  const catalogCurrencies = [...new Set(products.map((p) => p.price.currency))];
  if (catalogCurrencies.some((currency) => currency !== shopCurrency)) {
    throw new Error(
      `Store currency is ${shopCurrency}, but the catalog is priced in ${catalogCurrencies.join(", ")}. ` +
        "Change the store currency in Shopify Admin before seeding.",
    );
  }

  console.log(`${dryRun ? "[dry run] " : ""}Seeding ${products.length} products (store currency ${shopCurrency})…`);

  const results: Result[] = [];
  for (const product of products) {
    try {
      const result = await seedProduct(product, imagesDir, dryRun);
      results.push(result);
      const verb = result.outcome === "created" ? (dryRun ? "would create" : "created") : "already present";
      console.log(`  ${product.slug}: ${verb}`);
    } catch (error) {
      results.push({ handle: product.slug, outcome: "failed", imageAttached: false, error: describeError(error) });
      console.log(`  ${product.slug}: FAILED — ${describeError(error)}`);
    }
  }

  const count = (outcome: Outcome) => results.filter((r) => r.outcome === outcome).length;
  console.log(
    `\n${dryRun ? "Would create" : "Created"}: ${count("created")}, already present: ${count("existing")}, failed: ${count("failed")}`,
  );

  if (dryRun) return;

  console.log("\nVerifying against Shopify…");
  let problemCount = 0;
  for (const product of products) {
    const problems = verifyProduct(product, await waitForMedia(product.slug));
    problemCount += problems.length;
    console.log(`  ${product.slug}: ${problems.length === 0 ? "OK" : problems.join("; ")}`);
  }

  if (count("failed") > 0 || problemCount > 0) {
    process.exitCode = 1;
    console.log("\nSome products need attention (see above).");
  } else {
    console.log(`\nAll ${products.length} products verified.`);
  }
}

main().catch((error: unknown) => {
  console.error(`Seed aborted: ${describeError(error)}`);
  process.exitCode = 1;
});
