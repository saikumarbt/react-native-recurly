# myrev

**myrev** — _know what renews._

Track subscriptions, recurring bills, and upcoming payments in one place. myrev is a **local-first, guest-first** mobile app: your data lives on your phone, there's no signup wall to start, and it reminds you before anything renews so a charge never catches you off guard.

---

## ⚙️ Tech Stack

- **React Native + Expo (SDK 54)** — single codebase for iOS & Android, file-based routing via `expo-router`, new architecture enabled.
- **TypeScript** — strict, throughout.
- **NativeWind v5** (Tailwind v4 tokens) — theming via CSS variables with adaptive **light/dark** (see `global.css` + `constants/theme.ts`).
- **expo-sqlite** — on-device, local-first persistence (`db/`), cached by `SubscriptionsContext`.
- **Clerk** — optional authentication (guest-first; sign-in only needed for backup/sync later).
- **expo-notifications** — local renewal + free-trial reminders (no email/server).
- **PostHog** — privacy-safe product analytics (no subscription names/amounts/PII; opt-out in Settings).
- **Reanimated + react-native-svg** — motion (splash, count-ups, sheets); no extra animation libraries.

---

## 🔋 Features

- **Subscription tracking** — add/edit/pause/cancel, categories, brand icons, monthly-equivalent math across all billing cycles.
- **Grouped-by-status list** — Active · On trial · Paused · Cancelled, with per-section totals and a celebrated savings figure.
- **Insights** — spend, category breakdown, next-month projection, savings from cancellations, portfolio.
- **Reminders** — local notifications before renewals and free-trial endings.
- **Single base currency** — amounts entered/shown in one currency (no FX).
- **Adaptive theming** — light / dark / system.
- **Guest-first** — fully usable without an account.
- **myrev Pro (planned)** — unlimited subscriptions, curated savings-knowledge (cheaper plans/bundles), cancel guidance, backup/sync, custom reminders, widgets. (Free tier tracks up to 5 active subscriptions.)

---

## 🤸 Quick Start

### Prerequisites

- **Node.js** (>= 20) and **npm**
- A **native development build** for the full app. `react-native-purchases` (RevenueCat) isn't bundled in Expo Go, so **real purchase / subscription testing requires a dev build** (`eas build --profile development`, or `npx expo run:android` / `run:ios`). `expo-sqlite`, `expo-blur`, and local `expo-notifications` all run in Expo Go, so the rest of the app can be developed there (notifications are local/scheduled only — no push server).

### Install

```bash
npm install
```

### Run

```bash
npx expo start -c
```

Open on a dev build (or press **a**/**i** for an emulator/simulator).

### Environment Variables

Create a `.env` in the project root:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
EXPO_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_RC_API_KEY=your_revenuecat_public_sdk_key
```

### Scripts

```bash
npx expo lint      # ESLint via expo lint
npx tsc --noEmit   # typecheck
npm test           # Jest unit tests
```

---

## 📚 Learn More
- [Expo Documentation](https://docs.expo.dev/versions/v54.0.0/)
- [NativeWind Docs](https://nativewind.dev/)
- [Clerk Docs](https://clerk.dev/docs)
- [PostHog Docs](https://posthog.com/docs)

---

_myrev — by Zerohaus._
