import type { ReactNode } from "react";

type PageMessageProps = {
  eyebrow: string;
  title: string;
  description: string;
  /** Call to action, e.g. a link back to the shop or a retry button. */
  action: ReactNode;
  /** Announce the message to assistive technology, e.g. for errors. */
  role?: "alert";
};

// Full-width page message used for error and not-found states.
export default function PageMessage({
  eyebrow,
  title,
  description,
  action,
  role,
}: PageMessageProps) {
  return (
    <main id="main" className="flex-1">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        <div className="max-w-2xl" role={role}>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
            {description}
          </p>
          <div className="mt-8">{action}</div>
        </div>
      </div>
    </main>
  );
}
