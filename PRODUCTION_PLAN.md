# Production Plan: Course Prototype → Global Subscription-Tracker Business ($30–50k MRR target)

## Context

The app (currently "Recurrly") is a working course-built prototype: Clerk auth, PostHog analytics, subscription CRUD — but **in-memory mock data** (lost on restart), **no backend, no persistence, no EAS config, no bundle IDs, no tests/CI**, unreachable onboarding/detail stubs, and a **course-template design system that hundreds of other students have shipped near-identically** (cream/navy/orange, Plus Jakarta Sans). Goal: a distinctive, production-grade app on both stores, monetized via RevenueCat, targeting **$30–50k MRR** by capturing the segment Rocket Money bleeds and the global market it ignores.

**Locked decisions:** manual-first detection v1 (email-forward Phase 2, Gmail OAuth/CASA gated on revenue, SMS ruled out by policy) · local-first SQLite + paid encrypted sync · freemium + 7-day trial hybrid · **new name** · **new "Midnight Ledger" design system** (replaces course template entirely) · cycles: weekly→annual+custom · global (multi-currency, i18n) · not competing head-on with Rocket Money — capturing ~10% of their equivalent is the win.

---

## 1. The Persona Roundtable (collaborative verdicts)

**🧑‍💻 Solopreneur (ships alone, lives on velocity):**
"The prototype's bones are fine — don't rewrite, *retrofit*. Persistence, CRUD, notifications, paywall: that's the 80%. Every Phase-2+ feature must have a metric gate or it's scope creep. The course design system is actually a *time gift*: NativeWind's class architecture stays, only tokens and component skins change. Biggest solo risk is reminder reliability — it's the one promise that, broken, kills reviews. Budget disproportionate time there. Ship in 8–10 weeks, not 6 months."

**💰 Billionaire mentor (pattern-matcher across winners):**
"You're not building an app, you're buying distribution with a wedge. Rocket Money proved $500k–$1M/mo exists here (360K ratings, 250–500k downloads/mo, ~$2/download). Their moat is bank-linking; their bleed is trust (1.0/5 customer service, surprise fees, cancellation maze). **The wedge: be the app people switch to angry.** 'Rocket Money alternative' is a free customer-acquisition channel they fund with every bad support interaction. Don't chase $1M MRR — chase 10% of their dissatisfied base + the non-US market they structurally can't serve. Own one sentence: *'Your subscriptions, your phone, no bank login.'* Charge less, cancel-anytime in 2 taps, and say so loudly. Money compounds where trust compounds."

**📣 Marketing head:**
"Category keywords are winnable: 'subscription tracker/manager', 'bill reminder', 'rocket money alternative'. The content engine is the product itself: every cancelled subscription is a shareable stat ('I cut $91/mo'). Build the **share card** (money-saved graphic) into the cancel flow from day one — that's the viral loop TikTok's 'subscription audit' format feeds on. Launch sequence: TestFlight beta with 50 Reddit recruits → Product Hunt + Show HN (local-first/E2E angle is HN catnip) → TikTok/Shorts creators in personal-finance niche ($50–200 tests) → ASO iteration. The Midnight Ledger dark aesthetic photographs beautifully in screenshots — lean into 'the finance app that doesn't look like a bank form.' Also: the privacy positioning isn't a feature bullet, it's the *headline*. Nobody else in the category can say it."

**🏗️ Solution architect:**
"Local-first SQLite is the single highest-leverage decision, and the owner's call to run **zero cloud database** takes it further: backups go to the *user's own* iCloud/Google Drive, reports compute on-device, and the only server-side surface is one **stateless Cloudflare Worker** proxying AI calls (key security + rate limiting — never ship API keys in a binary). Nothing for us to patch, scale, back up, or breach. The compliance surface shrinks to analytics + auth. One warning: keep every integration behind an interface (`RatesProvider`, `AIProvider`, later `DetectionSource`) — vendors (FX APIs, Haiku vs GPT-4o-mini, Plaid vs Tink) will change under you; the Worker makes AI providers swappable server-side without app updates."

**🎨 UX head:**
"The course template is a liability beyond looks — it's *recognizable* to every reviewer who's seen the tutorial. Midnight Ledger fixes distinctiveness, but the deeper UX gaps are flows, not paint: (1) there is no **edit** — users' #1 expectation; (2) cancel/delete without undo is data-loss anxiety; (3) empty states are dead ends — every empty screen must teach the next action; (4) the aha-moment is seeing the *monthly total shock* — onboarding must reach it in <60 seconds via brand-template multi-select, before any signup friction; (5) make auth optional (guest mode) — a tracker asking for an account before showing value inverts trust. Gamification must celebrate *not spending* (cancel celebration, savings streaks) — that's emotionally unique; every competitor celebrates organizing."

**⚙️ CTO:**
"Production risks in the current stack, ranked: NativeWind 5 *preview* in production (pin exact, NW4 fallback documented); no crash reporting (Sentry before beta, non-negotiable); reactCompiler experiment (verify release builds, first flag to pull); iOS 64-notification cap (schedule next-occurrence-only + foreground reconciler); SQLite migrations (never ship one without a fixture test — data loss here is unrecoverable brand damage for a local-first app). CI gates from week one: lint, tsc, jest on PR; EAS build on tag. Store compliance is a project, not a checkbox — account deletion (Apple 5.1.1(v)), privacy labels, Play data safety, paywall disclosure rules — budget 1–2 rejection cycles."

