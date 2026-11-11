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

`/shop` and the product pages are generated at build time, so the Storefront variables must also be available when running `npm run build`.

`TRUSTED_PROXY_COUNT` is the number of proxies in front of the app that append to `X-Forwarded-For` (usually `1` on a hosting platform). Only when it is set is the buyer's IP read from that header, validated and sent to Shopify with cart requests (`Shopify-Storefront-Buyer-IP`). Leave it empty when the app is reached directly, since the header can then be forged.

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

Cover price conversion to cents, EUR-only validation, category mapping, image and alt-text handling, unknown handles, and the data-integrity rule that a catalog where every product is invalid is an error rather than an empty shop. Shopify is mocked, so these run anywhere without credentials.

`cart.test.ts` covers the cart: Shopify cart → `Cart` conversion, checkout URL validation, uncached cart requests and the buyer IP header, cart creation on the first add, recovery from expired carts, quantity updates and removal, input validation, and buyer IP extraction from `X-Forwarded-For`.

### End-to-end tests (`tests/e2e/`)

These start `next start` on a free port and need:

- a production build: run `npm run build` first (`npm run test:pr3` does this for you);
- a `.env.local` with working Storefront credentials, since product pages and the 404 check query the real store;
- Google Chrome or Chromium for the browser tests. Set `CHROME_PATH` if it is not installed in a standard location.

They expect the store to contain the 9 products from `src/data/products.ts` (see `scripts/shopify-seed-products.ts`). The cart tests create a temporary Shopify cart (no orders or product changes) and empty it again.

| File                  | Coverage                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `pages.test.ts`       | `/shop` links, every product page (title, price, category, description, image from the Shopify CDN), 404 status, no token in the HTML |
| `navigation.test.ts`  | Real clicks in Chrome: product card → product page → back to `/shop`, browser back, the 404 page as users see it, mobile layout |
| `cart.test.ts`        | Real clicks in Chrome: add to cart from a product page, header count, double clicks add once, persistence across reloads, `/cart` lines and subtotal, quantity changes, removal and empty state, checkout URL on the store domain, httpOnly cart cookie, mobile layout, no token in cart pages, responses or scripts |
| `error-states.test.ts`| The product error page, the add-to-cart error and the cart error page when Shopify rejects requests (uses a deliberately invalid token for its own server only) |

Each browser test uses a fresh temporary Chrome profile, which is deleted afterwards along with the test servers. Every command exits with a non-zero status if any check fails.

## Status

This project is currently under active development.
