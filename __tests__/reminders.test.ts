import { buildReminders } from "@/lib/reminders";
import dayjs from "dayjs";

const baseSub = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: "sub1",
  name: "Netflix",
  price: 15.49,
  billing: "Monthly",
  billingCycle: "monthly",
  status: "active",
  renewalDate: "2026-07-20T10:00:00.000Z",
  ...overrides,
});

describe("buildReminders", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-13T12:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());

  it("schedules T-3, T-1 renewal reminders + a day-of check-in at 09:00", () => {
    const reminders = buildReminders(baseSub(), "USD");
    expect(reminders.map((r) => r.id)).toEqual([
      "sub1::renewal_3",
      "sub1::renewal_1",
      "sub1::checkin",
    ]);
    for (const r of reminders) {
      expect(dayjs(r.date).hour()).toBe(9);
      expect(dayjs(r.date).isAfter(dayjs())).toBe(true);
    }
    expect(dayjs(reminders[0].date).date()).toBe(17); // 3 days before the 20th
    expect(dayjs(reminders[1].date).date()).toBe(19); // 1 day before
    expect(dayjs(reminders[2].date).date()).toBe(20); // check-in on the day
  });

  it("skips leads whose fire time is already in the past", () => {
    // Renews in 2 days → T-3 is in the past; T-1 and the day-of check-in remain.
    const reminders = buildReminders(
      baseSub({ renewalDate: "2026-07-15T10:00:00.000Z" }),
      "USD",
    );
    expect(reminders.map((r) => r.id)).toEqual([
      "sub1::renewal_1",
      "sub1::checkin",
    ]);
  });

  it("adds T-2 and T-0 trial reminders and suppresses renewal ones during a trial", () => {
    const reminders = buildReminders(
      baseSub({
        isTrial: true,
        trialEndDate: "2026-07-16T10:00:00.000Z",
        renewalDate: "2026-07-16T10:00:00.000Z",
      }),
      "USD",
    );
    const ids = reminders.map((r) => r.id);
    expect(ids).toContain("sub1::trial_2");
    expect(ids).toContain("sub1::trial_0");
    // On a trial we rely on the trial reminders + in-app conversion check-in,
    // not the generic renewal reminders — otherwise they'd cluster on one day.
    expect(ids).not.toContain("sub1::renewal_3");
    expect(ids).not.toContain("sub1::renewal_1");
    expect(ids).not.toContain("sub1::checkin");
  });

  it("returns nothing for non-active subscriptions", () => {
    expect(buildReminders(baseSub({ status: "paused" }), "USD")).toEqual([]);
    expect(buildReminders(baseSub({ status: "cancelled" }), "USD")).toEqual([]);
  });

  it("adds one reconciliation reminder ~24h after cancel intent", () => {
    // Intent set now (Jul 13 12:00) → fires Jul 14 at 09:00, once.
    const reminders = buildReminders(
      baseSub({ cancelPendingAt: "2026-07-13T12:00:00.000Z" }),
      "USD",
    );
    const pending = reminders.find((r) => r.id === "sub1::cancel_pending");
    expect(pending).toBeTruthy();
    // TZ-independent: fires at 09:00 local, on the local day after the intent
    // (asserting the calendar-day offset rather than a fixed date, which would
    // shift by ±1 in far-east/west timezones).
    expect(dayjs(pending!.date).hour()).toBe(9);
    expect(
      dayjs(pending!.date)
        .startOf("day")
        .diff(dayjs("2026-07-13T12:00:00.000Z").startOf("day"), "day"),
    ).toBe(1);
    expect(pending!.title).toMatch(/Did you cancel/);
  });

  it("does not re-add the reconciliation reminder once its time has passed", () => {
    // Intent set 2 days ago → +24h fire time is in the past → not scheduled.
    const reminders = buildReminders(
      baseSub({ cancelPendingAt: "2026-07-11T12:00:00.000Z" }),
      "USD",
    );
    expect(reminders.some((r) => r.id === "sub1::cancel_pending")).toBe(false);
  });

  it("a downgrade-locked sub gets one upgrade-framed renewal nudge (T-1), not the usual reminders", () => {
    const reminders = buildReminders(
      baseSub({ status: "paused", lockedAt: "2026-07-01T00:00:00.000Z" }),
      "USD",
    );
    expect(reminders.map((r) => r.id)).toEqual(["sub1::locked_renewal"]);
    expect(dayjs(reminders[0].date).hour()).toBe(9);
    // T-1 before the 20th renewal.
    expect(
      dayjs(reminders[0].date)
        .startOf("day")
        .diff(dayjs("2026-07-20T10:00:00.000Z").startOf("day"), "day"),
    ).toBe(-1);
    expect(reminders[0].title).toMatch(/may renew/);
  });

  it("a normal paused sub (not downgrade-locked) still gets no reminders", () => {
    expect(buildReminders(baseSub({ status: "paused" }), "USD")).toEqual([]);
  });
});
