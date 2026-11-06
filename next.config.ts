import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product images served by the Shopify CDN. `search` is left unset because
    // Shopify image URLs carry a `?v=` version query string.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" },
    ],
  },
};

export default nextConfig;
