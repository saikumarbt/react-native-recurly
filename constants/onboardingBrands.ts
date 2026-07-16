import { BRAND_ICONS } from "@/constants/brandIcons";

// Onboarding quick-add tiles: every brand we have an icon for. Titles match
// SubscriptionIcon so the real logo renders. Prices are editable starting
// defaults (indicative monthly, in the user's base currency); the user
// confirms/adjusts before adding.
export interface OnboardingBrand {
  title: string;
  price: number;
  category: string;
}

// Known indicative monthly prices for popular services, keyed by lowercased
// brand title. Anything not listed falls back to a generic default.
const DEFAULTS: Record<string, { price: number; category: string }> = {
  netflix: { price: 15.49, category: "Entertainment" },
  youtube: { price: 13.99, category: "Entertainment" },
  "youtube music": { price: 10.99, category: "Music" },
  hbo: { price: 15.99, category: "Entertainment" },
  crunchyroll: { price: 7.99, category: "Entertainment" },
  twitch: { price: 8.99, category: "Entertainment" },
  "paramount+": { price: 11.99, category: "Entertainment" },
  spotify: { price: 11.99, category: "Music" },
  "apple music": { price: 10.99, category: "Music" },
  tidal: { price: 10.99, category: "Music" },
  deezer: { price: 11.99, category: "Music" },
  soundcloud: { price: 12.5, category: "Music" },
  audible: { price: 14.95, category: "Music" },
  anthropic: { price: 20, category: "AI Tools" },
  claude: { price: 20, category: "AI Tools" },
  openai: { price: 20, category: "AI Tools" },
  chatgpt: { price: 20, category: "AI Tools" },
  perplexity: { price: 20, category: "AI Tools" },
  "github copilot": { price: 10, category: "AI Tools" },
  "google gemini": { price: 19.99, category: "AI Tools" },
  gemini: { price: 19.99, category: "AI Tools" },
  cursor: { price: 20, category: "AI Tools" },
  midjourney: { price: 10, category: "AI Tools" },
  runway: { price: 15, category: "AI Tools" },
  suno: { price: 10, category: "AI Tools" },
  elevenlabs: { price: 5, category: "AI Tools" },
  notion: { price: 10, category: "Productivity" },
  github: { price: 4, category: "Developer Tools" },
  gitlab: { price: 29, category: "Developer Tools" },
  figma: { price: 12, category: "Design" },
  zoom: { price: 13.99, category: "Productivity" },
  dropbox: { price: 11.99, category: "Cloud" },
  "google drive": { price: 1.99, category: "Cloud" },
  grammarly: { price: 12, category: "Productivity" },
  vercel: { price: 20, category: "Developer Tools" },
  jetbrains: { price: 16.9, category: "Developer Tools" },
  medium: { price: 5, category: "Productivity" },
  substack: { price: 5, category: "Productivity" },
  patreon: { price: 5, category: "Entertainment" },
  x: { price: 8, category: "Entertainment" },
  "1password": { price: 2.99, category: "Cloud" },
  dashlane: { price: 4.99, category: "Cloud" },
  nordvpn: { price: 12.99, category: "Cloud" },
  expressvpn: { price: 12.95, category: "Cloud" },
  protonvpn: { price: 9.99, category: "Cloud" },
  steam: { price: 9.99, category: "Entertainment" },
  discord: { price: 9.99, category: "Entertainment" },
  roblox: { price: 4.99, category: "Entertainment" },
  coursera: { price: 59, category: "Productivity" },
  udemy: { price: 20, category: "Productivity" },
  duolingo: { price: 12.99, category: "Productivity" },
  skillshare: { price: 14, category: "Productivity" },
  icloud: { price: 2.99, category: "Cloud" },
};

const FALLBACK = { price: 9.99, category: "Other" };

// Category buckets inferred from a brand's title + icon keywords when it isn't
// in DEFAULTS — so far fewer services fall back to "Other". Ordered by
// specificity (AI first); needles are phrases/words chosen to avoid false hits.
const CATEGORY_KEYWORDS: [string, string[]][] = [
  [
    "AI Tools",
    [
      "artificial intelligence",
      "large language model",
      "llm",
      "chatbot",
      "generative",
      "machine learning",
    ],
  ],
  ["Music", ["music", "podcast", "audiobook"]],
  [
    "Entertainment",
    [
      "streaming",
      "video",
      "movie",
      "television",
      "gaming",
      "video game",
      "anime",
      "sports",
    ],
  ],
  [
    "Developer Tools",
    [
      "developer",
      "version control",
      "git",
      "devops",
      "hosting",
      "deployment",
      "continuous integration",
      "database",
      "programming",
    ],
  ],
  ["Design", ["graphic design", "design tool", "prototyping", "photo editing"]],
  [
    "Cloud",
    [
      "cloud storage",
      "file storage",
      "backup",
      "vpn",
      "password manager",
      "cybersecurity",
      "file hosting",
    ],
  ],
  [
    "Productivity",
    [
      "productivity",
      "note-taking",
      "word processor",
      "spreadsheet",
      "online learning",
      "e-learning",
      "collaboration",
      "project management",
      "email",
    ],
  ],
];

const inferCategory = (icon: { title: string; keywords: string[] }): string => {
  const haystack = [icon.title, ...icon.keywords].join(" ").toLowerCase();
  for (const [category, needles] of CATEGORY_KEYWORDS) {
    if (needles.some((n) => haystack.includes(n))) return category;
  }
  return FALLBACK.category;
};

// One tile per available brand icon, in the curated icon order (popular first).
// Known brands use their DEFAULTS preset; the rest infer a category from
// keywords so onboarding auto-assigns a sensible category per service.
export const ONBOARDING_BRANDS: OnboardingBrand[] = BRAND_ICONS.map((icon) => {
  const preset = DEFAULTS[icon.title.toLowerCase()];
  return {
    title: icon.title,
    price: preset?.price ?? FALLBACK.price,
    category: preset?.category ?? inferCategory(icon),
  };
});
