import {
  formatCurrency,
  formatStatusLabel,
  formatSubscriptionDateTime,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    // Symbol vs code depends on the runtime's ICU data ("$9.99" on device
    // Hermes, "USD 9.99" on small-ICU Node) — assert the parts, not the glyph.
    expect(formatCurrency(9.99)).toMatch(/9\.99/);
    expect(formatCurrency(9.99)).toMatch(/\$|USD/);
  });

  it("formats other ISO currencies via Intl", () => {
    expect(formatCurrency(10, "EUR")).toMatch(/10/);
    expect(formatCurrency(1000, "JPY")).toMatch(/1,?000/);
  });

  it("falls back gracefully for invalid codes", () => {
    expect(formatCurrency(5, "NOT_A_CODE")).toBe("NOT_A_CODE 5.00");
  });
});

describe("formatSubscriptionDateTime", () => {
  it("formats ISO dates as 'MMM D, YYYY'", () => {
    expect(formatSubscriptionDateTime("2026-03-20T10:00:00.000Z")).toBe(
      "Mar 20, 2026",
    );
  });

  it("handles missing/invalid values", () => {
    expect(formatSubscriptionDateTime(undefined)).toBe("Not provided");
    expect(formatSubscriptionDateTime("garbage")).toBe("Not provided");
  });
});

describe("formatStatusLabel", () => {
  it("capitalizes", () => {
    expect(formatStatusLabel("active")).toBe("Active");
    expect(formatStatusLabel(undefined)).toBe("Unknown");
  });
});
