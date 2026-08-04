import {
  computeTrialEnd,
  firstChargeDate,
  resolveNextRenewal,
} from "@/lib/billing";
import dayjs from "dayjs";

describe("computeTrialEnd", () => {
  it("ends `trialDays` after the START date (regression: not now + N)", () => {
    const start = "2026-06-25T00:00:00.000Z";
    const end = computeTrialEnd(start, 7)!;
    // Exactly 7 days after start — TZ-independent assertion.
    expect(dayjs(end).diff(dayjs(start), "day")).toBe(7);
  });

  it("is anchored to the start date, never to 'now'", () => {
    // A start far in the past → the end is also in the past (start + 7),
    // proving it isn't computed from today (the bug produced ~today + 7).
    const past = "2020-01-01T00:00:00.000Z";
    const end = computeTrialEnd(past, 7)!;
    expect(dayjs(end).year()).toBe(2020);
    expect(dayjs(end).isBefore(dayjs())).toBe(true);
  });

  it("accepts a Date as well as an ISO string", () => {
    const start = new Date("2026-06-25T00:00:00.000Z");
    expect(dayjs(computeTrialEnd(start, 14)!).diff(dayjs(start), "day")).toBe(14);
  });

  it("returns undefined for invalid inputs", () => {
    expect(computeTrialEnd(undefined, 7)).toBeUndefined();
    expect(computeTrialEnd("2026-06-25T00:00:00.000Z", 0)).toBeUndefined();
    expect(computeTrialEnd("2026-06-25T00:00:00.000Z", -3)).toBeUndefined();
    expect(computeTrialEnd("2026-06-25T00:00:00.000Z", NaN)).toBeUndefined();
    expect(computeTrialEnd("not-a-date", 7)).toBeUndefined();
  });
});

describe("trial → first charge anchor", () => {
  it("firstChargeDate is the trial end while on trial, else the start", () => {
    const start = "2026-06-25T00:00:00.000Z";
    const trialEnd = "2026-07-02T00:00:00.000Z";
    expect(
      firstChargeDate({
        isTrial: true,
        trialEndDate: trialEnd,
        startDate: start,
      } as Subscription),
    ).toBe(trialEnd);
    expect(
      firstChargeDate({ isTrial: false, startDate: start } as Subscription),
    ).toBe(start);
  });

  it("a future trial end IS the next renewal (conversion charge, not start+cycle)", () => {
    // Trial converting in 30 days: the first charge is that date itself.
    const futureEnd = dayjs().add(30, "day").toISOString();
    const next = resolveNextRenewal(futureEnd, "monthly");
    expect(next).not.toBeNull();
    expect(dayjs(next!).isSame(dayjs(futureEnd).startOf("day"), "day")).toBe(
      true,
    );
  });
});
