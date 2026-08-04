import { BUNDLE_FACTS } from "@/constants/savingsCatalog";
import { getMonthlyEquivalent } from "@/lib/billing";
import { normalizeName } from "@/lib/duplicates";

// "myrev Found" — deterministic, on-device savings engine. No AI, no network,
// no fabricated prices. Overlaps are presented as a CHOICE (keep the one you
// use, see what cancelling the rest saves), never as "cancel the cheaper one".
// Duplicates and bundle facts stay as simple single-subscription findings.
// Free tier sees the number + count; Pro sees the groups, findings, and cancel
// guidance. (AI-reasoned picks are v2.)

export type FindingKind = "duplicate" | "bundle";
export interface Finding {
  key: string;
  subId: string;
  kind: FindingKind;
  label: string;
  detail: string;
  annualSaving: number;
  tone: "mint" | "amber";
}

export interface OverlapMember {
  subId: string;
  name: string;
  annual: number;
}
export interface KeepOption {
  keepSubId: string;
  keepName: string;
  /** $/yr freed if you keep this one and cancel the rest of the group. */
  save: number;
}
export interface OverlapGroup {
  key: string;
  category: string;
  members: OverlapMember[];
  keepOptions: KeepOption[];
  total: number;
  /** Best-case annual saving (keep the cheapest, cancel the rest). */
  bestSave: number;
}

export interface FoundResult {
  /** "Up to" annual savings — choice-dependent, so headline it as "up to". */
  annualSavings: number;
  findings: Finding[];
  groups: OverlapGroup[];
  /** subId → short neutral flag for the list/detail ("1 of 3 AI tools"). */
  flagged: Record<string, string>;
  /** Number of opportunities (findings + groups). */
  count: number;
}

const monthlyOf = (s: Subscription) =>
  getMonthlyEquivalent(s.price, s.billingCycle ?? "monthly", s.customIntervalDays);
const annualOf = (s: Subscription) => monthlyOf(s) * 12;
const categoryOf = (s: Subscription): string =>
  s.category?.trim() || s.plan?.trim() || "Uncategorized";
const norm = (v: string) => normalizeName(v);

const groupBy = <K>(items: Subscription[], keyFn: (s: Subscription) => K) => {
  const m = new Map<K, Subscription[]>();
  for (const s of items) {
    const list = m.get(keyFn(s));
    if (list) list.push(s);
    else m.set(keyFn(s), [s]);
  }
  return m;
};

export function computeFound(
  subs: Subscription[],
  keptSubIds?: Set<string>,
): FoundResult {
  const paying = subs.filter(
    (s) =>
      (s.status ?? "active") === "active" &&
      !s.isTrial &&
      !keptSubIds?.has(s.id),
  );

  const claimed = new Set<string>(); // subs already explained by a finding
  const findings: Finding[] = [];

  // 1. Exact duplicates — keep the priciest, the rest are clear cuts.
  for (const [, dupes] of groupBy(paying, (s) => norm(s.name))) {
    if (dupes.length < 2) continue;
    const [keep, ...rest] = [...dupes].sort((a, b) => monthlyOf(b) - monthlyOf(a));
    for (const s of rest) {
      claimed.add(s.id);
      findings.push({
        key: `dup-${s.id}`,
        subId: s.id,
        kind: "duplicate",
        label: s.name,
        detail: `Duplicate of ${keep.name}`,
        annualSaving: annualOf(s),
        tone: "amber",
      });
    }
  }

  // 2. Bundle facts — already included in something else they pay for.
  const findByName = (needle: string) =>
    paying.find((s) => !claimed.has(s.id) && norm(s.name).includes(norm(needle)));
  for (const fact of BUNDLE_FACTS) {
    const redundant = findByName(fact.redundant);
    if (redundant && findByName(fact.includedIn)) {
      claimed.add(redundant.id);
      findings.push({
        key: `bundle-${redundant.id}`,
        subId: redundant.id,
        kind: "bundle",
        label: redundant.name,
        detail: fact.note,
        annualSaving: annualOf(redundant),
        tone: "mint",
      });
    }
  }

  // 3. Category overlaps → a keep-one DECISION (choice-dependent savings).
  const groups: OverlapGroup[] = [];
  for (const [cat, list] of groupBy(
    paying.filter((s) => !claimed.has(s.id)),
    categoryOf,
  )) {
    if (list.length < 2 || cat === "Uncategorized") continue;
    const members: OverlapMember[] = list
      .map((s) => ({ subId: s.id, name: s.name, annual: annualOf(s) }))
      .sort((a, b) => b.annual - a.annual);
    const total = members.reduce((sum, m) => sum + m.annual, 0);
    const cheapest = Math.min(...members.map((m) => m.annual));
    groups.push({
      key: `ovl-${cat}`,
      category: cat,
      members,
      total,
      bestSave: total - cheapest,
      keepOptions: members.map((m) => ({
        keepSubId: m.subId,
        keepName: m.name,
        save: total - m.annual,
      })),
    });
    for (const m of members) claimed.add(m.subId);
  }

  // Flags + headline.
  const flagged: Record<string, string> = {};
  for (const f of findings) flagged[f.subId] = f.detail;
  for (const g of groups)
    for (const m of g.members)
      flagged[m.subId] = `1 of ${g.members.length} ${g.category}`;

  const annualSavings =
    findings.reduce((sum, f) => sum + f.annualSaving, 0) +
    groups.reduce((sum, g) => sum + g.bestSave, 0);

  return {
    annualSavings,
    findings: findings.sort((a, b) => b.annualSaving - a.annualSaving),
    groups: groups.sort((a, b) => b.bestSave - a.bestSave),
    flagged,
    count: findings.length + groups.length,
  };
}
