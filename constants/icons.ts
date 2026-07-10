import activity from "@/assets/icons/activity.png";
import add from "@/assets/icons/add.png";
import back from "@/assets/icons/back.png";
import home from "@/assets/icons/home.png";
import menu from "@/assets/icons/menu.png";
import plus from "@/assets/icons/plus.png";
import setting from "@/assets/icons/setting.png";
import wallet from "@/assets/icons/wallet.png";

// UI glyphs only. Subscription brand logos are resolved by name via
// components/SubscriptionIcon (simple-icons + Lobe vector data), not PNGs.
export const icons = {
  home,
  wallet,
  setting,
  activity,
  add,
  back,
  menu,
  plus,
} as const;

export type IconKey = keyof typeof icons;
