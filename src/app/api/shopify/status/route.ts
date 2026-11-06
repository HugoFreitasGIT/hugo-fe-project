import { ShopifyError } from "@/lib/shopify/errors";
import { getShopOverview } from "@/lib/shopify/shop-overview";
import { getStorefrontProducts } from "@/lib/shopify/storefront-products";

// Development-only connection check for the Shopify Admin and Storefront APIs.
// Responds with shop and product details; never with credentials.
// GET route handlers are dynamic by default, so this runs on every request.

function toErrorBody(api: string, error: unknown) {
  if (error instanceof ShopifyError) {
    console.error(`[shopify] ${api} ${error.kind} error: ${error.message}`);
    return { ok: false, error: { kind: error.kind, message: error.message } };
  }

  console.error(`[shopify] Unexpected ${api} error during connection check.`);
  return { ok: false, error: { kind: "unknown", message: "Unexpected error." } };
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [admin, storefront] = await Promise.all([
    getShopOverview(5).then(
      (overview) => ({ ok: true, ...overview }),
      (error: unknown) => toErrorBody("Admin API", error),
    ),
    getStorefrontProducts().then(
      (products) => ({
        ok: true,
        productCount: products.length,
        products: products.map(({ slug, name, price, category }) => ({
          handle: slug,
          title: name,
          price,
          category: category.name,
        })),
      }),
      (error: unknown) => toErrorBody("Storefront API", error),
    ),
  ]);

  const ok = admin.ok && storefront.ok;
  return Response.json({ ok, admin, storefront }, { status: ok ? 200 : 502 });
}
