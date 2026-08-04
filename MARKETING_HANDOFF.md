# myrev — Marketing & Launch Handoff

> **Purpose:** a self-contained resume-point. When we pick marketing back up,
> this says **what's decided, what's built, and what's left** — no need to
> re-derive it. The full rationale lives in [`PRODUCTION_PLAN.md`](./PRODUCTION_PLAN.md) §8;
> this is the actionable digest. Product/app work is tracked separately in the
> PRODUCTION_PLAN decision log.

_Last updated: 2026-08-04._

---

## 0. Status snapshot (where we are)

- **App:** built and validated to the limit of Expo Go (RevenueCat + downgrade +
  consent + trial all coded/tested; native-only flows await a dev build). See
  PRODUCTION_PLAN.
- **Marketing:** **nothing built yet.** Domain + strategy + design direction are
  decided (below). The **marketing website is a hard store-submission blocker** —
  it must exist before we can submit to either store.
- **Blocked on:** Apple Developer + Google Play accounts (for the app), and a
  couple of hours to stand up the site + waitlist (independent of the stores —
  can be done anytime).

---

## 1. Brand & domain (FINALIZED)

| Item | Value |
| --- | --- |
| App name | **myrev** — tagline **"know what renews."** |
| Positioning | Track subscriptions, recurring bills, and upcoming payments in one place. |
| Product domain | **getmyrev.app** |
| Studio | **Zerohaus** (`zerohaus.io`) — "by Zerohaus" endorser lockup |
| Bundle / package | `com.myrev.app` |
| Deep-link scheme | `myrev://` |
| Trademark | USPTO "MYREV" record dead/abandoned; finance MyRev.com dormant → cleared to proceed (reserve store name; optional intent-to-use filing). |

**Visual identity (matches the app + design system):**
- Accent **violet `#6E5BE4`**; adaptive **Porcelain light `#F4F2F9` / Violet Midnight dark `#0F0D1A`**.
- Type: **Fraunces** (display, big numerals + headlines) + **Plus Jakarta Sans** (body).
- **Copy voice:** human brand voice — concrete, numbers over adjectives, no AI-slop / em-dash filler; never imply myrev moves money or cancels for you. (See the `copy-voice` memory + the design system copy deck.)

**Pricing (for the pricing block):** Weekly **$2.99** / Monthly **$4.99** / Annual **$29.99** (default, **SAVE 50%**) · **3-day free trial**.

**Wedge to lead with:** local-first, **no bank login**, "your data never touches our servers — we don't even have a database," and **no nag popups** (the thing Rocket Money is punished for).

> ⚠️ **Register `getmyrev.app`** if not already done — first concrete task.

---

## 2. Marketing website / landing page

**Why it's a launch blocker:** App Store requires a **support URL** + **privacy
policy URL**; Play additionally requires a **web account-deletion URL** and a
Data-Safety-consistent privacy policy. No site → no store approval.

**Single-page structure (top → bottom):**
1. **Hero** — one-liner + phone mockup + store badges (pre-launch: **waitlist email form** instead of badges).
2. **The pain stat** — "$91/mo in forgotten subscriptions" (or current figure) — the shock hook.
3. **Three feature blocks** — (a) reliable reminders, (b) privacy / no bank login, (c) money-saved gamification.
4. **Testimonial wall** — auto-fed by the in-app consented-quote flow (empty at launch; grows over time).
5. **Pricing** — the three tiers + 3-day trial.
6. **FAQ** — incl. the "your data lives on your device / lost-device = unrecoverable, by design" disclaimer (pre-empts refund disputes).
7. **Footer** — privacy policy · terms · support email · **account-deletion page** · changelog.

**Build:**
- Static **Astro or Next.js on Vercel**, on `getmyrev.app` (~2–3 days).
- **Waitlist** via a form service (**Loops / Tally / Formspree**) — no DB of ours; doubles as the launch-announcement list.
- **OG images** generated from the in-app share-card system for link previews.
- Reuse the app's violet tokens + Fraunces/Jakarta pairing so site ↔ app feel identical.

**Post-launch, the site graduates from brochure → acquisition channel:** hosts the "how to cancel X" SEO guide pages and the annual **Subscription Inflation Report**.

**Required legal pages (must resolve before submission):** privacy policy, terms, support, Play web account-deletion page. Keep them consistent with the App Store privacy labels / Play Data Safety answers.

---

## 3. Lead capture & owned audience

RevenueCat/Apple/Google never share purchaser emails, so leads are captured
**in-app at value moments**, all flowing into one list (**Loops or MailerLite**,
PostHog-linked):

