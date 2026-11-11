import { loadCart } from "@/lib/cart";
import { runCartOperation } from "@/lib/cart-session";

// Returns the current buyer's cart, identified by the httpOnly cart cookie.
// Reads the cookie, so the handler is dynamic and runs on every request.
// Responds with 502 and a generic message when Shopify cannot be reached.
export async function GET() {
  const result = await runCartOperation(
    "load",
    "We couldn’t load your cart. Please try again.",
    ({ cartId, storefrontOptions }) => loadCart(cartId, storefrontOptions),
  );

  return Response.json(result, {
    status: result.ok ? 200 : 502,
    headers: { "Cache-Control": "private, no-store" },
  });
}
