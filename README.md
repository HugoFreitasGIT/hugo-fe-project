# NOMA

A modern e-commerce storefront built from scratch with Next.js, React and TypeScript.

NOMA is a fictional lifestyle store focused on modern, functional and minimalist products for the home, kitchen and workspace.

The project is being built as a personal frontend project to explore modern web development practices and build a complete frontend experience from the ground up.

## Goals

- Build a modern e-commerce frontend using Next.js and TypeScript.
- Create reusable and maintainable UI components.
- Use Tailwind CSS for styling and responsive layouts.
- Integrate with an external e-commerce platform.
- Implement simple A/B testing experiments.
- Apply basic unit and end-to-end testing.
- Explore different rendering and data-fetching patterns available in Next.js.
- Keep the codebase clean, documented and easy to maintain.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

Additional libraries and tools will be introduced as the project evolves and specific requirements arise.

## Planned Features

- Responsive storefront
- Product listing
- Product categories
- Product detail pages
- Shopping cart
- Basic checkout flow
- External e-commerce integration
- Reusable UI components
- A/B testing experiments
- Basic analytics and conversion tracking
- Unit and end-to-end testing

## Project Structure

The application will use Next.js App Router and a modular structure that separates routes, UI components and application logic.

The structure will evolve as the project grows.

## Getting Started

Install the project dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

## Environment Variables

Create a `.env.local` file in the project root (it is git-ignored). All variables are server-side only; never prefix them with `NEXT_PUBLIC_`.

| Variable                           | Used by                                       | Required |
| ---------------------------------- | --------------------------------------------- | -------- |
| `SHOPIFY_STORE_DOMAIN`             | Storefront and Admin API (`*.myshopify.com`)  | Yes      |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Storefront API: products and the cart         | Yes      |
| `SHOPIFY_API_VERSION`              | Both APIs (defaults to `2026-10`)             | No       |
| `SHOPIFY_CLIENT_ID`                | Admin API: seed script and status route only  | For seeding |
| `SHOPIFY_CLIENT_SECRET`            | Admin API: seed script and status route only  | For seeding |
| `TRUSTED_PROXY_COUNT`              | Cart: trusted proxies in front of the app      | No       |

The product pages are generated at build time, so the Storefront variables must also be available when running `npm run build`. `/shop` is rendered per request because it reads the `?sort=` parameter; the Shopify catalog request behind it is still cached for an hour in production.

The Admin app (client credentials) needs the `read_products`, `write_products`, `read_publications` and `write_publications` scopes. The publication scopes let the seed script publish products to the Headless sales channel, which the Storefront API token reads from.

`TRUSTED_PROXY_COUNT` is the number of proxies in front of the app that append to `X-Forwarded-For` (usually `1` on a hosting platform). Only when it is set is the buyer's IP read from that header, validated and sent to Shopify with cart requests (`Shopify-Storefront-Buyer-IP`). Leave it empty when the app is reached directly, since the header can then be forged.

## Product Catalog Size

`/shop` loads the whole catalog from the Storefront API and filters and sorts it on the server. The catalog is read in pages of 250 products, Shopify's maximum, following cursors in a stable ID order (`src/lib/shopify/storefront-products.ts`).

- **Limit:** at most 4 pages, so **1,000 products**. A larger catalog is not cut off silently: the request fails with a `ShopifyError`, `/shop` shows its error page and `/api/shopify/status` reports the error. Product pages still render on demand.
- **No partial results:** if any page fails (network, HTTP or GraphQL error), the whole catalog request fails.
- **Caching and consistency:** each page is a separate cached request, refreshed on its own hourly schedule, so a catalog of more than 250 products can combine pages fetched at different moments. Shopify cursors are opaque and Shopify does not guarantee that pages fetched at different times fit together. If the catalog changes between those moments, the result can briefly be out of date: a product published, unpublished or edited may show the old state, and a product could be missing, until the affected pages refresh (about an hour). A product appearing on two pages is detected and fails the request with a `ShopifyError` rather than being shown twice; a missing product cannot be detected. Up to 250 products, the catalog is a single request and always consistent. Making multi-page catalogs consistent would mean caching the assembled catalog as one unit (`"use cache"`, which needs Cache Components) or refreshing all pages together on catalog changes (cache tags with a Shopify webhook).
- **Cost:** up to 250 products is a single request, as before. Each further 250 adds one request, made one after another, only when the cache refreshes.
- **Growing past 1,000:** in-memory filtering and sorting stop being appropriate. Move them into the Storefront query (`product_type` filter, `sortKey`) and paginate `/shop` with cursors instead of loading every product. Raising `MAX_PRODUCT_PAGES` is only a short-term option.