---

## 2. What's Already Good (keep it, and why)

| Asset | Why it's genuinely good | Action |
|---|---|---|
| Clerk auth flows (sign-in/up, MFA, secure token cache) | Production-grade auth is weeks of work; done and tested | Keep; make optional (guest mode) |
| PostHog wiring (identify/reset on transitions, event taxonomy started) | Analytics-from-day-one is what most indie apps lack | Keep; extend funnels |
| NativeWind class architecture (`sub-*`, `modal-*`, `picker-*`…) | Component-class abstraction means **reskinning ≠ rebuilding** — Midnight Ledger is a token swap + component polish | Keep structure, replace tokens |
| SubscriptionsContext API shape | Screens are already decoupled from storage — SQLite slots in behind it | Keep API, swap internals |
| expo-router + typed routes, new-arch, SDK 54 | Modern, correct foundation | Keep |
| Brand-icon resolver + tile system | Already solves the hardest small UX problem (logo consistency) | Keep, extend catalog |
| billing/renewal math in `lib/utils.ts` | Roll-forward logic is correct; just generalize | Extract to `lib/billing.ts` |

---

## 3. Feature & Screen Inventory (complete build list)

**Existing screens to upgrade:** Home (real monthly total from `getMonthlyEquivalent`, not static `HOME_BALANCE`) · Subscriptions (search stays) · Insights (real aggregations replacing static chart data) · Settings (grows: base currency, reminder defaults, appearance, data export, account deletion, manage/cancel Pro) · Create modal → **SubscriptionFormModal** (create+edit, brand autocomplete, all 7 cycles, currency picker).

**New screens/flows (Phase 0–1):**
1. **Subscription detail** (`app/subscriptions/[id].tsx` — currently dead stub): hero, renewal countdown, price history, actions (Edit/Pause/Cancel/Delete), per-sub reminder settings (Pro).
2. **Onboarding** (`app/onboarding.tsx` — dead stub): 2–3 value panes → **brand multi-select grid** (~50 templates w/ regional default prices) → monthly-total reveal (*the aha moment*) → dismissible trial paywall. Guest mode: no signup required until sync/backup.
3. **Paywall** (RevenueCat Paywalls v2, Midnight Ledger skin): trial CTA, restore, EULA/price disclosures.
4. **Cancel-flow celebration + share card**: money-saved graphic generator (the viral loop).
5. **Empty states** for every list (teach next action).
6. **Debug screen** (dev-only): scheduled notifications inspector.

**New screens/flows (Phase 2+):** cloud backup/restore · email-forward setup ("your receipts address") + pending-detections confirmations · savings streaks/goals on Home · zombie-sub review nudge flow · price-increase alerts + `price_history` · widgets (iOS/Android) · app lock (Face ID) · dark/light theme toggle (Midnight Ledger is dark-first with a light variant) · cancellation concierge ("how to cancel X" guides) · CSV/JSON export (free — trust feature) · household/family (Phase 3) · Autopilot bank-linked tier (Phase 3, opt-in).

---

## 4. New Design System: "Midnight Ledger" (replaces course template)

**Why replace:** the current system ships in hundreds of course clones — zero brand ownership, store-reviewer déjà vu, and it reads "tutorial," not "trust me with your money."

**Direction (user-approved):** dark-first premium fintech. Deep ink surfaces, luminous mint money-accent, tabular numerals, quiet glassy elevation. Reference feel: Linear / Copilot Money / Revolut — but warmer, calmer.

**Tokens (replace `@theme` in `global.css` + `constants/theme.ts`):**
- Background `#0A0E1A` (deep ink) · Surface `#131A2E` · Surface-raised `#1B2440` · Hairline `rgba(255,255,255,0.08)`
- Money/positive accent `#4ADE9C` (luminous mint) · Alert/renewal-soon `#F4B860` (amber) · Destructive `#F47174` · Info `#7DA7F4`
- Text: primary `#F2F5FA`, secondary `rgba(242,245,250,0.62)`, numerals **tabular-nums**
- Type: swap Plus Jakarta Sans → **Inter (UI) + a distinctive display face for big numerals** (e.g., Instrument Sans/Clash Display — pick during rebrand); numbers are the hero at every level
- Shape: 20–24px radii, cards elevated by luminance not shadow; brand tiles keep the navy-tile treatment (they already fit a dark canvas perfectly)
- Motion: reanimated micro-interactions — count-up totals, bar-chart entrance, cancel celebration confetti in mint; haptics (`expo-haptics`, installed) on commit actions
- Light variant derived later from the same tokens (Phase 2 toggle); dark is default and the brand look

**Execution path (why this is cheap):** the NativeWind component-class layer survives — rewrite token values + restyle ~20 component classes + new icon set/splash. Screens don't change structurally. Estimate: 1 sprint inside Phase 1, done together with the rename (one rebrand PR).

---

## 5. Competitive Landscape & Positioning

