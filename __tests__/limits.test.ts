import { FREE_ACTIVE_CAP, canAddActive, countActive, remainingSlots } from "@/lib/limits";

const sub = (status?: string): Subscription =>
  ({ id: Math.random().toString(), name: "x", price: 1, billing: "Monthly", status }) as Subscription;

describe("free-tier active cap", () => {
  it("counts only active (default) subs, not paused/cancelled", () => {
    const subs = [sub("active"), sub(undefined), sub("paused"), sub("cancelled")];
    expect(countActive(subs)).toBe(2);
  });

  it("blocks a free user at the cap but never a Pro user", () => {
    const atCap = Array.from({ length: FREE_ACTIVE_CAP }, () => sub("active"));
    expect(canAddActive(atCap, false)).toBe(false);
    expect(canAddActive(atCap, true)).toBe(true);
  });

  it("allows a free user below the cap", () => {
    const below = Array.from({ length: FREE_ACTIVE_CAP - 1 }, () => sub("active"));
    expect(canAddActive(below, false)).toBe(true);
  });

  it("paused/cancelled never consume a slot", () => {
    const subs = [
      ...Array.from({ length: FREE_ACTIVE_CAP }, () => sub("cancelled")),
      sub("active"),
    ];
    expect(canAddActive(subs, false)).toBe(true);
    expect(remainingSlots(subs, false)).toBe(FREE_ACTIVE_CAP - 1);
  });

  it("Pro has infinite slots", () => {
    expect(remainingSlots([sub("active")], true)).toBe(Infinity);
  });

  it("gates a downgraded user who is already over the cap (data untouched, growth blocked)", () => {
    // A former Pro user tracking more active subs than the free cap allows.
    const overCap = Array.from({ length: FREE_ACTIVE_CAP + 7 }, () =>
      sub("active"),
    );
    // Still blocked from adding / resuming / reactivating...
    expect(canAddActive(overCap, false)).toBe(false);
    // ...and remaining slots clamps to 0 (never negative, so no "-7 left" UI).
    expect(remainingSlots(overCap, false)).toBe(0);
    // Pro (or resubscribing) lifts the gate immediately without data changes.
    expect(canAddActive(overCap, true)).toBe(true);
  });

  it("blocks resume/reactivate that would seat one past the cap", () => {
    // At the cap on active subs, plus a paused and a cancelled one the user
    // might try to bring back. canAddActive is the guard both paths call — a
    // resume/reactivate adds +1 active, so it must be false here.
    const atCapPlusDormant = [
      ...Array.from({ length: FREE_ACTIVE_CAP }, () => sub("active")),
      sub("paused"),
      sub("cancelled"),
    ];
    expect(canAddActive(atCapPlusDormant, false)).toBe(false);
    expect(canAddActive(atCapPlusDormant, true)).toBe(true);
  });

  it("onboarding seeding allowance shrinks by subs already tracked", () => {
    // remainingSlots is what onboarding uses to cap bulk-add; with 2 already
    // active a re-run may only seed 3 more, not a fresh 5.
    const existing = [sub("active"), sub("active")];
    expect(remainingSlots(existing, false)).toBe(FREE_ACTIVE_CAP - 2);
    expect(remainingSlots(existing, true)).toBe(Infinity);
  });
});
