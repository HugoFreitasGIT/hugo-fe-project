import Link from "next/link";

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-24 lg:pt-20"
    >
      <div className="max-w-xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Objects for everyday living
        </p>
        <h1
          id="hero-heading"
          className="mt-5 text-4xl font-medium leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl"
        >
          Fewer, better things for the way you live.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
          NOMA brings together considered essentials for the home, kitchen and
          workspace — functional objects designed to be used daily and kept for
          years.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-center sm:gap-8">
          <Link
            href="/shop"
            className="inline-flex h-12 items-center justify-center rounded-sm bg-ink px-7 text-sm font-medium text-canvas transition-colors hover:bg-ink/85"
          >
            Shop collection
          </Link>
          <Link
            href="#about"
            className="inline-flex h-12 items-center justify-center text-sm font-medium underline decoration-line underline-offset-4 transition-colors hover:decoration-ink sm:justify-start"
          >
            About NOMA
          </Link>
        </div>
      </div>

      {/* Placeholder composition until real product imagery is available. */}
      <div
        aria-hidden="true"
        className="relative aspect-[4/5] overflow-hidden rounded-sm bg-surface sm:aspect-[3/2] lg:aspect-[4/5]"
      >
        <div className="absolute left-1/2 top-[12%] h-[58%] w-[52%] -translate-x-1/2 rounded-t-full bg-canvas/70" />
        <div className="absolute inset-x-[8%] bottom-[22%] h-px bg-ink/25" />
        <div className="absolute bottom-[22%] left-[14%] h-[38%] w-[14%] rounded-t-full bg-clay" />
        <div className="absolute bottom-[22%] left-[33%] aspect-square w-[8%] rounded-full bg-stone" />
        <div className="absolute bottom-[22%] left-[45%] h-[9%] w-[22%] rounded-b-full bg-ink" />
        <div className="absolute bottom-[22%] right-[12%] flex w-[18%] flex-col items-end gap-[3px]">
          <div className="h-3 w-[88%] bg-sage sm:h-4" />
          <div className="h-3 w-full bg-stone sm:h-4" />
          <div className="h-3 w-[94%] bg-clay sm:h-4" />
        </div>
        <p className="absolute bottom-[8%] left-[8%] text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Collection 01
        </p>
      </div>
    </section>
  );
}
