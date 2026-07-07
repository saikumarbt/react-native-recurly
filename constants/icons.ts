import activity from "@/assets/icons/activity.png";
import add from "@/assets/icons/add.png";
import adobe from "@/assets/icons/adobe.png";
import back from "@/assets/icons/back.png";
import canva from "@/assets/icons/canva.png";
import claude from "@/assets/icons/claude.png";
import dropbox from "@/assets/icons/dropbox.png";
import figma from "@/assets/icons/figma.png";
import github from "@/assets/icons/github.png";
import home from "@/assets/icons/home.png";
import medium from "@/assets/icons/medium.png";
import menu from "@/assets/icons/menu.png";
import netflix from "@/assets/icons/netflix.png";
import notion from "@/assets/icons/notion.png";
import openai from "@/assets/icons/openai.png";
import plus from "@/assets/icons/plus.png";
import setting from "@/assets/icons/setting.png";
import spotify from "@/assets/icons/spotify.png";
import wallet from "@/assets/icons/wallet.png";
import type { ImageSourcePropType } from "react-native";

export const icons = {
  home,
  wallet,
  setting,
  activity,
  add,
  back,
  menu,
  plus,
  netflix,
  notion,
  dropbox,
  openai,
  adobe,
  medium,
  figma,
  spotify,
  github,
  claude,
  canva,
} as const;

export type IconKey = keyof typeof icons;

/**
 * Maps keywords found in a subscription name to a bundled brand icon.
 * Order does not matter since keywords are distinct brand names.
 */
const SUBSCRIPTION_ICON_KEYWORDS: { keyword: string; icon: IconKey }[] = [
  { keyword: "netflix", icon: "netflix" },
  { keyword: "spotify", icon: "spotify" },
  { keyword: "notion", icon: "notion" },
  { keyword: "figma", icon: "figma" },
  { keyword: "github", icon: "github" },
  { keyword: "claude", icon: "claude" },
  { keyword: "canva", icon: "canva" },
  { keyword: "adobe", icon: "adobe" },
  { keyword: "dropbox", icon: "dropbox" },
  { keyword: "openai", icon: "openai" },
  { keyword: "chatgpt", icon: "openai" },
  { keyword: "medium", icon: "medium" },
];

/**
 * Resolves a brand icon from a subscription name (case-insensitive substring
 * match). Falls back to the generic wallet icon when no brand matches.
 */
export const resolveSubscriptionIcon = (
  name: string,
): ImageSourcePropType => {
  const normalized = name.trim().toLowerCase();
  const match = SUBSCRIPTION_ICON_KEYWORDS.find(({ keyword }) =>
    normalized.includes(keyword),
  );
  return match ? icons[match.icon] : icons.wallet;
};
