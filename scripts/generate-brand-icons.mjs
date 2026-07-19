// Build-time generator: emits a curated, offline brand-icon dataset
// (constants/brandIcons.ts) from two sources, both consumed as build-time data
// (never bundled wholesale, no runtime network):
//   1. simple-icons — mainstream brands (official brand color available)
//   2. @lobehub/icons-static-svg — AI-tool brands simple-icons lacks
// Re-run after editing the lists:  node scripts/generate-brand-icons.mjs
import * as si from "simple-icons";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const LOBE_DIR = join(
  here,
  "..",
  "node_modules",
  "@lobehub",
  "icons-static-svg",
  "icons",
);

// --- Simple Icons: mainstream subscription brands (with brand hex) ----------
const SIMPLE_WANT = [
  { slug: "netflix" },
  { slug: "youtube", keywords: ["youtube premium", "yt"] },
  { slug: "youtubemusic" },
  { slug: "hbo", keywords: ["max", "hbo max"] },
  { slug: "crunchyroll" },
  { slug: "twitch" },
  { slug: "paramountplus", keywords: ["paramount"] },
  { slug: "sky", keywords: ["sky tv"] },
  { slug: "spotify" },
  { slug: "applemusic", keywords: ["apple music"] },
  { slug: "tidal" },
  { slug: "deezer" },
  { slug: "soundcloud" },
  { slug: "audible" },
  { slug: "anthropic", keywords: ["claude"] },
  { slug: "perplexity" },
  { slug: "githubcopilot", keywords: ["copilot"] },
  { slug: "googlegemini", keywords: ["gemini"] },
  { slug: "huggingface" },
  { slug: "notion" },
  { slug: "github" },
  { slug: "gitlab" },
  { slug: "figma" },
  { slug: "zoom" },
  { slug: "dropbox" },
  { slug: "googledrive", keywords: ["google drive", "google one", "googleone"] },
  { slug: "trello" },
  { slug: "asana" },
  { slug: "linear" },
  { slug: "obsidian" },
  { slug: "evernote" },
  { slug: "todoist" },
  { slug: "grammarly" },
  { slug: "vercel" },
  { slug: "netlify" },
  { slug: "cloudflare" },
  { slug: "digitalocean" },
  { slug: "jetbrains" },
  { slug: "replit" },
  { slug: "medium" },
  { slug: "substack" },
  { slug: "patreon" },
  { slug: "x", keywords: ["twitter", "x premium"] },
  { slug: "1password", keywords: ["one password"] },
  { slug: "dashlane" },
  { slug: "nordvpn", keywords: ["nord vpn", "nord"] },
  { slug: "expressvpn", keywords: ["express vpn"] },
  { slug: "protonvpn", keywords: ["proton"] },
  { slug: "steam" },
  { slug: "epicgames", keywords: ["epic games"] },
  { slug: "playstation", keywords: ["ps plus", "playstation plus"] },
  { slug: "discord", keywords: ["discord nitro", "nitro"] },
  { slug: "roblox" },
  { slug: "coursera" },
  { slug: "udemy" },
  { slug: "duolingo" },
  { slug: "skillshare" },
  { slug: "icloud", keywords: ["apple icloud", "icloud+"] },
  { slug: "google" },

  // --- Health & fitness -----------------------------------------------------
  { slug: "peloton", keywords: ["peloton app"] },
  { slug: "strava" },
  { slug: "fitbit", keywords: ["fitbit premium"] },
  { slug: "headspace" },

  // --- Food & delivery ------------------------------------------------------
  { slug: "hellofresh", keywords: ["hello fresh", "meal kit"] },
  { slug: "doordash", keywords: ["dashpass", "door dash"] },
  { slug: "ubereats", keywords: ["uber one", "uber eats"] },
  { slug: "deliveroo", keywords: ["deliveroo plus"] },
  { slug: "instacart", keywords: ["instacart+"] },
  { slug: "justeat", keywords: ["just eat"] },
  { slug: "zomato", keywords: ["zomato gold"] },
  { slug: "swiggy", keywords: ["swiggy one"] },

  // --- Shopping / household -------------------------------------------------
  { slug: "target", keywords: ["target circle", "circle 360"] },

  // --- More streaming (that still ship a logo) ------------------------------
  { slug: "appletv", keywords: ["apple tv", "apple tv+", "apple tv plus"] },
  { slug: "plex", keywords: ["plex pass"] },
  { slug: "mubi" },
  { slug: "fubo", keywords: ["fubotv", "fubo tv"] },

  // --- News & reading -------------------------------------------------------
  { slug: "newyorktimes", keywords: ["nyt", "ny times", "new york times"] },
  { slug: "theguardian", keywords: ["guardian"] },

  // --- More music -----------------------------------------------------------
  { slug: "pandora" },
  { slug: "iheartradio", keywords: ["iheart", "iheart radio"] },

  // --- Cloud & security -----------------------------------------------------
  { slug: "lastpass", keywords: ["last pass"] },
  { slug: "bitwarden" },
  { slug: "backblaze" },
  { slug: "mega" },
  { slug: "surfshark", keywords: ["surf shark", "vpn"] },
  { slug: "mullvad", keywords: ["mullvad vpn"] },
  { slug: "box", keywords: ["box.com"] },
  { slug: "proton", keywords: ["proton mail", "proton drive", "proton unlimited"] },

  // --- Gaming ---------------------------------------------------------------
  { slug: "ea", keywords: ["ea play", "ea sports"] },
  { slug: "ubisoft", keywords: ["ubisoft+", "ubisoft plus"] },
  { slug: "nvidia", keywords: ["geforce now", "geforce"] },
  { slug: "humblebundle", keywords: ["humble choice", "humble bundle"] },

  // --- Bills / phone / internet ---------------------------------------------
  { slug: "verizon" },
  { slug: "vodafone" },
  { slug: "o2" },
  { slug: "spectrum" },

  // --- Cloud & hosting infra (dev/freelancer wedge) -------------------------
  { slug: "googlecloud", keywords: ["gcp", "google cloud platform"] },
  { slug: "hostinger" },
  { slug: "namecheap" },
  { slug: "godaddy" },
  { slug: "vultr" },
  { slug: "render" },
  { slug: "railway" },
  { slug: "supabase" },
  { slug: "firebase" },
  { slug: "mongodb", keywords: ["mongodb atlas", "atlas"] },
  { slug: "planetscale" },
];

