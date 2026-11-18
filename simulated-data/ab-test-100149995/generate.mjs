// SIMULATED DATA GENERATOR — NOT REAL CONVERT EXPERIMENT DATA.
//
// Generates a reproducible, entirely synthetic dataset of ~200 browsing sessions
// for the NOMA homepage A/B test (Convert experience 100149995), for use in a
// presentation. It makes no network requests and does not read or write any
// Convert, Shopify or analytics data. The variation and goal IDs are used only
// as labels so the slides line up with the real experiment's setup.
//
// Usage (from the repository root):
//   node simulated-data/ab-test-100149995/generate.mjs
//
// Output (next to this file, overwritten on every run, byte-identical for the
// same SEED and parameters):
//   sessions.SIMULATED.csv  one row per session, derived from its events
//   events.SIMULATED.csv    one row per event, chronological within a session
//   summary.SIMULATED.json  per-variation metrics and the statistical comparison
//   README.md               notice, assumptions, results and limitations
//
// The target click rates below are generator INPUTS. Every reported metric is
// calculated from the generated sessions, never from these targets.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_SOURCE = "SIMULATED";
const GENERATOR_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Parameters (assumptions, not measurements)
// ---------------------------------------------------------------------------

const SEED = 20261118;
const SESSION_COUNT = 200;
const ALLOCATION_TO_VARIATION_1 = 0.5;

const EXPERIENCE_ID = "100149995";
const GOAL = {
  id: "100163295",
  name: "Hero CTA Click",
  selector: 'section[aria-labelledby="hero-heading"] a[href="/shop"]',
};
const VARIATIONS = {
  original: {
    id: "1001239569",
    name: "Original",
    headline: "Fewer, better things for the way you live.",
    targetHeroCtaRate: 0.12,
  },
  variation1: {
    id: "1001239570",
    name: "Variation 1",
    headline: "Make room for better living.",
    targetHeroCtaRate: 0.16,
  },
};

// Same for both variations: the test only changes the headline.
const P_NO_INTERACTION = 0.3; // leave the homepage without scrolling or clicking
const SCROLL_REACH = { 25: 0.9, 50: 0.75, 75: 0.6, 100: 0.45 }; // conditional on the previous depth
const NEXT_ACTION = { headerShop: 0.28, categoryCard: 0.22, aboutLink: 0.08 }; // otherwise exit
const P_NO_PRODUCT_VIEW = 0.3; // on the shop, leave without opening a product
const P_ANOTHER_PRODUCT = 0.45; // after a product, view one more
const MAX_PRODUCT_VIEWS = 5;

const DEVICES = [["mobile", 0.58], ["desktop", 0.36], ["tablet", 0.06]];
const TRAFFIC_SOURCES = [["organic_search", 0.35], ["direct", 0.3], ["social", 0.2], ["email", 0.15]];
const P_NEW_VISITOR = 0.7;

// Sessions start between these instants (UTC). Fictional period.
const PERIOD_START = Date.UTC(2026, 10, 4, 0, 0, 0);
const PERIOD_DAYS = 14;

