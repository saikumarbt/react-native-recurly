import { computeFound } from "@/lib/found";

let n = 0;
const sub = (over: Partial<Subscription>): Subscription =>
  ({
    id: `s${n++}`,
    name: "x",
    price: 10,
    billing: "Monthly",
    billingCycle: "monthly",
    status: "active",
    ...over,
  }) as Subscription;

describe("computeFound (deterministic)", () => {
  it("presents same-category subs as a keep-one decision, not a forced cut", () => {
    const r = computeFound([
      sub({ name: "ChatGPT", price: 20, category: "AI tools" }),
      sub({ name: "Claude", price: 20, category: "AI tools" }),
      sub({ name: "Perplexity", price: 10, category: "AI tools" }),
    ]);
    expect(r.groups).toHaveLength(1);
    const g = r.groups[0];
    expect(g.members).toHaveLength(3);
    // one keep-option per member (linear, not combinatorial)
    expect(g.keepOptions).toHaveLength(3);
    // keeping Perplexity ($10/mo = $120/yr) cancels the two $20 tools → $480/yr
    const keepCheapest = g.keepOptions.find((k) => k.keepName === "Perplexity")!;
    expect(keepCheapest.save).toBeCloseTo((20 + 20) * 12);
    // best-case headline = cancel all but the cheapest
    expect(g.bestSave).toBeCloseTo((20 + 20) * 12);
  });

  it("flags exact duplicates as a simple finding, keeping the priciest", () => {
    const r = computeFound([
      sub({ name: "Spotify", price: 11.99, category: "Music" }),
      sub({ name: "spotify", price: 9.99, category: "Music" }),
    ]);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].kind).toBe("duplicate");
    expect(r.groups).toHaveLength(0); // dup claimed the sub; no leftover group
    expect(r.annualSavings).toBeCloseTo(9.99 * 12);
  });

  it("uses bundle facts (Prime Video included in Amazon Prime)", () => {
    const r = computeFound([
      sub({ name: "Amazon Prime", price: 14.99, category: "Shopping" }),
      sub({ name: "Prime Video", price: 8.99, category: "Streaming" }),
    ]);
    expect(r.findings.some((f) => f.kind === "bundle")).toBe(true);
    expect(r.annualSavings).toBeCloseTo(8.99 * 12);
  });

  it("flags every group member neutrally (1 of N category)", () => {
    const r = computeFound([
      sub({ name: "Netflix", price: 15, category: "Entertainment" }),
      sub({ name: "Disney+", price: 8, category: "Entertainment" }),
    ]);
    const ids = r.groups[0].members.map((m) => m.subId);
    ids.forEach((id) => expect(r.flagged[id]).toBe("1 of 2 Entertainment"));
  });

  it("suppresses subs the user chose to keep (keptSubIds)", () => {
    const a = sub({ name: "Netflix", price: 15, category: "Entertainment" });
    const b = sub({ name: "Disney+", price: 8, category: "Entertainment" });
    expect(computeFound([a, b]).groups).toHaveLength(1);
    // Keeping one member drops the pair below 2 → no overlap left.
    expect(computeFound([a, b], new Set([b.id])).count).toBe(0);
  });

  it("ignores trials, paused, cancelled and uncategorized singles", () => {
    const r = computeFound([
      sub({ name: "Netflix", price: 15, category: "Entertainment" }),
      sub({ name: "Trial", price: 9, category: "Entertainment", isTrial: true }),
      sub({ name: "Paused", price: 9, category: "Entertainment", status: "paused" }),
      sub({ name: "Solo", price: 5 }),
    ]);
    expect(r.count).toBe(0);
    expect(r.annualSavings).toBe(0);
  });
});
