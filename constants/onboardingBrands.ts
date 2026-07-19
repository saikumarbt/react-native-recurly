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
  steam: { price: 9.99, category: "Gaming" },
  discord: { price: 9.99, category: "Entertainment" },
  roblox: { price: 4.99, category: "Gaming" },
  playstation: { price: 9.99, category: "Gaming" },
  "epic games": { price: 11.99, category: "Gaming" },
  ea: { price: 4.99, category: "Gaming" },
  ubisoft: { price: 17.99, category: "Gaming" },
  nvidia: { price: 9.99, category: "Gaming" },
  "humble bundle": { price: 11.99, category: "Gaming" },
  coursera: { price: 59, category: "Productivity" },
  udemy: { price: 20, category: "Productivity" },
  duolingo: { price: 12.99, category: "Productivity" },
  skillshare: { price: 14, category: "Productivity" },
  icloud: { price: 2.99, category: "Cloud" },
  // AI tools (Lobe-sourced brands + others without a descriptive keyword)
  "hugging face": { price: 9, category: "AI Tools" },
  lovable: { price: 20, category: "AI Tools" },
  v0: { price: 20, category: "AI Tools" },
  krea: { price: 10, category: "AI Tools" },
  replicate: { price: 10, category: "AI Tools" },
  ideogram: { price: 8, category: "AI Tools" },
  luma: { price: 10, category: "AI Tools" },
  grok: { price: 8, category: "AI Tools" },
  deepseek: { price: 10, category: "AI Tools" },
  mistral: { price: 15, category: "AI Tools" },
  pika: { price: 10, category: "AI Tools" },
  flux: { price: 10, category: "AI Tools" },
  kling: { price: 10, category: "AI Tools" },
  // Productivity / developer tools without descriptive keywords
  trello: { price: 5, category: "Productivity" },
  asana: { price: 10.99, category: "Productivity" },
  linear: { price: 8, category: "Productivity" },
  obsidian: { price: 4, category: "Productivity" },
  evernote: { price: 14.99, category: "Productivity" },
  todoist: { price: 4, category: "Productivity" },
  netlify: { price: 19, category: "Developer Tools" },
  cloudflare: { price: 5, category: "Developer Tools" },
  digitalocean: { price: 12, category: "Developer Tools" },
  replit: { price: 20, category: "Developer Tools" },
  google: { price: 1.99, category: "Cloud" },
  sky: { price: 30, category: "Entertainment" },
  // Health & fitness
  peloton: { price: 12.99, category: "Health & Fitness" },
  strava: { price: 11.99, category: "Health & Fitness" },
  fitbit: { price: 9.99, category: "Health & Fitness" },
  headspace: { price: 12.99, category: "Health & Fitness" },
  // Food & delivery
  hellofresh: { price: 59.99, category: "Food & Delivery" },
  doordash: { price: 9.99, category: "Food & Delivery" },
  "uber eats": { price: 9.99, category: "Food & Delivery" },
  deliveroo: { price: 3.49, category: "Food & Delivery" },
  instacart: { price: 9.99, category: "Food & Delivery" },
  "just eat": { price: 9.99, category: "Food & Delivery" },
  zomato: { price: 3.99, category: "Food & Delivery" },
  swiggy: { price: 2.99, category: "Food & Delivery" },
  // Shopping / household
  target: { price: 10.99, category: "Shopping" },
  // Streaming
  "apple tv": { price: 9.99, category: "Entertainment" },
  plex: { price: 4.99, category: "Entertainment" },
  mubi: { price: 12.99, category: "Entertainment" },
  fubo: { price: 79.99, category: "Entertainment" },
  // News & reading
  "new york times": { price: 17, category: "News & Reading" },
  "the guardian": { price: 6.99, category: "News & Reading" },
  // Music
  pandora: { price: 4.99, category: "Music" },
  iheartradio: { price: 9.99, category: "Music" },
  // Cloud & security
  lastpass: { price: 3, category: "Cloud" },
  bitwarden: { price: 1, category: "Cloud" },
  backblaze: { price: 9, category: "Cloud" },
  mega: { price: 11.99, category: "Cloud" },
  surfshark: { price: 12.95, category: "Cloud" },
  mullvad: { price: 5, category: "Cloud" },
  box: { price: 10, category: "Cloud" },
  proton: { price: 9.99, category: "Cloud" },
  // Bills / phone / internet
  verizon: { price: 70, category: "Bills & Utilities" },
  vodafone: { price: 30, category: "Bills & Utilities" },
  o2: { price: 20, category: "Bills & Utilities" },
  spectrum: { price: 50, category: "Bills & Utilities" },
  // Cloud & hosting infra
  aws: { price: 50, category: "Developer Tools" },
  azure: { price: 50, category: "Developer Tools" },
  "google cloud": { price: 50, category: "Developer Tools" },
  hostinger: { price: 11.99, category: "Developer Tools" },
  namecheap: { price: 10, category: "Developer Tools" },
  godaddy: { price: 12, category: "Developer Tools" },
  vultr: { price: 10, category: "Developer Tools" },
  render: { price: 19, category: "Developer Tools" },
  railway: { price: 5, category: "Developer Tools" },
  supabase: { price: 25, category: "Developer Tools" },
  firebase: { price: 25, category: "Developer Tools" },
  mongodb: { price: 9, category: "Developer Tools" },
  planetscale: { price: 39, category: "Developer Tools" },
  // Generic day-to-day categories (glyph tiles)
  "rent / housing": { price: 1200, category: "Bills & Utilities" },
  utilities: { price: 120, category: "Bills & Utilities" },
  "mobile / phone": { price: 40, category: "Bills & Utilities" },
  internet: { price: 50, category: "Bills & Utilities" },
  insurance: { price: 100, category: "Bills & Utilities" },
  gym: { price: 40, category: "Health & Fitness" },
  transport: { price: 80, category: "Bills & Utilities" },
  streaming: { price: 15, category: "Entertainment" },
  // Big brands with no logo yet (glyph stand-in)
  "disney+": { price: 13.99, category: "Entertainment" },
  hulu: { price: 17.99, category: "Entertainment" },
  "prime video": { price: 8.99, category: "Entertainment" },
  peacock: { price: 7.99, category: "Entertainment" },
  canva: { price: 12.99, category: "Design" },
  adobe: { price: 22.99, category: "Design" },
  xbox: { price: 16.99, category: "Gaming" },
  "nintendo switch": { price: 3.99, category: "Gaming" },
  "amazon prime": { price: 14.99, category: "Shopping" },
};

const FALLBACK = { price: 9.99, category: "Other" };

// Display order for the grouped onboarding picker (most commonly-paid-for
// first). Categories not listed here render last, before "Other".
export const ONBOARDING_CATEGORY_ORDER = [
  "Entertainment",
  "Gaming",
  "Music",
  "AI Tools",
  "Productivity",
  "Developer Tools",
  "Design",
  "Health & Fitness",
  "Food & Delivery",
  "News & Reading",
  "Shopping",
  "Cloud",
  "Bills & Utilities",
  "Other",
];

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

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const inferCategory = (icon: {
  title: string;
  keywords?: string[];
}): string => {
  const haystack = [icon.title, ...(icon.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  for (const [category, needles] of CATEGORY_KEYWORDS) {
    // Whole-word match (not substring) so short terms like "git" don't match
    // inside "digital". Needles are already lowercase, as is the haystack.
    if (needles.some((n) => new RegExp(`\\b${escapeRegex(n)}\\b`).test(haystack)))
      return category;
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
