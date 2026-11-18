import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  // Development only: lets these hostnames use dev-server resources such as the
  // HMR WebSocket (`/_next/hmr`): the permanent ngrok domain and `noma-dev.com`,
  // a local hostname mapped to 127.0.0.1 in /etc/hosts.
  allowedDevOrigins: ["antitrust-grit-prowling.ngrok-free.dev", "noma-dev.com"],
  images: {
    // Product images served by the Shopify CDN. `search` is left unset because
    // Shopify image URLs carry a `?v=` version query string.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" },
    ],
  },
};

export default nextConfig;
