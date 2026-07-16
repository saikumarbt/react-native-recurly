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

/** Mixes a hex toward white by `whiteMix` (0–1) — for soft, tinted panels. */
export const tintColor = (hex: string, whiteMix = 0.85): string => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const ch = (i: number) => parseInt(clean.slice(i, i + 2), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * whiteMix);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(ch(0)))}${toHex(mix(ch(2)))}${toHex(mix(ch(4)))}`;
};

/**
 * A soft, distinct panel tint for a subscription — a light wash of its brand
 * color. Gives every card its own recognisable color (Netflix pink-ish,
 * Spotify green-ish), which aids scanning and recall (colour-coding), while
 * staying subtle enough to read text on.
 */
export const cardTint = (name: string): string =>
  tintColor(getIconVisual(name).background);
