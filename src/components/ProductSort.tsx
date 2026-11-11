"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ChangeEvent } from "react";

import { DEFAULT_SORT, SORT_OPTIONS, type SortOption } from "@/lib/product-sort";

type ProductSortProps = {
  value: SortOption;
  /** Active category slug, kept when the form is submitted without JavaScript. */
  category: string | null;
};

// Sort control for /shop. The sort order lives in the URL (?sort=), so it can
// be shared and restored with the back button; the server does the sorting.
// It is a GET form, so it still works without JavaScript via the Apply button.
export default function ProductSort({ value, category }: ProductSortProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    // Keep any other query parameters and only replace the sort order.
    const params = new URLSearchParams(window.location.search);
    const sort = event.target.value;
    if (sort === DEFAULT_SORT) {
      params.delete("sort");
    } else {
      params.set("sort", sort);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  return (
    <form
      action={pathname}
      method="get"
      className="flex w-full items-center gap-3 sm:w-auto"
      aria-busy={isPending}
    >
      {category && <input type="hidden" name="category" value={category} />}
      <label htmlFor="product-sort" className="shrink-0 text-sm text-ink-muted">
        Sort by
      </label>
      <select
        id="product-sort"
        name="sort"
        // Keyed on value so the select follows the URL on back/forward.
        key={value}
        defaultValue={value}
        onChange={handleChange}
        className="min-w-0 flex-1 rounded-sm border border-line bg-canvas py-2 pr-8 pl-3 text-sm transition-opacity sm:flex-none data-[pending=true]:opacity-60"
        data-pending={isPending}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button
          type="submit"
          className="rounded-sm border border-ink px-3 py-2 text-sm font-medium"
        >
          Apply
        </button>
      </noscript>
    </form>
  );
}