1. **Paying customers (priority):** login is a **hard requirement before checkout** (already enforced in the paywall) — the Clerk profile is the lead record, linked to the RC entitlement by user id. ~100% of paid users are known, emailable leads.
2. **Guest/free:** **capped, dismissible** signup prompts at natural moments (after 3rd sub, after a milestone, ≤ 1×/week) + optional "email me my monthly summary" / price-increase opt-ins. Never blocks core use.
3. **Website waitlist** (pre-launch) + newsletter (the Subscription Inflation Report is the flagship email).
4. **Compliance:** explicit GDPR marketing-consent checkbox, disclosed in the privacy policy; unsubscribe via the email provider.

> Not built yet: the **in-app → marketing-list sync** (Clerk email → Loops/MailerLite) is still a code TODO (also noted in PRODUCTION_PLAN). The paywall already captures the account; the automated push to the list is the missing piece.

---

## 4. Launch plan

- **Pre-launch (Phase 1):** waitlist live before beta; recruit a ~50-tester beta from r/personalfinance, r/Frugal, r/iosapps (as maker) + the waitlist; start collecting testimonial quotes + the store-review pipeline. (Note: Play's new-account **12-tester / 14-day** closed-testing rule — recruit early.)
- **Launch week:** Product Hunt (privacy angle) + Show HN ("local-first subscription tracker") + Reddit maker posts. Pitch **App Store "New Apps We Love"** via the App Store Connect promo form (the distinctive dark design helps).
- **Ongoing growth engine:**
  - The **cancel-flow share card** is the viral loop — every cancellation mints a "$X/mo saved" graphic sized for TikTok/IG.
  - Partner with **5–10 micro personal-finance creators** ($50–200 tests) on the "subscription audit" format.
  - **SEO/ASO:** "how to cancel X" concierge guides double as search-intent landing pages.
  - **Testimonial wall** auto-grows from the in-app consented-quote flow; the **feature-request board's "shipped" log** is public proof of momentum.
  - **Ratings:** sentiment-gated funnel (happy → store review; unhappy → private feedback) to target 4.7★+.

---

## 5. ASO & store listing

- **Keywords:** "subscription tracker", "subscription manager", "bill reminder", "rocket money alternative"; localize per Phase-2 locales.
- **Screenshot narrative:** shock ("$91/mo forgotten") → reminders → privacy → dark-UI beauty. The **onboarding count-up reveal** is the hero ASO screenshot.
- Iterate via Play Store experiments + Apple Product Page Optimization.

---

## 6. Metrics that matter (PostHog)

Activation (install → 3+ subs in 24h), trial funnel by trigger, D1/D7/D30
retention, reminder permission-grant + notification→open rate, cancellations
logged ("users cancelled $X of zombie subs"), share-card generation rate.
_(Funnel events + screen tracking are already wired in the app.)_

---

## 7. What's left — prioritized checklist

**A. Do anytime (not blocked by store accounts):**
- [ ] Register / confirm **getmyrev.app**.
- [ ] Pick the email/waitlist provider (**Loops** recommended — waitlist + newsletter + later the in-app list, one tool).
- [ ] Build the **single-page site** (hero + waitlist form + pain stat + 3 features + pricing + FAQ + footer) on Vercel.
- [ ] Write + host the **legal pages** (privacy, terms, support, account-deletion) — required for submission.
- [ ] Launch the **waitlist** and start driving signups (Reddit, personal network).

**B. In-app marketing code (TODO, dev-toggle-testable):**
- [ ] **Marketing-list sync** — Clerk email → Loops/MailerLite on sign-up/consent.
- [ ] Guest capped-signup prompts + "email me my monthly summary" opt-in.
- [ ] Consented-testimonial capture flow (feeds the site wall).

**C. Blocked on store dev accounts:**
- [ ] Apple Developer + Google Play accounts.
- [ ] Store listings (copy, screenshots from the reveal, keywords).
- [ ] Privacy nutrition labels (App Store) + Data Safety form (Play) — answers must match the site's privacy policy.
- [ ] Closed beta (TestFlight / Play closed track) — mind the 12-tester/14-day rule.

**D. Post-launch (growth):**
- [ ] "How to cancel X" SEO guide pages.
- [ ] Creator partnerships + share-card loop.
- [ ] Feature-request board + changelog ("you asked → we shipped").
- [ ] Annual Subscription Inflation Report.

---

_Cross-references: full rationale in [`PRODUCTION_PLAN.md`](./PRODUCTION_PLAN.md) §8;
brand/screens in [`myrev-design-system.html`](./myrev-design-system.html); conversion
strategy in the `conversion-strategy` memory._
