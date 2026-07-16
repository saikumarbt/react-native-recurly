import {
  addInterval,
  getCycleLabel,
  getDaysUntilRenewal,
  getMonthlyEquivalent,
  getNextRenewal,
  normalizeBillingCycle,
  resolveNextRenewal,
} from "@/lib/billing";
import dayjs from "dayjs";

describe("normalizeBillingCycle", () => {
  it("maps legacy labels", () => {
    expect(normalizeBillingCycle("Yearly")).toBe("annual");
    expect(normalizeBillingCycle("Monthly")).toBe("monthly");
    expect(normalizeBillingCycle("weekly")).toBe("weekly");
  });

  it("falls back to monthly for unknown values", () => {
    expect(normalizeBillingCycle(undefined)).toBe("monthly");
    expect(normalizeBillingCycle("fortnightly-ish")).toBe("monthly");
  });
});

describe("getNextRenewal", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-09T12:00:00Z"));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the anchor when it is today or later", () => {
    const next = getNextRenewal("2026-07-20T10:00:00.000Z", "monthly");
    expect(next?.format("YYYY-MM-DD")).toBe("2026-07-20");
  });

  it("rolls past monthly anchors forward to the next occurrence", () => {
    const next = getNextRenewal("2026-03-20T10:00:00.000Z", "monthly");
    expect(next?.format("YYYY-MM-DD")).toBe("2026-07-20");
  });

  it("rolls weekly cycles forward", () => {
    // Anchor Monday 2026-06-01; weekly renewals land on Mondays.
    const next = getNextRenewal("2026-06-01T00:00:00.000Z", "weekly");
    expect(next?.day()).toBe(dayjs("2026-06-01").day());
    expect(next?.isBefore(dayjs("2026-07-09"))).toBe(false);
  });

  it("clamps month-end anchors (Jan 31 -> Feb 28 behavior)", () => {
    jest.setSystemTime(new Date("2026-02-01T12:00:00Z"));
    const next = getNextRenewal("2026-01-31T00:00:00.000Z", "monthly");
    expect(next?.format("YYYY-MM-DD")).toBe("2026-02-28");
  });

  it("supports custom day intervals", () => {
    const next = getNextRenewal("2026-07-01T00:00:00.000Z", "custom", 45);
    expect(next?.format("YYYY-MM-DD")).toBe("2026-08-15");
  });

  it("returns null for invalid dates", () => {
    expect(getNextRenewal("not-a-date", "monthly")).toBeNull();
    expect(getNextRenewal(undefined, "monthly")).toBeNull();
  });
});

describe("getDaysUntilRenewal", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-09T12:00:00Z"));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("counts whole days to the next occurrence", () => {
    expect(getDaysUntilRenewal("2026-07-12T00:00:00.000Z", "monthly")).toBe(3);
  });

  it("returns 0 when the renewal is today", () => {
    expect(getDaysUntilRenewal("2026-07-09T00:00:00.000Z", "monthly")).toBe(0);
  });
});

describe("addInterval", () => {
  it("adds exactly one interval per cycle", () => {
    const base = dayjs("2026-07-09");
    expect(addInterval(base, "weekly").format("YYYY-MM-DD")).toBe("2026-07-16");
    expect(addInterval(base, "biweekly").format("YYYY-MM-DD")).toBe(
      "2026-07-23",
    );
    expect(addInterval(base, "quarterly").format("YYYY-MM-DD")).toBe(
      "2026-10-09",
    );
    expect(addInterval(base, "annual").format("YYYY-MM-DD")).toBe("2027-07-09");
    expect(addInterval(base, "custom", 10).format("YYYY-MM-DD")).toBe(
      "2026-07-19",
    );
  });
});

describe("getMonthlyEquivalent", () => {
  it("converts each cycle to a monthly figure", () => {
    expect(getMonthlyEquivalent(12, "monthly")).toBe(12);
    expect(getMonthlyEquivalent(120, "annual")).toBe(10);
    expect(getMonthlyEquivalent(30, "quarterly")).toBe(10);
    expect(getMonthlyEquivalent(60, "semiannual")).toBe(10);
    expect(getMonthlyEquivalent(3, "weekly")).toBeCloseTo(13, 5);
    expect(getMonthlyEquivalent(6, "biweekly")).toBeCloseTo(13, 5);
  });

  it("handles custom intervals via average month length", () => {
    // 365.25/12 ≈ 30.44-day month; a 30-day custom cycle is slightly more
    // than 1x per month.
    expect(getMonthlyEquivalent(10, "custom", 30)).toBeCloseTo(10.146, 2);
  });
});

