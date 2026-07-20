import { BRAND_ICONS, type BrandIcon } from "@/constants/brandIcons";

// Precompute a keyword lookup, longest-keyword-first so "apple music" wins
// over "apple" and specific brands beat generic ones.
const KEYWORD_ENTRIES: { keyword: string; icon: BrandIcon }[] = BRAND_ICONS.flatMap(
  (icon) => icon.keywords.map((keyword) => ({ keyword, icon })),
).sort((a, b) => b.keyword.length - a.keyword.length);

/** Finds a bundled brand icon whose keyword appears in the subscription name. */
export const resolveBrandIcon = (name: string): BrandIcon | null => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  for (const { keyword, icon } of KEYWORD_ENTRIES) {
    if (normalized.includes(keyword)) return icon;
  }
  return null;
};

/** Relative luminance (0–1) of a 6-digit hex, for contrast decisions. */
export const luminance = (hex: string): number => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const LIGHT_GLYPH = "#FFFFFF";
const DARK_GLYPH = "#081126";
const NAVY_TILE = "#131A2E";

/** Deterministic palette color for monogram tiles (no brand match). */
const MONOGRAM_PALETTE = [
  "#EA7A53",
  "#4ADE9C",
  "#7DA7F4",
  "#F5C542",
  "#C58AF9",
  "#F78FB3",
  "#5AC8C8",
  "#F4B860",
];

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export interface IconVisual {
  /** Tile background color (hex with #). */
  background: string;
  /** Glyph/letter color (hex with #). */
  glyph: string;
  /** Raw mono SVG when a brand logo is available, else null (use monogram). */
  svg: string | null;
  /** First letter for the monogram fallback. */
  monogram: string;
}

const paletteFor = (name: string) =>
  MONOGRAM_PALETTE[hashString(name) % MONOGRAM_PALETTE.length];

/**
 * Resolves the consistent tile visual for a subscription name: a brand logo on
 * its brand color when known, otherwise a colored monogram. Every icon shares
 * the same rounded-tile treatment; only the panel color varies.
 *
 * - simple-icons brands carry an official hex → tile uses it (flipping to a
 *   navy tile with a colored glyph for near-white brands so it stays visible).
 * - Lobe AI brands have no hex → tile uses a deterministic palette color.
 * - No match → monogram on a palette color.
 */
export const getIconVisual = (name: string): IconVisual => {
  const monogram = name.trim().charAt(0).toUpperCase() || "?";
  const brand = resolveBrandIcon(name);

  if (brand) {
    if (brand.hex) {
      const background = `#${brand.hex}`;
      if (luminance(background) > 0.8) {
        return { background: NAVY_TILE, glyph: background, svg: brand.svg, monogram };
      }
      return {
        background,
        glyph: luminance(background) > 0.55 ? DARK_GLYPH : LIGHT_GLYPH,
        svg: brand.svg,
        monogram,
      };
    }
    // Lobe brand (no official color): palette tile + light glyph.
    const background = paletteFor(name);
    return {
      background,
      glyph: luminance(background) > 0.6 ? DARK_GLYPH : LIGHT_GLYPH,
      svg: brand.svg,
      monogram,
    };
  }

  const background = paletteFor(name);
  return {
    background,
    glyph: luminance(background) > 0.6 ? DARK_GLYPH : LIGHT_GLYPH,
    svg: null,
    monogram,
  };
};

/** Mixes a 6-digit hex toward a target hex by `amount` (0–1). */
const mixHex = (hex: string, target: string, amount: number): string => {
  const clean = hex.replace("#", "");
  const t = target.replace("#", "");
  if (clean.length !== 6 || t.length !== 6) return hex;
  const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  const mix = (i: number) =>
    Math.round(ch(clean, i) + (ch(t, i) - ch(clean, i)) * amount);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(0))}${toHex(mix(2))}${toHex(mix(4))}`;
};

/** Mixes a hex toward white by `whiteMix` (0–1) — kept for back-compat. */
export const tintColor = (hex: string, whiteMix = 0.85): string =>
  mixHex(hex, "#ffffff", whiteMix);

/**
 * A soft, distinct panel tint for a subscription so every card keeps its own
 * recognisable colour (aids scanning/recall). Theme-aware: a light wash toward
 * white in light mode, or a subtle brand-tinted dark surface in dark mode
 * (mixed toward the raised token) so cards never turn near-white on dark.
 */
export const cardTint = (
  name: string,
  scheme: "light" | "dark" = "light",
): string => {
  const bg = getIconVisual(name).background;
  return scheme === "dark"
    ? mixHex(bg, "#221d34", 0.82)
    : mixHex(bg, "#ffffff", 0.85);
};