// --- Lobe: AI-tool brands (mono SVG, no brand hex → name-derived tile) -------
const LOBE_WANT = [
  { slug: "openai", keywords: ["chatgpt", "gpt", "chat gpt"] },
  { slug: "midjourney" },
  { slug: "cursor" },
  { slug: "lovable" },
  { slug: "v0", keywords: ["v0.dev"] },
  { slug: "krea" },
  { slug: "runway", keywords: ["runwayml"] },
  { slug: "suno" },
  { slug: "elevenlabs", keywords: ["eleven labs", "11labs"] },
  { slug: "replicate" },
  { slug: "ideogram" },
  { slug: "luma", keywords: ["luma ai", "dream machine"] },
  { slug: "grok" },
  { slug: "deepseek" },
  { slug: "mistral" },
  { slug: "leonardo", keywords: ["leonardo ai"] },
  { slug: "pika" },
  { slug: "flux" },
  { slug: "kling" },
  // Cloud providers simple-icons dropped (trademark) — Lobe still ships them.
  { slug: "aws", keywords: ["amazon web services"] },
  { slug: "azure", keywords: ["microsoft azure"] },
];

// --- Lucide: generic category glyphs + logo-less big brands -----------------
// Outline glyphs (currentColor) for day-to-day categories with no brand, and a
// themed stand-in for big brands neither source ships a logo for (this
// release). hex is the tile colour; keywords stay specific to avoid greedy
// substring matches in the name resolver.
const LUCIDE_DIR = join(
  here,
  "..",
  "node_modules",
  "lucide-static",
  "icons",
);

