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
});
