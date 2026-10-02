import Link from "next/link";

const categories = [
  {
    slug: "home",
    name: "Home",
    description:
      "Quiet, durable pieces that bring order and warmth to everyday spaces.",
    shape: "h-3/5 w-2/5 rounded-t-full bg-clay",
  },
  {
    slug: "kitchen",
    name: "Kitchen",
    description:
      "Tools and tableware made for daily cooking, sharing and slow mornings.",
    shape: "aspect-square w-2/5 rounded-full bg-stone",
  },
  {
    slug: "workspace",
    name: "Workspace",
    description:
      "Desk essentials that keep your focus on the work, not the clutter.",
    shape: "h-2/5 w-3/5 rounded-sm bg-sage",
  },
];

export default function CategorySection() {
  return (
    <section
      id="categories"
      aria-labelledby="categories-heading"
      className="border-t border-line"
    >
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Shop by category
          </p>
          <h2
            id="categories-heading"
            className="mt-4 text-3xl font-medium tracking-tight text-balance sm:text-4xl"
          >
            Designed for the rooms you live in.
          </h2>
        </div>

        <ul className="mt-10 grid gap-x-6 gap-y-12 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
          {categories.map(({ slug, name, description, shape }) => (
            <li key={slug} id={`category-${slug}`} className="flex flex-col">
              <div
                aria-hidden="true"
                className="flex aspect-[4/3] items-center justify-center rounded-sm bg-surface"
              >
                <div className={shape} />
              </div>
              <h3 className="mt-6 text-lg font-medium">{name}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
                {description}
              </p>
              <Link
                href={`#category-${slug}`}
                className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-medium underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
              >
                Explore {name}
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
