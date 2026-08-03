import { normalizeName } from "@/lib/duplicates";

// Curated "how to cancel" directory. Deterministic, no AI. Steps + a deep link
// to each service's cancel page. Anything not listed falls back to a sensible
// generic guide. Keep steps current; when a flow changes, edit the entry.

export interface CancelGuide {
  steps: string[];
  url?: string;
}

const GUIDES: Record<string, CancelGuide> = {
  netflix: {
    steps: ["Open your Account page", "Tap Cancel Membership", "Confirm — you keep access until the period ends"],
    url: "https://www.netflix.com/cancelplan",
  },
  spotify: {
    steps: ["Open your Spotify Account page", "Under Your plan, tap Change plan", "Choose Cancel Premium and confirm"],
    url: "https://www.spotify.com/account/subscription/",
  },
  "youtube premium": {
    steps: ["Open YouTube → Settings → Purchases and memberships", "Tap Manage → Deactivate", "Confirm"],
    url: "https://www.youtube.com/paid_memberships",
  },
  "disney+": {
    steps: ["Open Profile → Account", "Tap your subscription → Cancel Subscription", "Confirm"],
    url: "https://www.disneyplus.com/account/subscription",
  },
  adobe: {
    steps: ["Open account.adobe.com → Plans", "Tap Manage plan → Cancel plan", "Skip the retention offer, then confirm"],
    url: "https://account.adobe.com/plans",
  },
  "chatgpt plus": {
    steps: ["Open ChatGPT → Settings → Subscription", "Tap Manage → Cancel plan", "Confirm"],
    url: "https://chatgpt.com/#settings",
  },
  notion: {
    steps: ["Open Settings → Plans", "Tap Change plan → Downgrade to Free", "Confirm"],
    url: "https://www.notion.so/my-plan",
  },
};

const GENERIC: CancelGuide = {
  steps: [
    "Open the service's website or app and sign in",
    "Go to Account, Billing, or Subscription",
    "Choose Manage plan → Cancel, then confirm",
  ],
};

/** Look up a cancel guide by subscription name, with a generic fallback. */
export function cancelGuideFor(name: string): CancelGuide {
  const key = normalizeName(name);
  const hit = Object.keys(GUIDES).find((k) => key.includes(normalizeName(k)));
  return hit ? GUIDES[hit] : GENERIC;
}
