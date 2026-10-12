import Link from "next/link";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "#categories" },
  { label: "Categories", href: "#categories" },
  { label: "About", href: "#about" },
];

export default function Header() {
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
                  aria-current={href === "/" ? "page" : undefined}
                  className="text-ink-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="#cart"
          aria-label="Cart, 0 items"
          className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end text-sm md:col-start-3"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="size-5"
          >
            <path d="M5 8h14l-1 12H6L5 8Z" strokeLinejoin="round" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
          </svg>
          <span className="tabular-nums">0</span>
        </Link>
      </div>
    </header>
  );
}