describe("resolveNextRenewal (start-date aware)", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-10T12:00:00Z"));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("pushes a subscription started today one interval out", () => {
    const next = resolveNextRenewal("2026-07-10T00:00:00.000Z", "monthly");
    expect(next?.format("YYYY-MM-DD")).toBe("2026-08-10");
  });

  it("rolls a past start date forward to the next future occurrence", () => {
    const next = resolveNextRenewal("2024-03-20T00:00:00.000Z", "monthly");
    expect(next?.isAfter(dayjs("2026-07-10"))).toBe(true);
    expect(next?.format("DD")).toBe("20");
    expect(next?.format("YYYY-MM-DD")).toBe("2026-07-20");
  });

  it("keeps a future start date as the first renewal", () => {
    const next = resolveNextRenewal("2026-09-01T00:00:00.000Z", "annual");
    expect(next?.format("YYYY-MM-DD")).toBe("2026-09-01");
  });

  it("handles annual subs started years ago", () => {
    const next = resolveNextRenewal("2023-04-02T00:00:00.000Z", "annual");
    expect(next?.format("YYYY-MM-DD")).toBe("2027-04-02");
  });

  it("returns null for invalid/missing dates", () => {
    expect(resolveNextRenewal(undefined, "monthly")).toBeNull();
    expect(resolveNextRenewal("nope", "monthly")).toBeNull();
  });
});

describe("next renewal across all cycles (existing sub, started in the past)", () => {
  // "Today" is 2026-07-13. A subscription started 2026-06-08 has already had
  // its 2026-07-08 monthly charge, so the *next* one is 2026-08-08 — verifying
  // the roll-forward skips passed dates for every cycle.
  const START = "2026-06-08T10:00:00.000Z";
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-13T12:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());

  const fmt = (cycle: Parameters<typeof resolveNextRenewal>[1], custom?: number) =>
    resolveNextRenewal(START, cycle, custom)?.format("YYYY-MM-DD");

  it("monthly rolls past the passed 07-08 to 08-08", () => {
    expect(fmt("monthly")).toBe("2026-08-08");
  });
  it("weekly: a hit that lands on today stays today (not silently rolled)", () => {
    // Jun 8 + 7n: … Jul 6, Jul 13 (= today). Due today — we don't assume it was
    // paid (no payment link), so it stays today rather than rolling to Jul 20.
    expect(fmt("weekly")).toBe("2026-07-13");
  });

  it("monthly: a charge due today shows as today, not next month", () => {
    // start Jun 13, today Jul 13 → the Jul 13 charge is due today.
    expect(
      resolveNextRenewal("2026-06-13T00:00:00.000Z", "monthly")?.format(
        "YYYY-MM-DD",
      ),
    ).toBe("2026-07-13");
  });
  it("biweekly", () => {
    // Jun 8, Jun 22, Jul 6, Jul 20
    expect(fmt("biweekly")).toBe("2026-07-20");
  });
  it("quarterly", () => {
    expect(fmt("quarterly")).toBe("2026-09-08");
  });
  it("semiannual", () => {
    expect(fmt("semiannual")).toBe("2026-12-08");
  });
  it("annual rolls to next year", () => {
    expect(fmt("annual")).toBe("2027-06-08");
  });
  it("custom (45 days)", () => {
    // Jun 8 + 45 = Jul 23 (first future)
    expect(fmt("custom", 45)).toBe("2026-07-23");
  });

  it("a sub started today renews one interval out", () => {
    expect(resolveNextRenewal("2026-07-13T00:00:00.000Z", "monthly")?.format("YYYY-MM-DD")).toBe(
      "2026-08-13",
    );
  });

  it("a future-dated start keeps that date as the first renewal", () => {
    expect(resolveNextRenewal("2026-09-01T00:00:00.000Z", "monthly")?.format("YYYY-MM-DD")).toBe(
      "2026-09-01",
    );
  });
});

describe("getCycleLabel", () => {
  it("labels standard and custom cycles", () => {
    expect(getCycleLabel("monthly")).toBe("Monthly");
    expect(getCycleLabel("annual")).toBe("Annual");
    expect(getCycleLabel("custom", 45)).toBe("Every 45 days");
  });
});
