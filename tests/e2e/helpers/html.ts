// Small helpers for asserting on server-rendered HTML without a DOM parser.

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
};

export const decodeEntities = (value: string) =>
  value.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (entity) => ENTITIES[entity]);

/** Text content of the first matching element, e.g. textOf(html, "h1"). */
export function textOf(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]*)<`));
  return match ? decodeEntities(match[1]) : undefined;
}

/** Value of an attribute on the first tag matching `tagPattern`. */
export function attributeOf(
  html: string,
  tagPattern: RegExp,
  attribute: string,
): string | undefined {
  const tag = html.match(tagPattern)?.[0];
  const value = tag?.match(new RegExp(`\\s${attribute}="([^"]*)"`))?.[1];
  return value === undefined ? undefined : decodeEntities(value);
}

export const formatEuro = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
