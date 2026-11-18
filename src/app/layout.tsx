import type { Metadata } from "next";
import { Geist } from "next/font/google";

import CartProvider from "@/components/cart/CartProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NOMA — Objects for modern everyday living",
    template: "%s · NOMA",
  },
  description:
    "NOMA is a lifestyle store for functional, minimalist products for the home, kitchen and workspace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {/*
          Convert Experiences tracking snippet. Convert requires it early in
          <head> and loaded synchronously so variations apply before first
          paint (no flicker). `next/script` is not used: in the App Router its
          `beforeInteractive` strategy loads the file through the Next.js
          runtime rather than as a render-blocking tag. The root layout does
          not re-render on client-side navigation, so this runs once per
          document load; Convert's script handles SPA route changes itself.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- synchronous load is required by Convert to avoid flicker */}
        <script
          type="text/javascript"
          src="https://cdn-4.convertexperiments.com/v1/js/100110504-100111020.js?environment=production"
        />
      </head>
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-canvas"
        >
          Skip to content
        </a>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
