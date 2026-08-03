// Curated, accurate facts the Found engine reasons over. Deterministic, no AI,
// no fabricated prices. Keep entries to stable, well-known truths — when a fact
// stops being true, delete it. Names are matched case-insensitively against the
// normalized subscription name.

/** "You may already have this via another subscription you pay for." */
export const BUNDLE_FACTS: { redundant: string; includedIn: string; note: string }[] = [
  { redundant: "youtube music", includedIn: "youtube premium", note: "YouTube Premium already includes Music" },
  { redundant: "prime video", includedIn: "amazon prime", note: "Amazon Prime already includes Prime Video" },
  { redundant: "apple music", includedIn: "apple one", note: "Apple One bundles Music, TV+ and iCloud" },
  { redundant: "apple tv", includedIn: "apple one", note: "Apple One bundles Music, TV+ and iCloud" },
  { redundant: "icloud", includedIn: "apple one", note: "Apple One includes iCloud+ storage" },
];

/** Categories where paying for more than one usually means overlap worth reviewing. */
export const OVERLAP_CATEGORIES = [
  "Entertainment",
  "Music",
  "AI tools",
  "Streaming",
  "Video",
  "Cloud",
];
