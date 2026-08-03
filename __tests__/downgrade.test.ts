import { needsReconciliation, suggestKeep } from "@/lib/downgrade";
import { FREE_ACTIVE_CAP } from "@/lib/limits";

let n = 0;
const sub = (over: Partial<Subscription> = {}): Subscription =>
  ({
    id: `s${n++}`,
    name: "x",
    price: 10,
    billingCycle: "monthly",
    status: "active",
    ...over,
  }) as Subscription;

describe("downgrade reconciliation", () => {
  it("only needs reconciliation for a lapsed user over the cap", () => {
    const over = Array.from({ length: FREE_ACTIVE_CAP + 3 }, () => sub());
    expect(needsReconciliation(over, false)).toBe(true);
    // Pro is never reconciled, however many they have.
    expect(needsReconciliation(over, true)).toBe(false);
    // At/under the cap: nothing to do.
    const atCap = Array.from({ length: FREE_ACTIVE_CAP }, () => sub());
    expect(needsReconciliation(atCap, false)).toBe(false);
  });

  it("paused/cancelled don't count toward the reconciliation trigger", () => {
    const subs = [
      ...Array.from({ length: FREE_ACTIVE_CAP }, () => sub()),
      sub({ status: "paused" }),
      sub({ status: "cancelled" }),
    ];
    expect(needsReconciliation(subs, false)).toBe(false); // only 5 active
  });

  it("suggestKeep keeps exactly the cap and locks the rest, from active only", () => {
    const subs = [
      ...Array.from({ length: FREE_ACTIVE_CAP + 2 }, () => sub()),
      sub({ status: "paused" }),
    ];
    const { keepIds, lockIds } = suggestKeep(subs);
    expect(keepIds).toHaveLength(FREE_ACTIVE_CAP);
    expect(lockIds).toHaveLength(2);
    // The paused sub is neither kept nor locked (it's not active).
    const touched = new Set([...keepIds, ...lockIds]);
    expect(touched.size).toBe(FREE_ACTIVE_CAP + 2);
  });

  it("prioritises the soonest renewal to keep (avoids a surprise charge)", () => {
    const soon = sub({
      renewalDate: "2026-08-01T00:00:00.000Z",
      startDate: "2026-07-01T00:00:00.000Z",
    });
    const later = Array.from({ length: FREE_ACTIVE_CAP }, () =>
      sub({
        renewalDate: "2027-01-01T00:00:00.000Z",
        startDate: "2026-12-01T00:00:00.000Z",
      }),
    );
    // cap+1 active; the soonest-renewing one must survive into keepIds.
    const { keepIds, lockIds } = suggestKeep([soon, ...later]);
    expect(keepIds).toContain(soon.id);
    expect(lockIds).not.toContain(soon.id);
  });
});