| Competitor | Price | Excels | Bleeds |
|---|---|---|---|
| **Rocket Money** (4.5★/360K, 250–500k dl/mo, $500k–1M/mo) | Free + $6–12/mo | Bank auto-detection, negotiation, brand | Surprise negotiation fees (35–60% cut), cancellation maze, 1.0/5 support, US-only, satisfaction decays post-month-1 (Trustpilot 3.5 vs store 4.5) |
| **Bobby** (iOS, 4.7★/7.9K) | Free + $0.99–2.99 one-time unlocks | Beloved minimal design, 150+ currencies, service catalog, iCloud sync | **No Android, no iPad** (top complaint), historically unreliable notifications, sync breakage/data loss, 1 reminder/sub, no export, maintenance gaps |
| **TrackMySubs** | Free (10 subs) / **$10/mo** | Business tooling (folders/tags/CSV/Zapier) | Web-first, consumer-expensive, manual-only |
| **Subby** (Android) | Freemium | Android community favorite | No iOS |
| **Apple/Google built-in** | Free | Zero effort | Store-billed subs only — misses gym/insurance/direct-billed |

**Stance: not head-on vs Rocket Money.** Capture channels: (1) **their churn** — every complaint is a switcher; target "Rocket Money alternative" content/ASO from day one; (2) **their non-market** — they're US-only; we're global (multi-currency/i18n) into markets where they don't exist; (3) **the bank-averse** — a segment they structurally cannot serve. ~10% of their equivalent ≈ $50–100k/mo, bracketing the target.

