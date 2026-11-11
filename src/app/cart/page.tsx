import type { Metadata } from "next";

import CartView from "@/components/cart/CartView";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the items in your NOMA cart before checkout.",
  robots: { index: false },
};

// Static shell: the cart itself is loaded in the browser by CartProvider, so
// this page never reads the cart cookie on the server.
export default function CartPage() {
  return (
    <>
      <Header currentPath="/cart" />
      <CartView />
      <Footer />
    </>
  );
}