## Shopping Cart

The cart uses the Shopify Storefront Cart API and Shopify's hosted checkout.

- **Server only:** cart queries and mutations (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`) run on the server, in Server Actions (`src/app/cart/actions.ts`) and the `GET /api/cart` Route Handler. The Storefront token never reaches the browser.
- **Cart ID:** stored in the httpOnly `noma_cart` cookie and never sent to client code. Expired or completed carts are detected and the cookie is cleared; adding a product then starts a new cart.
- **Client state:** `CartProvider` (in the root layout) loads the cart in the browser and shares it with the header count, the product page button and `/cart`, so pages stay statically rendered. It allows one cart mutation at a time.
- **Checkout:** the checkout link is only shown when Shopify's checkout URL is an HTTPS URL on `SHOPIFY_STORE_DOMAIN`. If the store later uses a custom checkout domain, this check needs to allow it.
- **Variants:** every product currently has a single variant, so the product page adds the first variant (`variants(first: 1)`). Products with several variants would need a variant picker.

## Testing

Tests use Node's built-in test runner (`node:test`) and need no extra dependencies.

| Command                  | What it does                                                     | Needs Shopify |
| ------------------------ | ---------------------------------------------------------------- | ------------- |
| `npm run test:integrity` | Shopify → product conversion and data-integrity rules, with mocked Shopify responses | No |
| `npm run test:e2e`       | End-to-end checks of the production build against the live store | Yes |
| `npm run test:pr3`       | Lint, type check, production build, then both suites above       | Yes |
| `npm run test:pr4`       | The same checks for the shopping cart PR                         | Yes |

### Integrity tests (`tests/integrity/`)

Cover catalog pagination (cursors across pages of 250, exactly 250/1,000 products, more than 1,000 failing explicitly, missing or repeated cursors, a product repeated across pages failing as inconsistent, HTTP and GraphQL errors on later pages, validation across pages, caching of every page), price conversion to cents, EUR-only validation, category mapping, image and alt-text handling, unknown handles, and the data-integrity rule that a catalog where every product is invalid is an error rather than an empty shop. Shopify is mocked, so these run anywhere without credentials.

`product-sort.test.ts` covers `/shop` sorting: parsing `?sort=` (unknown, empty and repeated values fall back to Featured) and every sort order, including identical prices always listed by name A–Z. `product-category.test.ts` covers category filtering: categories derived from the catalog, parsing `?category=` (unknown values show all products), each category's 10 products, and `/shop` URLs that keep both the category and the sort order.

`cart.test.ts` covers the cart: Shopify cart → `Cart` conversion, checkout URL validation, uncached cart requests and the buyer IP header, cart creation on the first add, recovery from expired carts, quantity updates and removal, input validation, and buyer IP extraction from `X-Forwarded-For`.

### End-to-end tests (`tests/e2e/`)

These start `next start` on a free port and need:

- a production build: run `npm run build` first (`npm run test:pr3` does this for you);
- a `.env.local` with working Storefront credentials, since product pages and the 404 check query the real store;
- Google Chrome or Chromium for the browser tests. Set `CHROME_PATH` if it is not installed in a standard location.

They expect the store to contain the 30 products from `src/data/products.ts` (see `scripts/shopify-seed-products.ts`). The cart tests create a temporary Shopify cart (no orders or product changes) and empty it again.

| File                  | Coverage                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `pages.test.ts`       | `/shop` links, the full catalog (30 products, 10 per category, each card's name, price and category), each `?sort=` order and the selected option, each `?category=` (exactly its 10 products, invalid values fall back to all), every category with every sort order, category links and the sort form keeping each other's parameter, the homepage category links, every product page (title, price, category, description, image from the Shopify CDN), 404 status, no token in the HTML |
| `navigation.test.ts`  | Real clicks in Chrome: product card → product page → back to `/shop`, browser back, sorting with the select (URL update, client-side, back button), homepage category card → filtered shop → sort → other category → All, then back/forward through each state, the 404 page as users see it, mobile layout |
| `cart.test.ts`        | Real clicks in Chrome: add to cart from a product page, header count, double clicks add once, persistence across reloads, `/cart` lines and subtotal, quantity changes, removal and empty state, checkout URL on the store domain, httpOnly cart cookie, mobile layout, no token in cart pages, responses or scripts |
| `error-states.test.ts`| The product error page, the add-to-cart error and the cart error page when Shopify rejects requests (uses a deliberately invalid token for its own server only) |

Each browser test uses a fresh temporary Chrome profile, which is deleted afterwards along with the test servers. Every command exits with a non-zero status if any check fails.

## Status

This project is currently under active development.
