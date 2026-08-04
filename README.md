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

### Run on a physical device via a secure tunnel (dev build)

Use a **tunnel** when your phone and computer aren't on the same Wi‑Fi (or a
corporate/campus network blocks LAN connections, or USB won't cooperate). It
routes the Metro bundler through a public **ngrok** URL that your device can
always reach. This serves the JS bundle to your **installed dev build** — not
Expo Go (RevenueCat purchases still need the native dev build; see Prerequisites).

**One-time setup:**

1. **Install the tunnel backend** (Expo uses `@expo/ngrok`). Either accept the
   CLI prompt the first time you pass `--tunnel`, or install it up front:

   ```bash
   npx expo install @expo/ngrok
   ```

2. **Create a free ngrok account** and grab an authtoken (current ngrok requires
   one):
   - Sign up: <https://dashboard.ngrok.com/signup>
   - Copy your token: <https://dashboard.ngrok.com/get-started/your-authtoken>

3. **Register the authtoken** so the tunnel can authenticate. Either write it to
   the ngrok config once:

   ```bash
   npx ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
   ```

   …or export it as an environment variable that Expo's tunnel reads
   (`NGROK_AUTHTOKEN`) — e.g. add `NGROK_AUTHTOKEN=<token>` to your shell profile
   or `.env.local`.

**Start the tunnel:**

```bash
npx expo start --tunnel --clear -c --dev-client
```

Flag reference:

- `--tunnel` — serve over a public ngrok URL (`*.exp.direct`) instead of LAN.
- `--clear` / `-c` — clear the Metro bundler cache (both do the same; either is fine).
- `--dev-client` — open in the installed **development build**, not Expo Go.

Then scan the QR from your dev build's launcher screen (or press **a**/**i** for
an emulator/simulator on the same machine).

**Troubleshooting:**

- "Install `@expo/ngrok`?" prompt → answer **yes** (or run the install in step 1).
- Tunnel won't connect / "ngrok authtoken" error → re-check step 3 (the token
  must be registered); some corporate VPNs/firewalls block ngrok entirely.
- Still stuck? Fall back to `npx expo start --dev-client` on the same Wi‑Fi.

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

## 🎨 Design System

[`myrev-design-system.html`](./myrev-design-system.html) is the single source of
truth for the spec: foundations (tokens, type, spacing), the component library,
every screen (light/dark, free + Pro v1), the state matrix, flows, navigation,
copy deck, and the analytics event map. **Code is the source of truth for built
screens; the doc maps each to its route + RN file** (anti-drift). Open it in any
browser.

---

## 📚 Learn More

- [Expo Documentation](https://docs.expo.dev/versions/v54.0.0/)
- [NativeWind Docs](https://nativewind.dev/)
- [Clerk Docs](https://clerk.dev/docs)
- [PostHog Docs](https://posthog.com/docs)

---

_myrev — by Zerohaus._