// Snapshot of the local NOMA catalog (src/data/products.ts): handle -> category.
const CATALOG = {
  home: [
    "arc-ceramic-vase", "linen-throw", "orb-table-lamp", "wool-cushion-cover", "oak-wall-shelf",
    "round-wall-mirror", "soy-wax-candle", "woven-storage-basket", "bud-vase-trio", "ceramic-incense-holder",
  ],
  kitchen: [
    "stoneware-mug-set", "oak-serving-board", "pour-over-set", "stoneware-dinner-plates", "linen-tea-towels",
    "cast-iron-skillet", "glass-storage-jars", "marble-mortar-and-pestle", "enamel-tea-kettle", "beech-utensil-set",
  ],
  workspace: [
    "felt-desk-mat", "walnut-pen-tray", "aluminium-task-light", "oak-monitor-stand", "linen-notebook",
    "leather-cable-organiser", "brass-ballpoint-pen", "felt-laptop-sleeve", "stoneware-pencil-cup", "oak-bookends",
  ],
};
const CATEGORIES = Object.keys(CATALOG);
const ALL_PRODUCTS = CATEGORIES.flatMap((c) => CATALOG[c]);

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) and helpers
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
const chance = (p) => rng() < p;
const between = (min, max) => min + rng() * (max - min);
const pick = (items) => items[Math.floor(rng() * items.length)];
function weighted(pairs) {
  let r = rng();
  for (const [value, weight] of pairs) {
    if ((r -= weight) < 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

// ---------------------------------------------------------------------------
// Session simulation
// ---------------------------------------------------------------------------

function simulateSession(index) {
  const sessionId = `SIM-S-${String(index + 1).padStart(4, "0")}`;
  const visitorId = `SIM-V-${String(index + 1).padStart(4, "0")}`;
  const variationKey = chance(ALLOCATION_TO_VARIATION_1) ? "variation1" : "original";
  const variation = VARIATIONS[variationKey];
  const device = weighted(DEVICES);
  const trafficSource = weighted(TRAFFIC_SOURCES);
  const visitorType = chance(P_NEW_VISITOR) ? "new" : "returning";

  // Start between 07:00 and 23:59 UTC on a random day of the period, whole ms.
  const day = Math.floor(rng() * PERIOD_DAYS);
  let t = PERIOD_START + day * 86_400_000 + Math.floor(between(7, 24) * 3_600_000);

  const events = [];
  let page = "/";
  const emit = (type, detail = "") => {
    events.push({ type, page, detail, ts: t });
  };
  const wait = (minS, maxS) => {
    t += Math.round(between(minS, maxS) * 1000);
  };
  const navigate = (to) => {
    page = to;
    emit("page_view");
  };

  emit("page_view");
  // Location 100118995 is triggered manually after hydration, then bucketed.
  wait(0.3, 1.8);
  emit("experiment_impression", `${variation.name} (${variation.id})`);

  let maxScroll = 0;
  const scrollTo = (depth) => {
    wait(2, 10);
    maxScroll = depth;
    emit("scroll", `${depth}%`);
  };

  // Clicks only happen after some engagement, so the hero CTA rate among
  // engaged sessions is scaled to hit the target rate across all sessions.
  const pHeroGivenEngaged = variation.targetHeroCtaRate / (1 - P_NO_INTERACTION);
  let shopEntry = "none";

  if (chance(P_NO_INTERACTION)) {
    wait(3, 25);
  } else if (chance(pHeroGivenEngaged)) {
    // The CTA sits above the fold; a few visitors scroll a little first.
    if (chance(0.3)) scrollTo(25);
    wait(3, 20);
    emit("hero_cta_click", GOAL.selector);
    shopEntry = "hero_cta";
    wait(0.2, 0.9);
    navigate("/shop");
  } else {
    for (const depth of [25, 50, 75, 100]) {
      if (!chance(SCROLL_REACH[depth])) break;
      scrollTo(depth);
    }
    wait(2, 12);
    const r = rng();
    const wantsCategory = r >= NEXT_ACTION.headerShop && r < NEXT_ACTION.headerShop + NEXT_ACTION.categoryCard;
    if (wantsCategory && maxScroll < 50) {
      // Never scrolled down to the category cards: leaves instead.
      wait(2, 15);
    } else if (r < NEXT_ACTION.headerShop) {
      emit("header_nav_click", "Shop");
      shopEntry = "header_nav";
      wait(0.2, 0.9);
      navigate("/shop");
    } else if (wantsCategory) {
      // Category cards are below the hero, so they need some scrolling first.
      const category = pick(CATEGORIES);
      emit("category_card_click", category);
      shopEntry = "category_card";
      wait(0.2, 0.9);
      navigate(`/shop?category=${category}`);
    } else if (r < NEXT_ACTION.headerShop + NEXT_ACTION.categoryCard + NEXT_ACTION.aboutLink) {
      emit("about_link_click", "#about");
      wait(5, 30);
    } else {
      wait(2, 15);
    }
  }

  let productsViewed = 0;
  if (shopEntry !== "none") {
    const shopPage = page;
    const pool = shopPage.includes("category=") ? CATALOG[shopPage.split("=")[1]] : ALL_PRODUCTS;
    wait(4, 25);
    if (!chance(P_NO_PRODUCT_VIEW)) {
      const seen = new Set();
      do {
        let handle = pick(pool);
        while (seen.has(handle)) handle = pick(pool);
        seen.add(handle);
        emit("product_click", handle);
        wait(0.2, 0.9);
        navigate(`/shop/${handle}`);
        productsViewed += 1;
        wait(10, 90);
        if (productsViewed < MAX_PRODUCT_VIEWS && chance(P_ANOTHER_PRODUCT)) {
          navigate(shopPage); // back to the listing
          wait(3, 15);
        } else {
          break;
        }
      } while (productsViewed < MAX_PRODUCT_VIEWS);
    }
  }

  wait(1, 5);
  emit("session_end", `exit:${page}`);

  return {
    sessionId,
    visitorId,
    variationKey,
    device,
    trafficSource,
    visitorType,
    events: events.map((e, i) => ({ ...e, seq: i + 1 })),
  };
}

// ---------------------------------------------------------------------------
// Session rows are derived from the events, never from generator state
// ---------------------------------------------------------------------------

function summariseSession(s) {
  const { events } = s;
  const pageViews = events.filter((e) => e.type === "page_view");
  const scrolls = events.filter((e) => e.type === "scroll").map((e) => Number.parseInt(e.detail, 10));
  const clicks = events.filter((e) => e.type.endsWith("_click"));
  const hero = events.find((e) => e.type === "hero_cta_click");
  const firstShopView = pageViews.find((e) => e.page.startsWith("/shop") && !e.page.startsWith("/shop/"));
  // seq is 1-based, so the event just before the first listing view is at seq - 2.
  const entryClick = firstShopView ? events[firstShopView.seq - 2] : undefined;
  const v = VARIATIONS[s.variationKey];
  const start = events[0].ts;
  const end = events[events.length - 1].ts;
  return {
    data_source: DATA_SOURCE,
    session_id: s.sessionId,
    visitor_id: s.visitorId,
    experience_id: EXPERIENCE_ID,
    variation_id: v.id,
    variation_name: v.name,
    session_start: new Date(start).toISOString(),
    session_end: new Date(end).toISOString(),
    duration_s: Math.round((end - start) / 1000),
    device: s.device,
    traffic_source: s.trafficSource,
    visitor_type: s.visitorType,
    landing_page: pageViews[0].page,
    max_scroll_depth_pct: scrolls.length ? Math.max(...scrolls) : 0,
    interacted: scrolls.length > 0 || clicks.length > 0,
    bounced: pageViews.length === 1,
    hero_cta_clicked: Boolean(hero),
    hero_cta_click_at: hero ? new Date(hero.ts).toISOString() : "",
    reached_shop: pageViews.some((e) => e.page.startsWith("/shop")),
    shop_entry: entryClick
      ? { hero_cta_click: "hero_cta", header_nav_click: "header_nav", category_card_click: "category_card" }[entryClick.type]
      : "none",
    products_viewed: pageViews.filter((e) => e.page.startsWith("/shop/")).length,
    pageviews: pageViews.length,
    exit_page: events[events.length - 1].page,
  };
}

// ---------------------------------------------------------------------------
// Consistency checks: abort rather than write an inconsistent dataset
// ---------------------------------------------------------------------------

function assertConsistent(s) {
  const fail = (msg) => {
    throw new Error(`${s.sessionId}: ${msg}`);
  };
  const ev = s.events;
  if (ev[0].type !== "page_view" || ev[0].page !== "/") fail("must start with a homepage page_view");
  if (ev[1]?.type !== "experiment_impression") fail("impression must follow the landing page_view");
  if (ev[ev.length - 1].type !== "session_end") fail("must end with session_end");
  if (ev.filter((e) => e.type === "session_end").length !== 1) fail("exactly one session_end");
  if (ev.filter((e) => e.type === "hero_cta_click").length > 1) fail("at most one hero CTA click");
  ev.forEach((e, i) => {
    if (e.seq !== i + 1) fail("seq must be 1..n");
    if (i > 0 && e.ts <= ev[i - 1].ts) fail(`event ${e.seq} is not after event ${i}`);
    const leavesHome = ["hero_cta_click", "header_nav_click", "category_card_click"].includes(e.type);
    if ((leavesHome || e.type === "scroll" || e.type === "about_link_click") && e.page !== "/") {
      fail(`${e.type} must happen on the homepage`);
    }
    if (leavesHome) {
      const next = ev[i + 1];
      if (next?.type !== "page_view" || !next.page.startsWith("/shop")) fail(`${e.type} must lead to the shop`);
    }
    if (e.type === "product_click") {
      const next = ev[i + 1];
      if (!e.page.startsWith("/shop") || e.page.startsWith("/shop/")) fail("product_click must be on the listing");
      if (next?.type !== "page_view" || next.page !== `/shop/${e.detail}`) fail("product_click must open that product");
    }
  });
  const scrolls = ev.filter((e) => e.type === "scroll").map((e) => Number.parseInt(e.detail, 10));
  if (scrolls.some((d, i) => i > 0 && d <= scrolls[i - 1])) fail("scroll depth must increase");
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

const Z_975 = 1.959963984540054;
const Z_80 = 0.8416212335729143;

// Standard normal CDF via the complementary error function (W. J. Cody-style
// rational approximation through erfc, accurate to ~1e-7 for this use).
function normalCdf(x) {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * z);
  const erfc =
    t *
    Math.exp(
      -z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
        t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? 1 - erfc / 2 : erfc / 2;
}

function wilson(x, n) {
  const p = x / n;
  const z2 = Z_975 * Z_975;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (Z_975 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [centre - half, centre + half];
}

function logFactorial(n) {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}

// Two-sided Fisher's exact test on the 2x2 table [[x1, n1-x1], [x2, n2-x2]].
function fisherExactTwoSided(x1, n1, x2, n2) {
  const k = x1 + x2;
  const n = n1 + n2;
  const logP = (a) =>
    logFactorial(k) + logFactorial(n - k) + logFactorial(n1) + logFactorial(n2) -
    logFactorial(n) - logFactorial(a) - logFactorial(k - a) - logFactorial(n1 - a) - logFactorial(n2 - k + a);
  const observed = logP(x1);
  let p = 0;
  for (let a = Math.max(0, k - n2); a <= Math.min(k, n1); a++) {
    const lp = logP(a);
    if (lp <= observed + 1e-7) p += Math.exp(lp);
  }
  return Math.min(1, p);
}

function powerTwoProportions(p1, p2, n1, n2) {
  const pBar = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se0 = Math.sqrt(pBar * (1 - pBar) * (1 / n1 + 1 / n2));
  const se1 = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  return normalCdf((Math.abs(p2 - p1) - Z_975 * se0) / se1);
}

function samplePerArmFor80Power(p1, p2) {
  const pBar = (p1 + p2) / 2;
  const num = Z_975 * Math.sqrt(2 * pBar * (1 - pBar)) + Z_80 * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((num * num) / ((p2 - p1) ** 2));
}

function minimumDetectableRate(p1, n1, n2) {
  let lo = p1;
  let hi = 0.999;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (powerTwoProportions(p1, mid, n1, n2) < 0.8) lo = mid;
    else hi = mid;
  }
  return hi;
}

function compare(x1, n1, x2, n2) {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const diff = p2 - p1;

  // Primary: pooled two-proportion z-test (H0: p1 = p2), two-sided.
  const pPool = (x1 + x2) / (n1 + n2);
  const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const z = diff / sePool;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  // 95% CI for the absolute difference: Newcombe hybrid score (method 10),
  // which behaves better than the Wald interval at small counts.
  const [l1, u1] = wilson(x1, n1);
  const [l2, u2] = wilson(x2, n2);
  const diffCi = [
    diff - Math.sqrt((p2 - l2) ** 2 + (u1 - p1) ** 2),
    diff + Math.sqrt((u2 - p2) ** 2 + (p1 - l1) ** 2),
  ];

  // Relative lift = p2/p1 - 1, with a 95% CI from the log risk ratio (Katz).
  let lift = null;
  let liftCi = null;
  if (x1 > 0 && x2 > 0) {
    const rr = p2 / p1;
    const seLog = Math.sqrt(1 / x2 - 1 / n2 + 1 / x1 - 1 / n1);
    lift = rr - 1;
    liftCi = [Math.exp(Math.log(rr) - Z_975 * seLog) - 1, Math.exp(Math.log(rr) + Z_975 * seLog) - 1];
  }

  return {
    absoluteDifference: diff,
    absoluteDifferenceCi95: diffCi,
    relativeLift: lift,
    relativeLiftCi95: liftCi,
    zTest: { z, pValue },
    fisherExactPValue: fisherExactTwoSided(x1, n1, x2, n2),
    rateCi95: { original: [l1, u1], variation1: [l2, u2] },
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const simulated = Array.from({ length: SESSION_COUNT }, (_, i) => simulateSession(i));
simulated.forEach(assertConsistent);
const sessions = simulated.map(summariseSession);

function metricsFor(key) {
  const rows = sessions.filter((r) => r.variation_id === VARIATIONS[key].id);
  const n = rows.length;
  const count = (f) => rows.filter(f).length;
  const mean = (f) => rows.reduce((s, r) => s + f(r), 0) / n;
  const durations = rows.map((r) => r.duration_s).sort((a, b) => a - b);
  const median = n % 2 ? durations[(n - 1) / 2] : (durations[n / 2 - 1] + durations[n / 2]) / 2;
  const heroClicks = count((r) => r.hero_cta_clicked);
  return {
    variationId: VARIATIONS[key].id,
    variationName: VARIATIONS[key].name,
    headline: VARIATIONS[key].headline,
    visitors: n,
    heroCtaClicks: heroClicks,
    heroCtaConversionRate: heroClicks / n,
    bounceRate: count((r) => r.bounced) / n,
    noInteractionRate: count((r) => !r.interacted) / n,
    scrolledAtLeast50Rate: count((r) => r.max_scroll_depth_pct >= 50) / n,
    reachedShopRate: count((r) => r.reached_shop) / n,
    shopEntries: {
      hero_cta: count((r) => r.shop_entry === "hero_cta"),
      header_nav: count((r) => r.shop_entry === "header_nav"),
      category_card: count((r) => r.shop_entry === "category_card"),
    },
    sessionsWithProductView: count((r) => r.products_viewed > 0),
    avgProductsViewed: mean((r) => r.products_viewed),
    avgPageviews: mean((r) => r.pageviews),
    medianDurationS: median,
  };
}

const original = metricsFor("original");
const variation1 = metricsFor("variation1");
const totalEvents = simulated.reduce((s, x) => s + x.events.length, 0);
const comparison = compare(original.heroCtaClicks, original.visitors, variation1.heroCtaClicks, variation1.visitors);

// Sample ratio mismatch check on the random 50/50 assignment (chi-square, 1 df).
const expected = SESSION_COUNT / 2;
const srmChi2 = ((original.visitors - expected) ** 2 + (variation1.visitors - expected) ** 2) / expected;
const srmPValue = 2 * (1 - normalCdf(Math.sqrt(srmChi2)));

const assumedP1 = VARIATIONS.original.targetHeroCtaRate;
const assumedP2 = VARIATIONS.variation1.targetHeroCtaRate;
const power = {
  powerToDetectAssumedEffect: powerTwoProportions(assumedP1, assumedP2, original.visitors, variation1.visitors),
  visitorsPerVariationFor80PercentPower: samplePerArmFor80Power(assumedP1, assumedP2),
  minimumDetectableRateAt80PercentPower: minimumDetectableRate(assumedP1, original.visitors, variation1.visitors),
};

const NOTICE =
  "SIMULATED DATA - generated offline for presentation purposes. These are NOT real Convert Experiences " +
  "results and must not be reported as experiment outcomes. No data was sent to or read from Convert.";

const summary = {
  data_source: DATA_SOURCE,
  notice: NOTICE,
  generator: { version: GENERATOR_VERSION, seed: SEED, script: "generate.mjs" },
  labels: {
    experienceId: EXPERIENCE_ID,
    goal: GOAL,
    note: "IDs are labels matching the real experiment's setup; no values came from Convert.",
  },
  assumptions: {
    sessions: SESSION_COUNT,
    allocationToVariation1: ALLOCATION_TO_VARIATION_1,
    targetHeroCtaRate: { original: assumedP1, variation1: assumedP2 },
    pNoInteraction: P_NO_INTERACTION,
    oneSessionPerVisitor: true,
    period: { start: new Date(PERIOD_START).toISOString().slice(0, 10), days: PERIOD_DAYS, fictional: true },
  },
  totals: { sessions: sessions.length, events: totalEvents },
  assignment: {
    original: original.visitors,
    variation1: variation1.visitors,
    variation1Share: variation1.visitors / SESSION_COUNT,
    srmChiSquare: srmChi2,
    srmPValue,
  },
  variations: { original, variation1 },
  comparison: {
    metric: "Hero CTA conversion rate (sessions with a hero CTA click / visitors)",
    ...comparison,
    alpha: 0.05,
    significantAtAlpha: comparison.zTest.pValue < 0.05,
    methods: {
      primaryTest: "Pooled two-proportion z-test, two-sided",
      robustnessTest: "Fisher's exact test, two-sided",
      absoluteDifferenceCi: "Newcombe hybrid score interval (method 10), 95%",
      relativeLiftCi: "Log risk ratio (Katz) interval, 95%",
      rateCi: "Wilson score interval, 95%",
    },
  },
  power,
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const csvCell = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => {
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n";
};

const eventRows = simulated.flatMap((s) =>
  s.events.map((e) => ({
    data_source: DATA_SOURCE,
    event_id: `${s.sessionId}-E${String(e.seq).padStart(2, "0")}`,
    session_id: s.sessionId,
    seq: e.seq,
    timestamp: new Date(e.ts).toISOString(),
    event_type: e.type,
    page: e.page,
    detail: e.detail,
    is_goal_conversion: e.type === "hero_cta_click",
  })),
);

const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const pp = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)} pp`;
const sPct = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
const fmtP = (p) => (p < 0.001 ? "< 0.001" : p.toFixed(3));
const c = summary.comparison;

const readme = `# ⚠️ SIMULATED DATA — NOT REAL CONVERT RESULTS

> ${NOTICE}

Synthetic browsing sessions for the NOMA homepage headline test, for use in a presentation only.
The experience, variation and goal IDs are **labels** matching the real experiment's setup
(experience \`${EXPERIENCE_ID}\`, goal "${GOAL.name}"). Every number below was produced by
\`generate.mjs\` from assumed parameters and a fixed random seed.

## Files

| File | Contents |
|---|---|
| \`generate.mjs\` | Generator (Node, no dependencies, no network access). Re-run: \`node simulated-data/ab-test-100149995/generate.mjs\` |
| \`sessions.SIMULATED.csv\` | ${sessions.length} rows, one per session, derived from its events |
| \`events.SIMULATED.csv\` | ${totalEvents} rows, one per event, chronological within each session |
| \`summary.SIMULATED.json\` | Per-variation metrics, statistical comparison and power analysis |
| \`README.md\` | This file (regenerated by the script) |

Every CSV row carries \`data_source = SIMULATED\`. Seed: \`${SEED}\`. The output is byte-identical on every run with the same seed and parameters.

## Assumptions (generator inputs, not results)

- ${SESSION_COUNT} sessions, one per visitor, randomly assigned 50/50 (independent coin flip per visitor).
- Target hero CTA click rate: **${pct(assumedP1, 0)}** for Original and **${pct(assumedP2, 0)}** for Variation 1. These targets only drive the simulation; the reported rates are counted from the generated sessions and differ from the targets by chance.
- Everything else is identical in both variations: ${pct(P_NO_INTERACTION, 0)} of visitors leave without interacting; the rest scroll, use the header "Shop" link, open a category card or the About link, or leave; shop visitors open 0–${MAX_PRODUCT_VIEWS} products.
- The goal mirrors the real Convert goal: only a click on \`${GOAL.selector}\` counts. Reaching \`/shop\` through the header or a category card does **not** count as a conversion.
- Fictional period: ${PERIOD_DAYS} days from ${summary.assumptions.period.start}. Products come from a snapshot of the local catalog.

## Visitor split

| | Original | Variation 1 |
|---|---|---|
| Visitors (sessions) | ${original.visitors} | ${variation1.visitors} |
| Share | ${pct(original.visitors / SESSION_COUNT)} | ${pct(variation1.visitors / SESSION_COUNT)} |

Sample ratio mismatch check (chi-square vs 50/50): χ² = ${srmChi2.toFixed(2)}, p = ${fmtP(srmPValue)} — ${srmPValue < 0.01 ? "**possible SRM**" : "no evidence of SRM"}.

## Results (SIMULATED)

| Metric | Original | Variation 1 |
|---|---|---|
| Visitors | ${original.visitors} | ${variation1.visitors} |
| Hero CTA clicks (goal) | ${original.heroCtaClicks} | ${variation1.heroCtaClicks} |
| **Hero CTA conversion rate** | **${pct(original.heroCtaConversionRate)}** | **${pct(variation1.heroCtaConversionRate)}** |
| 95% CI (Wilson) | ${pct(c.rateCi95.original[0])} – ${pct(c.rateCi95.original[1])} | ${pct(c.rateCi95.variation1[0])} – ${pct(c.rateCi95.variation1[1])} |
| Bounce rate (single page view) | ${pct(original.bounceRate)} | ${pct(variation1.bounceRate)} |
| Left without interacting | ${pct(original.noInteractionRate)} | ${pct(variation1.noInteractionRate)} |
| Scrolled ≥ 50% | ${pct(original.scrolledAtLeast50Rate)} | ${pct(variation1.scrolledAtLeast50Rate)} |
| Reached the shop (any route) | ${pct(original.reachedShopRate)} | ${pct(variation1.reachedShopRate)} |
| Shop entries: hero CTA / header / category | ${original.shopEntries.hero_cta} / ${original.shopEntries.header_nav} / ${original.shopEntries.category_card} | ${variation1.shopEntries.hero_cta} / ${variation1.shopEntries.header_nav} / ${variation1.shopEntries.category_card} |
| Sessions with a product view | ${original.sessionsWithProductView} | ${variation1.sessionsWithProductView} |
| Avg products viewed per session | ${original.avgProductsViewed.toFixed(2)} | ${variation1.avgProductsViewed.toFixed(2)} |
| Avg page views per session | ${original.avgPageviews.toFixed(2)} | ${variation1.avgPageviews.toFixed(2)} |
| Median session duration | ${original.medianDurationS} s | ${variation1.medianDurationS} s |

## Comparison: Variation 1 vs Original (SIMULATED)

| | Value | 95% CI |
|---|---|---|
| **Absolute difference** in conversion rate (percentage points) | ${pp(c.absoluteDifference)} | ${pp(c.absoluteDifferenceCi95[0])} to ${pp(c.absoluteDifferenceCi95[1])} |
| **Relative lift** (Variation 1 rate ÷ Original rate − 1) | ${c.relativeLift === null ? "n/a" : sPct(c.relativeLift)} | ${c.relativeLiftCi95 === null ? "n/a" : `${sPct(c.relativeLiftCi95[0])} to ${sPct(c.relativeLiftCi95[1])}`} |
| Two-proportion z-test (pooled, two-sided) | z = ${c.zTest.z.toFixed(2)}, p = ${fmtP(c.zTest.pValue)} | |
| Fisher's exact test (two-sided) | p = ${fmtP(c.fisherExactPValue)} | |

The absolute difference is the gap between the two rates in percentage points; the relative lift
expresses that gap as a share of the Original rate. The same data can sound much larger as a relative
lift, so always quote both.

**Conclusion at α = 0.05: ${c.significantAtAlpha ? "statistically significant" : "not statistically significant"}.**
${c.significantAtAlpha
  ? "Even so, with this sample the confidence interval is wide and the estimate is fragile; see the limitations."
  : "The confidence interval for the difference includes zero, so this sample cannot distinguish the headlines' effect from chance."}

### Observed vs true effect (only knowable because this is a simulation)

| | Absolute difference | Relative lift |
|---|---|---|
| True effect built into the generator | ${pp(assumedP2 - assumedP1)} | ${sPct(assumedP2 / assumedP1 - 1)} |
| Observed in this sample | ${pp(c.absoluteDifference)} | ${c.relativeLift === null ? "n/a" : sPct(c.relativeLift)} |

The observed difference is **${(c.absoluteDifference / (assumedP2 - assumedP1)).toFixed(1)}×** the true one. In a real test the
true effect is unknown, so a single small sample cannot tell you whether you are looking at the real effect or a
lucky (or unlucky) draw. Small tests that do reach significance tend to **overstate** the effect, because only
large observed differences can clear the bar with so few visitors.

## Statistical limitations

- **Sample size.** With about ${Math.round(SESSION_COUNT / 2)} visitors per variation, the test has only
  **${pct(power.powerToDetectAssumedEffect, 0)} power** to detect the assumed ${pct(assumedP1, 0)} → ${pct(assumedP2, 0)} effect
  (80% is the usual minimum). Reaching 80% power needs about
  **${power.visitorsPerVariationFor80PercentPower.toLocaleString("en-US")} visitors per variation**. At this sample size, only an
  improvement to about **${pct(power.minimumDetectableRateAt80PercentPower, 0)}** (from ${pct(assumedP1, 0)}) would be
  reliably detectable.
- **Wide intervals.** The confidence intervals above span several percentage points; the true difference could be
  much smaller, larger, or in the other direction.
- **Random variation.** Even though the generator's true rates differ, a sample this small can show a smaller, larger
  or reversed difference. Changing the seed changes the outcome; picking a seed for a "nicer" result would be
  p-hacking and was not done.
- **Small counts.** Goal counts per arm are low, so the normal approximation behind the z-test is rough; Fisher's
  exact test is reported as a check.
- **Model simplifications.** One session per visitor; behaviour is independent across visitors; no novelty effect,
  seasonality, device-specific effects, bots, repeat visits or tracking loss. Real Convert data counts unique
  visitors and conversions per visitor and would include these effects.
- **Single metric.** Only the hero CTA click is the goal. Downstream outcomes (add to cart, purchase) are not modelled.

## Event types

| Event | Meaning |
|---|---|
| \`page_view\` | Page loaded (\`/\`, \`/shop\`, \`/shop?category=…\`, \`/shop/<handle>\`) |
| \`experiment_impression\` | Visitor bucketed after the manual location trigger fires |
| \`scroll\` | Homepage scroll depth reached (25/50/75/100%) |
| \`hero_cta_click\` | **Goal conversion**: "Shop collection" in the hero (\`is_goal_conversion = true\`) |
| \`header_nav_click\` | Header "Shop" link (not a conversion) |
| \`category_card_click\` | Homepage category card (not a conversion) |
| \`about_link_click\` | "About NOMA" anchor link |
| \`product_click\` | Product opened from the shop listing |
| \`session_end\` | Last activity; \`detail\` gives the exit page |
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "sessions.SIMULATED.csv"), toCsv(sessions));
writeFileSync(join(OUT_DIR, "events.SIMULATED.csv"), toCsv(eventRows));
writeFileSync(join(OUT_DIR, "summary.SIMULATED.json"), JSON.stringify(summary, null, 2) + "\n");
writeFileSync(join(OUT_DIR, "README.md"), readme);

console.log(`[SIMULATED] ${sessions.length} sessions, ${totalEvents} events written to ${OUT_DIR}`);
console.log(
  `[SIMULATED] Original ${original.heroCtaClicks}/${original.visitors} (${pct(original.heroCtaConversionRate)}) vs ` +
    `Variation 1 ${variation1.heroCtaClicks}/${variation1.visitors} (${pct(variation1.heroCtaConversionRate)}); ` +
    `diff ${pp(c.absoluteDifference)}, lift ${c.relativeLift === null ? "n/a" : sPct(c.relativeLift)}, p = ${fmtP(c.zTest.pValue)}`,
);