const GLYPH_WANT = [
  // Generic day-to-day categories (no brand identity)
  { icon: "house", title: "Rent / Housing", hex: "E0952F", keywords: ["rent", "mortgage", "housing"] },
  { icon: "zap", title: "Utilities", hex: "F4B860", keywords: ["utilities", "utility bill", "electricity", "energy bill"] },
  { icon: "smartphone", title: "Mobile / Phone", hex: "7DA7F4", keywords: ["mobile plan", "phone plan", "cell plan", "carrier"] },
  { icon: "wifi", title: "Internet", hex: "5AC8C8", keywords: ["internet", "broadband", "home wifi", "fibre plan"] },
  { icon: "shield-check", title: "Insurance", hex: "16A34A", keywords: ["insurance", "policy"] },
  { icon: "dumbbell", title: "Gym", hex: "EA7A53", keywords: ["gym", "fitness membership", "workout"] },
  { icon: "bus", title: "Transport", hex: "C58AF9", keywords: ["transport pass", "commute", "transit", "metro card"] },
  { icon: "tv", title: "Streaming", hex: "F78FB3", keywords: ["streaming"] },
  // Big brands neither simple-icons nor Lobe ships a logo for — themed glyph.
  { icon: "clapperboard", title: "Disney+", hex: "113CCF", keywords: ["disney", "disney plus", "disney+"] },
  { icon: "clapperboard", title: "Hulu", hex: "1CE783", keywords: ["hulu"] },
  { icon: "clapperboard", title: "Prime Video", hex: "00A8E1", keywords: ["prime video", "amazon prime video"] },
  { icon: "tv", title: "Peacock", hex: "05A18F", keywords: ["peacock"] },
  { icon: "palette", title: "Canva", hex: "00C4CC", keywords: ["canva"] },
  { icon: "palette", title: "Adobe", hex: "FA0F00", keywords: ["adobe", "creative cloud", "photoshop"] },
  { icon: "gamepad-2", title: "Xbox", hex: "107C10", keywords: ["xbox", "game pass"] },
  { icon: "gamepad-2", title: "Nintendo Switch", hex: "E60012", keywords: ["nintendo", "switch online"] },
  { icon: "package", title: "Amazon Prime", hex: "FF9900", keywords: ["amazon prime"] },
];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const bySlug = {};
for (const value of Object.values(si)) {
  if (value && value.slug) bySlug[value.slug] = value;
}

const buildKeywords = (title, slug, extra = []) =>
  Array.from(
    new Set([title.toLowerCase(), slug, ...extra].map((k) => k.toLowerCase())),
  );

const entries = [];
const missing = [];

for (const want of SIMPLE_WANT) {
  const icon = bySlug[want.slug];
  if (!icon) {
    missing.push(`si:${want.slug}`);
    continue;
  }
  entries.push({
    slug: want.slug,
    title: icon.title,
    hex: icon.hex,
    svg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="${icon.path}"/></svg>`,
    keywords: buildKeywords(icon.title, want.slug, want.keywords),
  });
}

for (const want of LOBE_WANT) {
  let svg;
  try {
    svg = readFileSync(join(LOBE_DIR, `${want.slug}.svg`), "utf8").trim();
  } catch {
    missing.push(`lobe:${want.slug}`);
    continue;
  }
  const title = svg.match(/<title>(.*?)<\/title>/)?.[1] ?? want.slug;
  entries.push({
    slug: want.slug,
    title,
    hex: null,
    svg,
    keywords: buildKeywords(title, want.slug, want.keywords),
  });
}

for (const want of GLYPH_WANT) {
  let raw;
  try {
    raw = readFileSync(join(LUCIDE_DIR, `${want.icon}.svg`), "utf8");
  } catch {
    missing.push(`lucide:${want.icon}`);
    continue;
  }
  // Drop the license comment and collapse whitespace to a single-line SVG.
  const svg = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
  entries.push({
    slug: `glyph-${slugify(want.title)}`,
    title: want.title,
    hex: want.hex,
    svg,
    keywords: buildKeywords(want.title, `glyph-${want.icon}`, want.keywords),
  });
}

if (missing.length) console.warn("Skipped:", missing.join(", "));

const header = `// AUTO-GENERATED by scripts/generate-brand-icons.mjs — do not edit by hand.
// Sources: simple-icons + @lobehub/icons-static-svg (build-time only).

export interface BrandIcon {
  slug: string;
  title: string;
  /** Official brand color (6-digit hex, no '#') when known, else null. */
  hex: string | null;
  /** Raw mono SVG (24x24, currentColor) rendered via react-native-svg. */
  svg: string;
  /** Lowercased match aliases. */
  keywords: string[];
}

export const BRAND_ICONS: BrandIcon[] = ${JSON.stringify(entries, null, 2)};
`;

writeFileSync(join(here, "..", "constants", "brandIcons.ts"), header, "utf8");
console.log(`Wrote ${entries.length} brand icons to constants/brandIcons.ts`);
