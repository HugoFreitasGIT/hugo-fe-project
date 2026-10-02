import Link from "next/link";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "#categories" },
  { label: "Categories", href: "#categories" },
  { label: "About", href: "#about" },
];

export default function Footer() {
  return (
    <footer id="about" className="border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
          <div>
            <p className="text-xl font-semibold tracking-[0.3em]">NOMA</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              NOMA is a lifestyle store for modern everyday living. We select
              functional, minimalist products for the home, kitchen and
              workspace — made well and meant to last.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {footerLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-ink-muted transition-colors hover:text-ink"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-12 border-t border-line pt-6 text-xs text-ink-muted">
          © {new Date().getFullYear()} NOMA. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
