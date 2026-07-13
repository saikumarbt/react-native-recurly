// Popular subscriptions offered as quick-add tiles during onboarding. Titles
// match brand-icon keywords so SubscriptionIcon renders the right logo. Prices
// are editable starting defaults (indicative monthly, in the user's base
// currency) — the user confirms/adjusts before adding.
export interface OnboardingBrand {
  title: string;
  price: number;
  category: string;
}

export const ONBOARDING_BRANDS: OnboardingBrand[] = [
  { title: "Netflix", price: 15.49, category: "Entertainment" },
  { title: "Spotify", price: 11.99, category: "Music" },
  { title: "YouTube Premium", price: 13.99, category: "Entertainment" },
  { title: "Apple Music", price: 10.99, category: "Music" },
  { title: "iCloud+", price: 2.99, category: "Cloud" },
  { title: "ChatGPT", price: 20, category: "AI Tools" },
  { title: "Claude", price: 20, category: "AI Tools" },
  { title: "Perplexity", price: 20, category: "AI Tools" },
  { title: "Cursor", price: 20, category: "AI Tools" },
  { title: "Gemini", price: 19.99, category: "AI Tools" },
  { title: "Midjourney", price: 10, category: "AI Tools" },
  { title: "Notion", price: 10, category: "Productivity" },
  { title: "GitHub", price: 4, category: "Developer Tools" },
  { title: "Figma", price: 12, category: "Design" },
  { title: "Dropbox", price: 11.99, category: "Cloud" },
  { title: "Grammarly", price: 12, category: "Productivity" },
  { title: "Audible", price: 14.95, category: "Music" },
  { title: "Discord Nitro", price: 9.99, category: "Entertainment" },
];
