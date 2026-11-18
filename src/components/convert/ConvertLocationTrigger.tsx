"use client";

import { useEffect } from "react";

type ConvertCommand = { what: string; params?: Record<string, unknown> };

declare global {
  interface Window {
    // Convert's command queue: a plain array until the tracking script
    // initialises (it then processes the queued commands), Convert's own
    // queue object afterwards. Both expose `push`.
    _conv_q?: { push(...commands: ConvertCommand[]): unknown };
  }
}

type ConvertLocationTriggerProps = {
  /** ID of a Convert location configured with the "Manually" trigger. */
  locationId: string;
};

/**
 * Activates a Convert location after React has hydrated the page.
 *
 * Variations that change server-rendered content must not run before
 * hydration, or React detects a mismatch and regenerates the document. The
 * location is therefore set to the "Manually" trigger in Convert and activated
 * here, from an effect, which only runs once the hydrated tree is committed.
 * The effect runs again whenever the page mounts, including client-side
 * navigation back to it.
 */
export default function ConvertLocationTrigger({ locationId }: ConvertLocationTriggerProps) {
  useEffect(() => {
    // Documented safe initialisation: never replace an existing queue.
    window._conv_q = window._conv_q || [];
    window._conv_q.push({ what: "triggerLocation", params: { locationId } });
  }, [locationId]);

  return null;
}
