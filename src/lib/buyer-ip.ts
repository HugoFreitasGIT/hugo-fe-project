import "server-only";

import { isIP } from "node:net";

// The buyer IP is only taken from X-Forwarded-For when the app is configured
// to run behind trusted proxies. Each trusted proxy appends the address it
// received the request from, so with N trusted proxies the buyer's address is
// the Nth entry from the right; anything further left was sent by the client
// and can be forged. Without that configuration nothing is trusted: `next
// start` keeps an incoming X-Forwarded-For header as the client sent it.

/** Number of trusted proxies in front of the app, or 0 when none are configured. */
export function getTrustedProxyCount(): number {
  const value = process.env.TRUSTED_PROXY_COUNT?.trim();
  if (!value || !/^\d+$/.test(value)) return 0;
  return Number(value);
}

/**
 * Returns the buyer's IP from an X-Forwarded-For value written by
 * `trustedProxyCount` trusted proxies, or undefined if it cannot be trusted
 * or is not a valid IPv4/IPv6 address.
 */
export function getBuyerIp(
  forwardedFor: string | null,
  trustedProxyCount: number,
): string | undefined {
  if (!forwardedFor || trustedProxyCount < 1) return undefined;

  const addresses = forwardedFor.split(",").map((address) => address.trim());
  const candidate = addresses[addresses.length - trustedProxyCount];

  return candidate && isIP(candidate) !== 0 ? candidate : undefined;
}
