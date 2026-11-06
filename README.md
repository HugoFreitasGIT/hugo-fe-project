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
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Storefront API: product listing and pages     | Yes      |
| `SHOPIFY_API_VERSION`              | Both APIs (defaults to `2026-10`)             | No       |
| `SHOPIFY_CLIENT_ID`                | Admin API: seed script and status route only  | For seeding |
| `SHOPIFY_CLIENT_SECRET`            | Admin API: seed script and status route only  | For seeding |

`/shop` and the product pages are generated at build time, so the Storefront variables must also be available when running `npm run build`.

## Testing

Tests use Node's built-in test runner (`node:test`) and need no extra dependencies.

| Command                  | What it does                                                     | Needs Shopify |
| ------------------------ | ---------------------------------------------------------------- | ------------- |
| `npm run test:integrity` | Shopify → product conversion and data-integrity rules, with mocked Shopify responses | No |
| `npm run test:e2e`       | End-to-end checks of the production build against the live store | Yes |
| `npm run test:pr3`       | Lint, type check, production build, then both suites above       | Yes |

### Integrity tests (`tests/integrity/`)

Cover price conversion to cents, EUR-only validation, category mapping, image and alt-text handling, unknown handles, and the data-integrity rule that a catalog where every product is invalid is an error rather than an empty shop. Shopify is mocked, so these run anywhere without credentials.

### End-to-end tests (`tests/e2e/`)

These start `next start` on a free port and need:

- a production build: run `npm run build` first (`npm run test:pr3` does this for you);
- a `.env.local` with working Storefront credentials, since product pages and the 404 check query the real store;
- Google Chrome or Chromium for the browser tests. Set `CHROME_PATH` if it is not installed in a standard location.

They expect the store to contain the 9 products from `src/data/products.ts` (see `scripts/shopify-seed-products.ts`).

| File                  | Coverage                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `pages.test.ts`       | `/shop` links, every product page (title, price, category, description, image from the Shopify CDN), 404 status, no token in the HTML |
| `navigation.test.ts`  | Real clicks in Chrome: product card → product page → back to `/shop`, browser back, the 404 page as users see it, mobile layout |
| `error-states.test.ts`| The product error page when Shopify rejects requests (uses a deliberately invalid token for its own server only) |

Each browser test uses a fresh temporary Chrome profile, which is deleted afterwards along with the test servers. Every command exits with a non-zero status if any check fails.

## Status

This project is currently under active development.
