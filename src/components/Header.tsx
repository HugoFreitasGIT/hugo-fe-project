import Link from "next/link";

import CartLink from "@/components/cart/CartLink";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/#categories" },
  { label: "About", href: "#about" },
];

type HeaderProps = {
  currentPath: string;
};

export default function Header({ currentPath }: HeaderProps) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-y-4 px-5 py-4 sm:px-8 md:grid-cols-[1fr_auto_1fr] md:py-6">
        <Link
          href="/"
          className="justify-self-start text-xl font-semibold tracking-[0.3em]"
        >
          NOMA
        </Link>

        <nav
          aria-label="Primary"
          className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1"
        >
          <ul className="flex gap-6 text-sm md:gap-10">
            {navLinks.map(({ label, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  aria-current={href === currentPath ? "page" : undefined}
                  className="text-ink-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <CartLink isCurrent={currentPath === "/cart"} />
      </div>
    </header>
  );
}