**Complaint-driven differentiators (each maps to a competitor's top negative theme):** reliable multi-reminders (Bobby's failure — our core promise) · 2-tap cancel of OUR subscription (Rocket Money's rage) · free data export always (Bobby's lock-in) · transparent single-tier pricing, no surprise fees · visibly maintained (changelog, responsive support) · cross-platform + iPad day one (Bobby/Subby's structural gap) · parity on Bobby PRO features (currencies, categories, app lock, themes, catalog).

**Positioning sentence:** *"The private subscription tracker — no bank login, no surprise fees, works offline; your data stays on your phone unless you encrypt-and-sync it."*

---

## 6. Pricing Strategy

**Philosophy (revised per owner):** the free tier is a *tracker*; Pro is an *AI-personal-finance companion*. Free deliberately excludes every differentiator (AI insights, forecasts, personalized cards, sync, custom reminders) — its job is habit formation and funnel volume. The upsell motion is **free → 7-day trial → paid**: the trial exists so users *feel* the AI insights on their own real data, which is what converts. CRO lever: **lead with weekly pricing** (low perceived commitment at the decision moment — the Fluently/Blinkist pattern) **anchored against a heavily-discounted annual**; monthly exists but is deliberately unattractive (the decoy).

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0 | Up to 5 subs, standard T-1 reminders, current-month totals only, full export, all currencies. **No AI, no forecasts, no history, no sync.** |
| **Pro weekly** | **$1.99/wk** | Everything: AI insights & spend audit, renewal forecasts, personalized savings cards, unlimited subs, custom multi-reminders, full history, encrypted backup/sync (P2), widgets (P2), receipt forwarding (P2), app lock |
| **Pro monthly** (decoy) | $6.99/mo | Same — priced to make weekly feel light and annual feel obvious |
| **Pro annual** ⭐ default-selected | **$39.99/yr** (~$0.77/wk, "save 61%") + **7-day free trial** | Same |

*(No Lifetime tier — one-time revenue against forever AI inference costs is an unbounded liability; ruled out.)*

**AI cost control (how we don't overspend on tokens):**
1. **Stateless AI proxy — NOT a cloud DB.** A single Cloudflare Worker (free tier: 100k req/day, zero maintenance, no database) holds the API key and enforces per-user rate limits (Clerk JWT verification + Workers KV counter). This is non-negotiable for security: an API key shipped inside the app binary gets extracted and abused within days. Model: **Claude Haiku or GPT-4o-mini class — whichever is cheapest per token at build time** (the proxy makes the provider swappable behind one interface).
2. **Generate on data-change, not on view** — insights/forecast cards are computed when subscriptions actually change (or max 1×/week on a schedule), cached in the DB, and re-served free on every app open. An insight read costs $0; only regeneration costs tokens.
3. **Per-user monthly token budget** — e.g. ~50 AI generations/mo per Pro user enforced at the proxy. When exhausted: degrade gracefully to deterministic (non-LLM) insight templates — the math (totals, deltas, forecasts) is computable without AI; the LLM only adds narrative. Users rarely notice a cap this generous.
4. **Cheap model + tight prompts** — Haiku-class for insight cards and NL quick-add (~$0.001–0.01 per generation). At 50 generations/mo that's **$0.05–0.50/user/mo against $8.66/mo revenue (annual plan)** — sub-6% COGS worst-case. Reserve mid-tier models only for the deep "spend audit" (1–2/user/mo).
5. **Trial abuse guard** — trial users get a smaller budget (~15 generations) so free-trial farming can't drain spend.
6. **Spend observability + kill switch** — provider budget alerts + a remote-config flag that flips all AI features to template mode instantly if spend anomalies hit.
7. **"Do we buy credits?"** — No pre-purchase needed: Anthropic/OpenAI APIs are pay-as-you-go with configurable monthly spend caps at the account level (set it; the proxy degrades gracefully if hit). If a power-user segment emerges later, *sell* consumable "AI boost" credit packs via RevenueCat as a revenue line — credits flow toward us, not from us.

- Paywall presentation: annual pre-selected with trial badge, weekly as the low-commitment escape hatch, monthly as the anchor decoy. All three A/B-tunable remotely via RevenueCat Paywalls v2 without app updates — treat these numbers as launch hypotheses, not gospel; the experiment roadmap (price points, trial length, weekly-first vs annual-first layout) is the real strategy.
- Unit economics: blended realistic ARPU ~$3.50–5/mo net (weekly converts high but churns fast; annual is the LTV backbone) — roughly 2× the prior $2.99 model, and AI inference (Haiku-class, cents/user/mo) is comfortably covered.
- **AI moves up the roadmap**: basic AI insights/forecast cards ship in Phase 1.5–2 (pure software, no compliance) since they ARE the paywall. Bank-linked Autopilot remains the Phase-3 Pro+ expansion.
| **Pro+ "Autopilot & AI"** (Phase 2.5–3) | $8.99/mo · $59.99/yr | Opt-in bank-linked auto-detection (Plaid US/CA → Tink/TrueLayer EU/UK) **+ the AI Advisor suite** (below); price covers per-account API + inference costs |

**AI Advisor suite (the scaled-tier value story, and the marketing hook "your personal subscription CFO"):**
- **AI spend audit**: one tap → personalized narrative of waste ("You pay for 3 overlapping streaming services; Claude+ChatGPT+Copilot = $60/mo of AI tools — here's what to cut for $312/yr back"). This is the demo-able, screenshot-able wow feature for creators/ads.
- **Natural-language quick-add**: "netflix premium 17.99 monthly since march" → parsed subscription (cheap LLM call; falls back to form).
- **Price benchmarking**: "You pay $17.99 — median for this plan is $15.49; price rose 16% this year" (aggregate anonymized data becomes a moat + PR-able annual "Subscription Inflation Report").
- **Cancellation copilot**: AI-drafted cancellation/negotiation emails per service, paired with the concierge how-to-cancel guides.
- Economics: Haiku-class models keep inference at cents/user/mo — margin-safe inside $8.99. Ship AI Advisor *before* bank linking if Plaid integration lags (it's pure software, no compliance) — it alone can justify the tier at ~$5.99 interim pricing.

**Model rationale (RevenueCat 2025/26 benchmarks):** hard-paywall trials convert ~5× freemium (10.7–12.1% vs ~2.1%) and 80–90% of trials start Day 0 → **hybrid**: permanent free tier for top-of-funnel/virality + dismissible trial paywall at end of onboarding + high-intent triggers (6th sub, locked insights). Low price beats high on trial conversion (47.8% vs 28.4%). Undercuts every competitor (~70% under Rocket Money, ~80% under TrackMySubs). Raise later with grandfathering if warranted — cutting is harder.

**The math to $30–50k MRR (revised pricing):** blended net ARPU ~$3.50–5/mo (weekly high-convert/high-churn + annual LTV backbone + AI justifying the price) → **$30–50k needs ~7–13k payers ≈ 250–450k MAU at 3% conversion ≈ 15–30k downloads/mo** at Rocket Money's ~$2/download economics — achievable without top-1% status, and no longer dependent on bank-linking to get there (Autopilot/Pro+ becomes upside, not prerequisite). Gates: $1k MRR validates → $5k triggers Autopilot+Gmail builds → $30–50k at months 18–30.

---

## 7. Technical Roadmap

### Stack risk audit (first)
Pin NativeWind 5-preview exact (NW4 fallback documented) · verify release builds with reactCompiler · React/RN versions only move with SDK via `expo install --check` · secrets to EAS env · fix README fiction, broken `reset-project`, replace `pre-commit` pkg with CI.

### Phase 0 — Foundation (~2–3 wks)
- **SQLite** (`expo-sqlite`, no ORM): `db/database.ts` (PRAGMA user_version migrations before splash-hide), `db/migrations.ts`, `db/subscriptionsRepo.ts`. Schema v1 sync-ready: UUID ids (`expo-crypto`), status active|paused|cancelled, `billing_cycle`+`custom_interval_days`, materialized `next_renewal_date`, **`is_trial` + `trial_end_date`** (powers trial-expiry alerts), `updated_at`/`deleted_at` tombstones, `kv` table (settings/FX cache/flags). Icons stored as string keys via existing resolver.
- **Context keeps its API**, becomes cache over repo; adds update/delete(soft+undo toast)/pause/cancel. Seeds → `__DEV__` only.
- **CRUD**: wire `[id].tsx` detail screen + card navigation; modal → dual-mode `SubscriptionFormModal`; wire existing `onCancelPress` props (cancelled rows kept — they power money-saved).
- **`lib/billing.ts`**: `BILLING_CYCLES` map (all 7), `getNextRenewal` (generalizes existing roll-forward; dayjs clamps month-ends), `getMonthlyEquivalent` (real Home total).
- **Multi-currency**: per-sub currency (locale default), `Intl.NumberFormat` replaces symbol map, bundled FX snapshot + free daily-refresh API cached in kv, "≈" totals in base currency.
- PostHog: `subscription_updated/_cancelled/_deleted/_paused`.

### Phase 1 — Launch (~4–6 wks)
- **Rebrand PR**: new name (30–40 candidates → USPTO/EUIPO class 9/42 knockout + domain + store + handles; criteria ≤2 syllables, evokes recurrence/money; seeds: Subwise, Duesday, Outflow, Kept) + **Midnight Ledger token/component swap** + icon/splash.
- **Onboarding** (guest-mode first; Clerk account asked only where it earns its place — at trial/purchase for entitlement+backup portability): value panes → brand grid → total-shock reveal → trial paywall → optional email opt-in ("monthly spending summary") for guests who skip the trial. Same template data powers form autocomplete.
- **Notifications & reminders** (`expo-notifications` — all **local/scheduled on-device**, no push server needed, consistent with zero-backend):
  - *Renewal reminders (the core promise):* per subscription, next-occurrence-only, **T-3 + T-1 at 9:00 local** (free tier: T-1 fixed; Pro: configurable lead times globally + per-subscription). Notification IDs stored on the row; cancel+reschedule on every edit/pause/cancel/delete; foreground reconciler (AppState) rolls past renewals forward and reschedules — this is how we stay under iOS's 64-pending cap and never miss.
  - *Free-trial expiry tracking (category killer-feature):* mark any subscription as "trial ends <date>" → aggressive T-2 + T-0 morning alerts — "Your Disney+ trial converts to $13.99/mo TOMORROW — cancel now?" with a deep link to the cancellation guide. Saves users real money fast → drives the money-saved counter, reviews, and word-of-mouth.
  - *Upcoming digest (Pro):* weekly Monday-morning summary — "3 renewals this week totaling $47.97."
  - *Monthly wrap (Pro):* "Your March: $424.63 across 12 subscriptions, +12% vs Feb" — deep-links into the report; doubles as a re-engagement loop.
  - *Zombie nudge (Phase 2):* "Still using Canva? You've paid 8 months" — capped at 1/month.
  - *Hygiene:* Android 13+ contextual permission ask (after first sub added, not at launch) + "Renewal reminders" channel; every notification type individually toggleable in Settings; PostHog events on permission grant/deny + notification-open rates.
- **RevenueCat**: `react-native-purchases` + Paywalls v2; `Purchases.logIn(clerkUserId)`; `useEntitlements()` context; gates at 6th sub/insights/settings; 2-tap cancel path in Settings.
- **EAS**: eas.json (dev/preview/prod, autoIncrement), bundle IDs, managed credentials, expo-doctor clean.
- **Website (submission blocker)**: single-page site on new domain (see Marketing §8) hosting the URLs both stores require — privacy policy, terms, support, Play account-deletion page — plus waitlist. Build early in Phase 1, before store listings are drafted.
- **Compliance**: privacy policy+terms on new domain; in-app account deletion (Clerk delete + DB wipe + RC logout + PostHog reset) + Play web-deletion URL; privacy labels/Data Safety; `ITSAppUsesNonExemptEncryption:false`; paywall restore+disclosures; iPad layout pass + screenshots.
- **Quality**: `@sentry/react-native` (sentry-expo deprecated); PostHog screen tracking (`usePathname`) + funnel (install→onboard→first sub→3+ subs→paywall→trial→paid); jest-expo tests (billing math, currency, repo CRUD, migration fixtures, screen smokes); GitHub Actions (PR: lint+tsc+jest; tag: EAS build); i18n string extraction NOW (ship EN, cheap while small); TestFlight + Play closed track (12-tester/14-day rule — recruit early).

### Phase 2 — Growth (mo 3–6, metric-gated)
- **Backup/sync (Pro) — NO cloud DB of ours (owner decision: zero server maintenance; local data is the game-changer).** Backups go to the **user's own cloud**: iCloud (iOS) + Google Drive app-data folder (Android) via `react-native-cloud-storage` — encrypted SQLite export written to their storage, restored on reinstall/new device. We host nothing, maintain nothing, pay nothing; entitlement-gating still works (the *feature* is Pro, the storage is theirs). **Marketing upgrade: "Your data never touches our servers — we don't even have a database."** Trade-offs accepted: no live multi-device sync and no family/household sharing for now — if those ever justify a real backend, that's a Phase-3 decision gated on demand + revenue, not a default.
- **Device-change & data recovery (Pro users are the priority; zero cost to us):**
  - *Same-platform move (iPhone→iPhone / Android→Android) — fully automatic:* Pro auto-backup is **ON by default** (every data mutation, debounced, to their iCloud/Drive). On the new device: sign in with Clerk → RevenueCat `logIn` restores the Pro entitlement (works cross-store since it's tied to the user ID, plus the native Restore Purchases button) → app detects the backup in their cloud → one-tap **"Restore your data"** prompt. User does nothing but log in.
  - *Cross-platform move (iPhone↔Android) — guided manual:* iCloud isn't readable from Android (and vice versa), so the path is the **encrypted export file** (Files/Drive/AirDrop) → login on new device → import. A "Moving to a new phone?" guide in Settings + on the website walks it through step-by-step.
  - *Backup-health UX:* Settings shows last-backup timestamp with a stale-backup warning badge (>7 days) for Pro; free users see a gentle "your data lives only on this device — export a copy" reminder in Settings and before app deletion where detectable.
  - *Disclaimers (set expectations, avoid support fires + 1-star reviews):* onboarding privacy pane + Settings + website FAQ state plainly: *"Your data is stored on your device — not on our servers. Pro backs it up automatically to your own iCloud/Google Drive. Without a backup or export, a lost or wiped device means the data cannot be recovered — by design."* Same language in the store listing description to preempt refund disputes.
  - *Worst case (Pro user, lost device, backup existed):* new device + login → auto-restore → whole event costs us $0 and reads as magic. *Worst case (no backup at all):* data is unrecoverable — the disclaimer plus default-on auto-backup makes this rare and clearly communicated.
- **Dashboard / Reports + insight export (Pro)** — evolves the Insights tab into a full reporting surface (all computed **on-device**, zero backend): monthly/annual spend reports, category & currency breakdowns, cycle mix, price-change history, money-saved ledger, year-over-year trends, AI narrative summary on top (via the Worker proxy). **Export**: shareable PDF report via `expo-print` (AI summary + charts + tables — "my subscription annual report"), plus CSV of any view; the share-card system reuses the same rendering. Pro-gated; the free tier sees current-month totals only — this is a core paywall feature and a B2B/freelancer hook (expense reports for taxes).
- **Email-forward parsing (Pro)** — *deferred behind its own gate (~$5k MRR) since it requires the first real backend surface* (inbound mail webhook + short-lived storage, e.g. Postmark + a single worker; raw deleted ≤72h, parsed suggestions delivered to the app via push payload, never auto-added). No OAuth/CASA needed. Decision on whether to build it at all happens then — the AI Advisor + reports may carry the tier without it.
- **Gamification (kept honest — celebrate *not spending*, never dark-pattern):** money-saved counter + cancel celebration/share card, savings streaks, zombie nudges (`last_reviewed_at`), price-increase alerts (`price_history` migration), **savings milestones** (badges at $100/$500/$1k cancelled — each milestone triggers the share card AND the rating funnel below), monthly "audit ritual" (a 2-minute guided review of all subs, streak-counted — habit loop that drives retention, our D30 lever).
- **Trust & Community Loop (loyalty engine):**
  - **Sentiment-gated rating funnel**: at peak-happiness moments (milestone hit, money-saved celebration, 3rd week streak) ask "Enjoying it?" → happy → native store review prompt (`expo-store-review` — iOS SKStoreReviewController / Play In-App Review). Unhappy → private feedback form routed to us, not the store. *Compliance note: stores prohibit prefilled/incentivized review text and there is no API to post reviews — the native prompt is the only legal path, and this funnel is the proven way to bend store ratings upward.*
  - **AI-drafted testimonials (website, not stores)**: after a happy signal, offer 3 AI-generated quote drafts based on the user's real stats ("Cancelled $34/mo of zombie subs in my first week") → user picks/edits → one-tap consent → published to the website testimonial wall + optional social share via the share-card system. Gets the "predefined description" convenience where it's actually allowed.
  - **In-app feature request board**: embed **Canny free tier** (or Featurebase) in a webview — no database of ours to maintain. Submit + upvote + status labels (Planned/Building/Shipped). **"You asked → we shipped"** section in every changelog release note — the personal-connect loop. Founder replies to top requests in-app.
  - **In-app changelog / What's New** screen fed from a simple JSON — visible active maintenance is itself a differentiator vs Bobby's abandonment reputation.
  - PostHog: `rating_prompt_shown/sentiment`, `testimonial_published`, `feature_request_submitted/upvoted`.
- **Platform**: widgets (`@bacons/apple-targets` + Glance; JSON bridge — budget a week+), app lock (`expo-local-authentication`), light-theme variant, locales DE/FR/ES/PT-BR/JA, referral via RC offer codes.

### Phase 3 — Revenue engine (mo 6–18)
- **Autopilot tier** ($8.99/$59.99): Plaid recurring-transactions endpoint (US/CA → Tink/TrueLayer EU/UK), server-side by necessity, opt-in ("local by default, linked only if you choose"). Gate: ~$3–5k MRR.
- **Gmail OAuth** (restricted scope + CASA Tier 2) — gate >$5k MRR; reuses parsing pipeline. Cheaper global detection than bank APIs.
- **No %-fee negotiation** (Rocket Money's #1 complaint) → cancellation-concierge guides instead; flat-fee partnerships much later.
- **Family sharing (two levels):**
  - *Level 1 — entitlement sharing (near-free, ship early in Phase 2):* enable **Apple Family Sharing / Google Play family library on the Pro IAP** — RevenueCat supports family-shared subscriptions natively. One household buys Pro once, everyone's app unlocks. Zero backend, strong paywall selling point ("Pro for your whole family").
  - *Level 2 — shared household subscription list (Phase 3, gated on demand + revenue):* actually seeing/editing one shared list requires either a real backend or CloudKit shared databases (Apple-only). Deferred until the demand signal justifies breaking the zero-backend rule; the feature-request board tells us when.
- B2B wedge test via Business category + CSV export.

### Future roadmap add-ons (high value, low effort — no architectural rework)
All of these ride on the existing SQLite + design system + report/share infrastructure:
- **Calendar view** of upcoming renewals (month grid — data already materialized in `next_renewal_date`) + **"add renewals to device calendar"** via `expo-calendar` (Pro).
- **CSV import** (not just export) — one-tap switching path for TrackMySubs/spreadsheet users; a competitor-conversion feature that costs a parser.
- **"Year in Subscriptions" Wrapped** (December seasonal): shareable animated recap built entirely from the existing report + share-card systems — annual viral moment.
- **Tags / spaces** (personal vs business vs family labels): one column + filter UI; unlocks the freelancer/B2B wedge with zero rework.
- **Duplicate & overlap detection**: local heuristic flagging same-category overlaps ("3 streaming services") — feeds the AI audit narrative.
- **Home-screen quick actions** (`expo-quick-actions`: long-press icon → "Add subscription" / "What renews this week").
- **Usage check-ins**: occasional "Still using X?" one-tap rating per sub — powers smarter zombie nudges and the cost-per-use stat in reports.
- **Icon/theme packs** as a cosmetic Pro perk (tokens already centralized — a theme is a token file).
- **Snooze/skip a renewal reminder** (one-tap from the notification) — notification actions, no new infrastructure.

---

## 8. Marketing & Launch Plan

- **Single-page marketing website (Phase-1 deliverable — also a hard store-submission dependency):**
  - *Why it blocks launch:* App Store requires a **support URL** + **privacy policy URL**; Play additionally requires a **web account-deletion URL** and Data-Safety-consistent privacy policy. No site → no approval.
  - *Structure (Fluently-style single page, Midnight Ledger branding):* hero (one-liner + phone mockup + store badges / **waitlist form pre-launch**) → the $91/mo pain stat → 3 feature blocks (reliable reminders · privacy/no-bank-login · money-saved gamification) → live testimonial wall (fed by the in-app consented-quote flow) → pricing → FAQ → footer (privacy, terms, support email, account-deletion page, changelog).
  - *Build:* static Astro or Next.js on Vercel on the new domain (~2–3 days); waitlist via a form service (Loops / Tally / Formspree — no database of ours; doubles as the launch-announcement list); OG images from the share-card generator for link previews.
  - *Post-launch growth:* same site hosts the "how to cancel X" SEO guide pages and the annual Subscription Inflation Report — the site graduates from brochure to acquisition channel.
- **Lead capture & owned audience (works WITH guest mode):** RevenueCat can't provide emails — Apple/Google never share purchaser contact info — so leads are captured in-app at value moments, all flowing into one marketing list (Loops or MailerLite; PostHog-linked):
  1. **Paying customers (the priority leads): login is a HARD requirement before checkout.** The trial/purchase flow enforces Clerk sign-up first — honest pitch: *"Create your account so Pro and your backups follow you to any device"* (genuinely required for the device-change story above). Note: actual payment details (card/billing) go to Apple/Google's native purchase sheet and are never visible to us or RevenueCat — the **Clerk profile is the lead record**, linked to the RevenueCat entitlement by user ID. Result: ~100% of paid users are known, emailable leads.
  2. **Guest/free users — capped contextual signup prompts + value-exchange:** periodic sign-up/login prompts are fine but frequency-capped and dismissible (e.g., at natural moments — after 3rd subscription added, after a milestone, at most once per week — never blocking core use). Rationale: constant nag popups are precisely what Rocket Money gets punished for in reviews; capped prompts capture leads without spending trust. Alongside: the optional *"Email me my monthly spending summary"* / price-increase-alert opt-ins (real benefits, not gates). Expect 15–30% combined opt-in vs ~0% from a hard gate they'd abandon.
  3. **Website waitlist** (pre-launch) + newsletter (the annual Subscription Inflation Report is the flagship email).
  4. Compliance: explicit marketing-consent checkbox (GDPR), disclosed in privacy policy/labels; unsubscribe honored via the email provider.
  - This list is the cross-promotion asset for launching future apps — owned, portable, and independent of store algorithms.
- **Pre-launch (during Phase 1):** waitlist live before beta; 50-tester beta recruited from r/personalfinance/r/Frugal/r/iosapps (as maker) + waitlist; collect testimonial quotes + store-review pipeline.
- **Launch week:** Product Hunt (privacy angle) + Show HN ("local-first, E2E-encrypted subscription tracker") + Reddit maker posts. App Store "New Apps We Love" pitch via App Store Connect promo form (dark distinctive design helps).
- **Ongoing engine:** the **cancel-flow share card** is the loop — every cancellation mints a "$X/mo saved" graphic sized for TikTok/IG. Partner with 5–10 micro personal-finance creators ($50–200 tests) on the "subscription audit" format — the **AI spend audit** is the perfect creator demo ("I let AI audit my subscriptions"). SEO/ASO content: "how to cancel X" concierge guides double as landing pages (each guide = a search-intent page feeding app installs). The **website testimonial wall** auto-grows from the in-app consented-quote flow; the **feature-request board's "shipped" log** doubles as public proof of momentum (vs Bobby's abandonment reputation). Ratings compound via the sentiment-gated funnel — target 4.7+ by routing unhappiness to support before it reaches the store.
- **ASO:** "subscription tracker", "subscription manager", "bill reminder", "rocket money alternative"; localized keywords per Phase-2 locales; screenshot narrative: shock ("$91/mo forgotten") → reminders → privacy → dark UI beauty; iterate via Play experiments + Apple PPO.
- **Metrics that matter (PostHog):** activation (install→3+ subs in 24h — validate as aha), trial funnel by trigger, D1/D7/D30 retention, reminder permission-grant + notification→open rate, cancellations logged (marketing stat: "users cancelled $X of zombie subs"), share-card generation rate.

---

## 9. Risks & Challenges (foreseen upfront → tackled)

| Risk | Tackle |
|---|---|
| Reminder unreliability (kills the core promise) | Next-occurrence-only scheduling + foreground reconciler + dev inspector screen + aggressive device-matrix testing; it's the top QA budget line |
| NativeWind 5 preview breaks a release | Exact pins, lockfile snapshot, documented NW4 fallback, preview-build smoke checklist |
| Course-clone recognizability | Full Midnight Ledger reskin + rename in one Phase-1 PR (structure preserved, cheap) |
| Store rejections (deletion, paywall rules, labels) | Compliance checklist executed pre-submission; 1–2 rejection cycles budgeted into timeline |
| SQLite migration data loss (unrecoverable for local-first) | Every migration ships with a fixture-DB jest test, no exceptions |
| Trademark collision post-launch | Knockout search before buying assets; brand strings centralized (forced rename = 1 day) |
| Solo scope creep | Every Phase-2+ item metric-gated (sync @500 MAU, Autopilot @$3–5k, Gmail @$5k) |
| Low willingness-to-pay anchored by Bobby's $2.99 one-time | Paywall sells the AI companion + ongoing-cost features (sync, parsing, reliability), never manual entry — different category, different anchor. No lifetime SKU (AI inference makes one-time pricing an unbounded liability) |
| AI token overspend / abuse | Server-side proxy w/ per-user budgets, generate-on-change caching, Haiku-class models (<6% COGS), trial caps, provider spend limits + template-mode kill switch (see §6) |
| Clerk-required auth = onboarding friction + compliance surface | Guest mode in Phase 1; account only for Pro sync |
| FX API disappearance | Bundled fallback rates + `RatesProvider` abstraction; totals degrade to "rates as of <date>" |
| Play new-account 12-tester/14-day rule | Recruit testers during Phase 0 |

## 10. Verification & Go-Live Checklist

- **Phase 0:** jest — billing math all cycles × month-end × roll-forward, currency, repo CRUD on in-memory SQLite, migration fixtures; manual — full CRUD matrix both dev clients, kill-relaunch persistence, `tsc`+lint green.
- **Phase 1:** notification protocol (short-interval debug triggers; reschedule-on-edit + cleanup verified via inspector); RevenueCat sandbox purchase/restore both stores; gating at exactly 5→6; fresh-install onboarding (guest + signed paths); iPad layout pass; ≥3 external testers; Sentry symbolicated test crash; PostHog funnel live; store checklist 100% before submission.
- **Phase 2:** backup/restore round-trip via iCloud + Google Drive incl. mid-restore kill and fresh-device restore; encrypted-blob verification (backup file unreadable without key); reports/PDF export rendering checks across data sizes + long names; AI proxy rate-limit + budget-cap behavior (verify graceful template fallback); widget staleness after mutations.
- **Go-live:** production builds smoke-tested from the store (not sideloaded), paywall live-purchase verified with a real card + refund, privacy policy URLs resolve, support email answered.

## Critical Files

`context/SubscriptionsContext.tsx` (cache over repo) · new `db/*` (database, migrations, repo) · `lib/billing.ts` (from `lib/utils.ts`) · `components/CreateSubscriptionModal.tsx` → `SubscriptionFormModal` · dead stubs `app/subscriptions/[id].tsx`, `app/onboarding.tsx` · `global.css` + `constants/theme.ts` (Midnight Ledger tokens) · `app.json` + new `eas.json` (rebrand/bundle IDs/plugins) · new `constants/brandTemplates.ts`, `lib/entitlements.ts`.

## Sources

- Rocket Money: [Trustpilot](https://www.trustpilot.com/review/rocketmoney.com) · [BBB complaints](https://www.bbb.org/us/md/silver-spring/profile/billing-services/rocket-money-inc-0241-236043013/complaints) · [ConsumerAffairs](https://www.consumeraffairs.com/finance/truebill.html) · [PissedConsumer](https://rocket-money.pissedconsumer.com/review.html)
- Bobby: [App Store listing](https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023) · [bobbyapp.co](https://bobbyapp.co/) · [tracker comparison](https://resubs.app/resources/best-subscription-tracker-apps)
- [TrackMySubs](https://trackmysubs.com/)
- RevenueCat: [State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/) · [2026 benchmarks](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/) · [Business of Apps trial benchmarks](https://www.businessofapps.com/data/app-subscription-trial-benchmarks/)
