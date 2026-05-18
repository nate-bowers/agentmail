# Launch Readiness Audit

> Snapshot as of 2026-05-18. All claims cite a specific file and line, or note that a search returned no result. No code was modified.

## Executive summary

The product is real and the core loop works end-to-end. There is a fully wired Supabase + Stripe + Resend + Anthropic stack, a working onboarding (free and Pro variants) with a thoughtful "move to primary inbox" anti-spam step, an unsubscribe flow with HMAC-signed tokens, server-enforced points-based gating between free and Pro, and a dashboard that already saves, validates, reorders, and previews modules. Migration history shows 13 migrations applied with sensible incremental schema changes (`supabase/migrations/001_initial_schema.sql` through `013_onboarding_test_email.sql`). The email render pipeline has good defense in depth (Zod validation, sanitization, news refinement pass, citation artifact stripping, per-section error fallbacks).

The blockers for a friends pilot are smaller in number but real. The most urgent is that the daily-send cron is hard-coded to fire once at 12:00 UTC and the per-user send-time check is intentionally commented out (`src/app/api/cron/send-briefs/route.ts:85-90`). Every active user therefore receives their brief at the same wall-clock moment in mid-Atlantic time, not at the time they set in their dashboard. The second-most urgent is that there is no password-reset flow (the "Forgot password?" link is `href="#"` in `src/components/auth/AuthForm.tsx:191`), so any pilot user who forgets their password gets stuck. The third is the email footer has an unsubscribe link but no physical postal address, which is a CAN-SPAM requirement for commercial email and a Gmail bulk-sender deliverability issue.

The biggest pleasant surprise is how defensively the brief generation pipeline is built. There is a 24-hour static cache, a 12-hour live-search cache, a daily history-events warm cache, a news refinement pass with retry, and explicit section-level error fallbacks so one bad module never kills the email. The biggest unpleasant surprise is two `middleware.ts` files exist (root `/middleware.ts` and `/src/middleware.ts`), only the `src/` one is active under the Next.js src-directory convention, and the root file contains protection logic (route gates and "redirect logged-in users away from /login") that looks active but is not. Auth protection works only because every dashboard route does its own server-side `redirect('/login')` call.

The codebase is closer to friends-pilot-ready than public-launch-ready. With roughly one focused day of work (password reset, cron timing, support email, CAN-SPAM address, payment-failure webhook, welcome email) the friends pilot is shippable. Public launch needs a meaningful second pass: observability, dunning, Resend bounce webhook, FAQ/support, legal review of the policies, and an actual landing-page sample of the email.

## Stage gating

Tier definitions:
- **Friends pilot** — must work before sending invites to 25 to 50 friends.
- **Public launch** — must work before public launch (HN, Product Hunt, Reddit, Twitter, etc).
- **Nice to have** — improves product but does not block either stage.

| Item | Status | Tier | Effort | Evidence |
|---|---|---|---|---|
| Email + password signup | Done | Friends pilot | S | `src/components/auth/AuthForm.tsx:37-42` |
| Google OAuth | Done | Friends pilot | S | `src/components/auth/AuthForm.tsx:63-79` |
| Microsoft (Azure) OAuth | Done | Friends pilot | S | `src/components/auth/AuthForm.tsx:63-79` |
| Email verification gate on signup | Done | Friends pilot | S | `src/components/auth/AuthForm.tsx:39-42` (checkEmail when no session returned) |
| Password reset flow | Missing | Friends pilot | M | `src/components/auth/AuthForm.tsx:191` ("Forgot password?" is `href="#"`); no `resetPasswordForEmail` call anywhere (searched, not found) |
| Login page | Done | Friends pilot | S | `src/app/(auth)/login/page.tsx:1-28` |
| Account deletion (cascade-delete) | Done | Friends pilot | S | `src/app/api/user/settings/route.ts:61-73` uses `admin.deleteUser`; cascade via `references auth.users on delete cascade` in `supabase/migrations/001_initial_schema.sql:11` |
| Change delivery email (separate from auth email) | Done | Friends pilot | S | `src/app/api/user/settings/route.ts:20-24`; `delivery_email` column from `supabase/migrations/008_delivery_email_verbosity.sql:2` |
| Change auth email | Missing | Public launch | S | searched, not found |
| Pause / resume daily brief | Done | Friends pilot | S | `src/components/dashboard/SettingsForm.tsx:63-80`; uses `is_active` flag |
| Stripe Checkout (hosted) | Done | Friends pilot | S | `src/app/api/stripe/checkout/route.ts:61-116` |
| Stripe Customer Portal | Done | Friends pilot | S | `src/app/api/stripe/portal/route.ts:6-37` |
| Stripe webhook: checkout.session.completed | Done | Friends pilot | S | `src/app/api/stripe/webhook/route.ts:45-85` |
| Stripe webhook: customer.subscription.updated | Done | Friends pilot | S | `src/app/api/stripe/webhook/route.ts:87-114` |
| Stripe webhook: customer.subscription.deleted | Done | Friends pilot | S | `src/app/api/stripe/webhook/route.ts:116-139` |
| Stripe webhook: invoice.payment_failed (dunning) | Missing | Public launch | M | searched, not handled in `src/app/api/stripe/webhook/route.ts:44-145` |
| Stripe webhook signature verification | Done | Friends pilot | S | `src/app/api/stripe/webhook/route.ts:34` |
| Stripe checkout rate limit | Done | Friends pilot | S | 5/hour per user, `src/app/api/stripe/checkout/route.ts:21-33` |
| Live vs test mode handling for stale customers | Done | Friends pilot | S | `src/app/api/stripe/checkout/route.ts:81-106` |
| Stripe Tax | Missing | Nice to have | S | `src/app/api/stripe/checkout/route.ts:61-77` (no `automatic_tax` in session params) |
| Refund automation | Missing | Nice to have | M | searched, not found (manual via Stripe dashboard) |
| Daily cron defined | Done | Friends pilot | S | `vercel.json:7-10` |
| Per-user send-time + timezone respected | Missing | Friends pilot | S | `src/app/api/cron/send-briefs/route.ts:85-90` (isSendTime check commented out); cron fires once at 12:00 UTC `vercel.json:8` |
| Warm-cache cron | Done | Nice to have | S | `vercel.json:3-5`, runs 04:00 UTC daily |
| Unsubscribe link in every email | Done | Friends pilot | S | `src/components/email/DailyBriefEmail.tsx:918-920` |
| HMAC-signed unsubscribe tokens | Done | Friends pilot | S | `src/lib/unsubscribe.ts:1-49`; verified with `timingSafeEqual` |
| Unsubscribe confirmation page | Done | Friends pilot | S | `src/app/unsubscribe/page.tsx:1-88` |
| List-Unsubscribe / List-Unsubscribe-Post header | Missing | Public launch | S | searched, not found |
| Physical postal address in email footer | Missing | Friends pilot | S | `src/components/email/DailyBriefEmail.tsx:896-930` (footer has unsubscribe + privacy + terms only) |
| From-address consistency | Risky | Friends pilot | XS | Send uses `brief@dailybriefmail.com` (`src/lib/email/send.ts:57`); preview UI says `noreply@dailybriefmail.com` (`src/components/dashboard/PreviewClient.tsx:466`) |
| Welcome email on signup | Missing | Friends pilot | S | searched, not found. Only `WelcomeTestEmail` exists, sent on-demand during onboarding by `src/app/api/onboarding/send-test-email/route.ts:81-86` |
| Resend bounce / complaint webhook | Missing | Public launch | M | searched, not found |
| Payment confirmation email | Missing | Public launch | S | searched, not found |
| Subscription cancel email | Missing | Public launch | S | searched, not found |
| Onboarding flow (free + pro) | Done | Friends pilot | S | `src/components/onboarding/OnboardingModal.tsx:993-1233` |
| Anti-spam test email step in onboarding | Done | Friends pilot | S | `src/app/api/onboarding/send-test-email/route.ts:1-99`; `src/components/email/WelcomeTestEmail.tsx:1-80` |
| Onboarding resume after closed tab | Missing | Nice to have | M | OnboardingModal state is local React state, no persistence (`src/components/onboarding/OnboardingModal.tsx:993-1006`) |
| Free vs Pro topic gating enforced server-side | Done | Friends pilot | S | `src/lib/email/pipeline.ts:69-79` (free users get default configs at send time) |
| Points-based module limit enforced server-side | Done | Friends pilot | S | `src/app/api/modules/route.ts:112-117` |
| Add / remove / reorder modules (dnd-kit) | Done | Friends pilot | S | `src/app/api/modules/reorder/route.ts:1-56`; dependency present `package.json:14-16` |
| Preview your brief (one-off) | Done | Friends pilot | S | `src/app/api/email/generate-preview/route.ts:1-123` (3/day) |
| Test-send to inbox | Done | Friends pilot | S | `src/app/api/email/test-send/route.ts:1-87` (3/day) |
| Privacy policy page | Done (with caveat) | Friends pilot | XS | `src/app/(marketing)/privacy/page.tsx`; AI-drafted, "Legal Review Required" banner shown `src/app/(marketing)/privacy/page.tsx:93-98` |
| Terms of service page | Done (with caveat) | Friends pilot | XS | `src/app/(marketing)/terms/page.tsx`; same legal banner `src/app/(marketing)/terms/page.tsx:81-85` |
| Real support email in policies | Missing | Friends pilot | XS | `[add support email before launch]` placeholder in `src/app/(marketing)/privacy/page.tsx:48,68` and `src/app/(marketing)/terms/page.tsx:63` |
| GDPR / CCPA data export | Missing | Public launch | M | searched, not found |
| Cookie banner | Not needed | Nice to have | S | Privacy policy claims only essential session cookies, no analytics (`src/app/(marketing)/privacy/page.tsx:42-43`) |
| Landing page | Done | Friends pilot | S | `src/app/(marketing)/page.tsx` and `src/components/marketing/LandingPageContent.tsx` |
| Pricing section on landing | Done | Friends pilot | S | `src/components/marketing/LandingPageContent.tsx:398-495` |
| FAQ section | Missing | Public launch | M | searched, not found in `src/components/marketing/LandingPageContent.tsx` |
| Social proof / testimonials | Missing | Public launch | S | `src/components/marketing/LandingPageContent.tsx:132-154` has stats animation only |
| Email sample / screenshot on landing | Partial | Public launch | S | Has stylized showcase cards (`src/components/marketing/LandingPageContent.tsx:290-388`) but no actual email screenshot or rendered example |
| SEO meta + og: tags | Done | Friends pilot | XS | `src/app/layout.tsx:19-45`, `src/app/(marketing)/page.tsx:9-24` |
| Sitemap | Done | Friends pilot | XS | `src/app/sitemap.ts:1-12` |
| Robots.txt | Done | Friends pilot | XS | `src/app/robots.ts:1-13` |
| Favicon + apple icon | Done | Friends pilot | XS | `public/favicon.ico`, `public/icon.png`, `public/apple-touch-icon.png` |
| PWA manifest | Missing | Nice to have | XS | searched `public/`, no `site.webmanifest` |
| og.png (referenced for Twitter card) | Missing | Public launch | XS | `src/app/(marketing)/page.tsx:22` references `/og.png` but file is not in `public/` (only `/api/og` dynamic route exists) |
| Error tracking (Sentry / Highlight / similar) | Missing | Public launch | M | searched `package.json` and `src/`, nothing matches |
| Analytics (PostHog / Plausible / GA) | Missing | Public launch | S | searched, nothing matches |
| Structured logs | Partial | Public launch | M | 72 console.log/error sites in `src/app/api/` (counted via grep); no central log aggregation |
| Stripe webhook event log | Partial | Public launch | S | console.log prefixed `[webhook]` (`src/app/api/stripe/webhook/route.ts:17`) |
| Cron failure alerting | Missing | Public launch | S | `src/app/api/cron/send-briefs/route.ts:112-118` returns 500 on fatal error, but no out-of-band alert |
| Health check endpoint | Done | Friends pilot | XS | `src/app/api/health/route.ts:6-7` (always returns ok, no dependency checks) |
| RLS on profiles / modules / email_logs | Done | Friends pilot | S | `supabase/migrations/001_initial_schema.sql:94-137` |
| Authenticated checks on all dashboard / API routes | Done | Friends pilot | S | every route reviewed (`src/app/api/modules/route.ts:16,38`, `src/app/api/modules/[id]/route.ts:24`, `src/app/api/user/settings/route.ts:34`, etc.) |
| Active middleware does only session refresh | Risky | Friends pilot | S | `src/middleware.ts:1-35` refreshes session but does no protection; root-level `middleware.ts:8-53` (likely dead in src/ layout) has protection logic but is not the canonical Next.js src-mode location |
| Login / signup rate limit | Missing | Public launch | M | App-level rate limit not present on signup or login; relies on Supabase Auth defaults |
| Password reset rate limit | N/A | N/A | N/A | flow does not exist |
| Module create rate limit | Done | Friends pilot | S | 20/hour `src/app/api/modules/route.ts:40-43` |
| Preview generation rate limit | Done | Friends pilot | S | 3/day `src/app/api/email/generate-preview/route.ts:13,48-53` |
| Test-send rate limit | Done | Friends pilot | S | 3/day `src/app/api/email/test-send/route.ts:11,33-38` |
| Onboarding test-email rate limit | Done | Friends pilot | S | 3/hour `src/app/api/onboarding/send-test-email/route.ts:12,47-52` |
| Manual resend cooldown | Done | Friends pilot | S | 6 hours `src/app/api/email/resend/route.ts:9,26-39` |
| Unsubscribe rate limit | Missing | Nice to have | XS | `src/app/api/unsubscribe/route.ts:1-56` has no rate limit (but token-protected) |
| Settings PATCH rate limit | Missing | Public launch | S | `src/app/api/user/settings/route.ts:30-59` has no rate limit |
| Cron secret verification (timing-safe) | Done | Friends pilot | S | `src/app/api/cron/send-briefs/route.ts:33-40,46-48` (warm-cache and test cron also verify) |
| Disposable email blocklist | Missing | Public launch | S | searched (`disposable`, `mailinator`, `tempmail`), nothing matches |
| Server-side IANA timezone validation | Done | Friends pilot | S | `src/lib/validation/timezone.ts:9-24` |
| Prompt-injection sanitizer | Done | Friends pilot | S | `src/lib/security/sanitize.ts:1-70` |
| Secrets in client bundle | Looks clean | Friends pilot | S | server-only secrets only used in `route.ts` and `src/lib/**` server code (admin, cron, stripe, resend) |
| CSP headers | Partial | Public launch | S | `next.config.mjs:42-54` (Content-Security-Policy-**Report-Only**, unsafe-inline + unsafe-eval allowed) |
| HSTS / X-Frame / X-Content-Type / Referrer-Policy headers | Done | Friends pilot | XS | `next.config.mjs:9-58` |
| Env validation at startup | Done | Friends pilot | XS | `src/instrumentation.ts:5-11`, `src/lib/env.ts:1-43` |
| Custom domain mention | Likely | Friends pilot | XS | `dailybriefmail.com` used throughout (`src/lib/email/send.ts:57`, `src/app/sitemap.ts:4`, `src/app/layout.tsx:20`) |
| Resend domain DKIM / SPF / DMARC config | Unknown | Friends pilot | XS | not visible from code; controlled in Resend dashboard and DNS |
| Supabase backups | Unknown | Public launch | XS | requires checking Supabase plan |
| Support email link in app | Missing | Friends pilot | XS | searched (`support@`, `help@`, `contact@`, `feedback@`), nothing matches |
| FAQ / help docs | Missing | Public launch | M | searched, nothing matches |
| Feedback widget or link | Missing | Public launch | S | searched, nothing matches |
| Status page | Missing | Nice to have | S | searched, nothing matches |
| Custom 404 + global error page | Done | Friends pilot | XS | `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx` |
| Image optimization | Likely OK | Friends pilot | XS | landing page does not use `<Image>` (searched), uses SVGs/icons; no remote image hosts configured |
| Cron timeout risk | Risky | Public launch | M | `maxDuration = 60` (`src/app/api/cron/send-briefs/route.ts:17`); pipelines run in parallel via `Promise.allSettled` but heavy AI calls can push past 60s with many users |
| Debug pipeline route gated to non-prod | Done | Friends pilot | XS | `src/app/api/debug/pipeline/route.ts:10-12` returns 404 in production |
| Static dev preview route gated | Risky | Friends pilot | XS | `src/app/api/email/preview-static-dev/route.ts:1-95` has no auth and no env check; comment says "delete after design sign-off" (line 1-3) |

## Detailed findings by dimension

### 1. Auth and account lifecycle

**Found**
- Email + password signup, OAuth (Google + Microsoft Azure), and a "check your email" confirmation card when Supabase returns no session. `src/components/auth/AuthForm.tsx:29-79`.
- Auth callback route exchanges the OAuth code for a session and writes the session cookie onto the redirect response, with a comment explaining why it must do so. `src/app/auth/callback/route.ts:1-39`.
- Account deletion uses `adminClient.auth.admin.deleteUser`. The `profiles` table has `references auth.users on delete cascade` (`supabase/migrations/001_initial_schema.sql:11`) and `modules` + `email_logs` cascade off `profiles.id` (`001_initial_schema.sql:26,37`), so deletion is genuinely cascading.
- Delivery email change: supported via `delivery_email` column (`supabase/migrations/008_delivery_email_verbosity.sql:2`) and PATCH on `/api/user/settings` (`src/app/api/user/settings/route.ts:20-24`).
- Pause / resume daily brief via `is_active` toggle (`src/components/dashboard/SettingsForm.tsx:63-80`).
- Session refresh happens on every matched request via `src/middleware.ts:27`.

**Missing**
- **Password reset is not built.** The "Forgot password?" link is `href="#"` (`src/components/auth/AuthForm.tsx:191`). No `resetPasswordForEmail` call anywhere in the codebase.
- No way to change the auth (login) email from inside the app; only `delivery_email`.
- No "resend confirmation email" link from the "Check your email" card.

**Risky**
- The dual middleware files (`/middleware.ts` and `/src/middleware.ts`) leave ambiguity about which auth logic is live. Page-level redirects do the heavy lifting today.

**Recommendations**
- Add password reset before any pilot invites go out. Supabase makes this 30 minutes of work.
- Delete the unused root-level `middleware.ts` to remove a footgun.

### 2. Billing and subscriptions

**Found**
- Hosted Stripe checkout, well-defended against stale customer IDs between live and test modes. `src/app/api/stripe/checkout/route.ts:79-106`.
- Customer Portal wired up at `src/app/api/stripe/portal/route.ts:6-37` and surfaced from settings (`src/components/dashboard/SettingsForm.tsx:82-93`).
- Webhook handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Sets `subscription_status` and `stripe_customer_id`. `src/app/api/stripe/webhook/route.ts:44-139`.
- Webhook signature verification is correct (`src/app/api/stripe/webhook/route.ts:34`).
- Free vs Pro point limits enforced at module creation (`src/app/api/modules/route.ts:112-117`) and at send time for topic modules (`src/lib/email/pipeline.ts:69-79`).
- Belt-and-suspenders fallback when webhook is slow: `/api/stripe/confirm-upgrade` is called from the dashboard with the session_id on the success redirect (`src/app/api/stripe/confirm-upgrade/route.ts:1-69`).
- "Unlimited" plan partially scaffolded (`src/lib/stripe/plans.ts:39-53`) but env var commented in `.env.example:12`.

**Missing**
- **No `invoice.payment_failed` handler.** This is the dunning trigger; without it, a failed renewal will eventually cause Stripe to fire `subscription.deleted` but the user gets no warning email and no `past_due` state in the app. `src/app/api/stripe/webhook/route.ts:44-145` shows the switch cases.
- No `invoice.paid` handler (no payment-success email).
- No tax handling. Stripe Checkout session params include no `automatic_tax`, `tax_id_collection`, or invoice settings (`src/app/api/stripe/checkout/route.ts:61-77`).
- Refunds are fully manual via Stripe dashboard.

**Risky**
- The check constraint on `subscription_status` (`supabase/migrations/012_fix_check_constraints.sql:6-13`) allows both `pro` and the legacy `active`. The webhook writes `pro` (mapped via `getPlanIdFromPriceId`) for new flows. `getPlanFromSubscriptionStatus` (`src/lib/stripe/plans.ts:62-69`) papers over the legacy value. Fine but means two values mean the same thing.

**Recommendations**
- Add `invoice.payment_failed` to flip to `past_due` and trigger a dunning email.
- Add an `invoice.paid` handler that sends a payment confirmation email (helps deliverability too, by warming up the recipient relationship).

### 3. Email delivery

**Found**
- Resend integration uses lazy singleton clients (`src/lib/email/send.ts:11-15`, `src/app/api/onboarding/send-test-email/route.ts:14-18`).
- Send: `Daily Brief <brief@dailybriefmail.com>` (`src/lib/email/send.ts:57`).
- Subject line includes day and date: `Your Brief — ${format(zonedNow, 'EEEE, MMMM d')}` (`src/lib/email/send.ts:33`).
- Every brief includes an unsubscribe link with an HMAC token (`src/components/email/DailyBriefEmail.tsx:918`).
- Welcome test email exists and is sent only during onboarding (`src/components/email/WelcomeTestEmail.tsx`), not at signup.
- Render is React Email with inline styles only (consistent with email-client requirements).
- The send pipeline writes a row to `email_logs` on both success and failure (`src/lib/email/send.ts:79-95`).

**Missing**
- **Cron timing**: `vercel.json:7-10` fires `/api/cron/send-briefs` once per day at `0 12 * * *` (12:00 UTC). Inside the route, `isSendTime` is intentionally commented out (`src/app/api/cron/send-briefs/route.ts:85-90`) with a TODO that says "re-enable on Pro plan" because Hobby tier only runs cron once daily. Combined effect: regardless of the user's `send_time` and `timezone`, the actual send is right around 12:00 UTC (7 AM ET, 5 AM PT, 8 PM JST). The UI lets users pick a time that never gets respected. This is the single biggest discrepancy between what the product promises and what it does.
- **No physical postal address in the email footer** (CAN-SPAM requires this for commercial email; Gmail's 2024+ bulk sender rules also reward it). Footer code: `src/components/email/DailyBriefEmail.tsx:896-930`.
- **No `List-Unsubscribe` header** (RFC 8058 one-click unsub, Gmail/Yahoo bulk-sender requirement above ~5k/day). Looked at `src/lib/email/send.ts:56-61`, only `from / to / subject / html` are set.
- **No Resend webhook listener.** Searched for `resend-event`, `svix`, `email.bounced`, `email.complained`. Nothing matches. Hard bounces and complaints are not captured.
- **No welcome email at signup.** The "welcome test" email only fires when the user clicks the button inside onboarding (`src/app/api/onboarding/send-test-email/route.ts`).
- **No payment / cancel / failed transactional emails.**

**Risky**
- From-address inconsistency: code sends from `brief@dailybriefmail.com` (`src/lib/email/send.ts:57`), the preview UI labels the from address as `noreply@dailybriefmail.com` (`src/components/dashboard/PreviewClient.tsx:466`). Users will see one and the policy talks about another.
- The `email_logs` `modules_included` column was originally `jsonb` (`001_initial_schema.sql:41`) but the code writes a string array (`src/lib/email/send.ts:90`). Postgres accepts JSON arrays into jsonb, so this works, but it makes querying awkward.

**Recommendations**
- Even on Hobby, you can fan out from a single 12 UTC cron to "send this user's brief now if their localized hour matches" by widening the matching window. Better: move cron to every 15 minutes once you're on Pro, and uncomment `isSendTime`.
- Add a physical address line and `List-Unsubscribe` headers to `send.ts` before pilot invites.
- Stand up a `/api/resend/webhook` listener for `email.bounced` and `email.complained`; auto-set `is_active = false` on hard bounce.

### 4. Onboarding

**Found**
- Two-variant flow (free + pro), with progress dots, in `src/components/onboarding/OnboardingModal.tsx:993-1233`.
- Free path: Welcome → Pick modules (up to 8 selectable; defined by `FREE_ONBOARDING_MODULES` constant, `OnboardingModal.tsx:43`) → Inbox setup (the spam-prevention step) → Finish.
- Pro path: Welcome → Pick modules (all 22 available, see `selectedTypes` flow) → Configure → Inbox setup → Delivery + Stripe.
- The "Inbox setup" step uses `WelcomeTestEmail` to send a real email the user must move to primary inbox (`src/app/api/onboarding/send-test-email/route.ts:1-99`), hourly-rate-limited to 3 per user.
- Modules are saved one by one in `saveModulesAndComplete` with partial-failure tolerance (`OnboardingModal.tsx:1042-1062`); failed modules are surfaced in a `toast.warning`.
- `has_onboarded` flag set on completion (`OnboardingModal.tsx:1065,1031`); skip also flips it (`OnboardingModal.tsx:1027-1034`).

**Missing**
- **No resume.** Onboarding state is local React state. If the user closes the tab on step 3, the gate (`OnboardingGate`) opens at step 0 next time they log in. The bones for resuming are present (`profiles.onboarding_step` column from `supabase/migrations/006_onboarding.sql:2`) but the modal does not write to it.

**Risky**
- "Skip" sets `has_onboarded = true` (`OnboardingModal.tsx:1031`) even if the user has zero modules. They will then get an empty brief or nothing at all. The cron path bails with "No enabled modules found" (`src/lib/email/pipeline.ts:55-56`) so no junk email goes out, but the user state is "onboarded with nothing" silently.

**Recommendations**
- Wire `onboarding_step` updates after each step transition so reload picks up where it left off.
- On Skip, do not flip `has_onboarded` yet; show a dashboard empty-state with a "Finish setup" CTA instead.

### 5. Dashboard and module config

**Found**
- Module list with drag-and-drop reorder (`@dnd-kit/sortable`, `package.json:14-16`) and server endpoint `src/app/api/modules/reorder/route.ts:1-56` which verifies all modules belong to the user before upserting.
- Free vs Pro topic gating enforced at both module-create (points limit, `src/app/api/modules/route.ts:112-117`) and at send time (`src/lib/email/pipeline.ts:69-79`).
- Module config persistence is validated server-side via the per-module Zod schema (`src/app/api/modules/[id]/route.ts:79-83`) including weather geocoding (`src/app/api/modules/[id]/route.ts:62-78`).
- SpecificityTooltip recently added at `src/components/modules/SpecificityTooltip.tsx` (file is new per git status).
- Preview-your-brief at `/dashboard/preview` with 3-per-day limit on Claude generations and 3-per-day on test sends; counters live on `profiles`.
- Resend cooldown (6 hours) prevents repeated full-resend calls (`src/app/api/email/resend/route.ts:9,26-39`).

**Missing**
- Nothing critical.

**Risky**
- The reorder endpoint upserts with `onConflict: 'id'` and re-asserts `user_id` in the payload (`src/app/api/modules/reorder/route.ts:45-48`). That's belt-and-braces but if someone slips a wrong id in, the pre-check at line 33-41 catches it.

**Recommendations**
- Consider adding a max-modules guard on `/api/modules` POST (Pro is 12, Free is 3, but server-side rate limit could still grow display_order indefinitely on rapid retries).

### 6. Legal and compliance

**Found**
- Privacy and Terms pages exist (`src/app/(marketing)/privacy/page.tsx`, `src/app/(marketing)/terms/page.tsx`). Both display an amber "Legal Review Required" banner at the top (`privacy/page.tsx:94-98`, `terms/page.tsx:82-85`) admitting they were AI-drafted.
- Privacy explicitly says only essential session cookies (so no cookie banner needed today).
- Account deletion exists.

**Missing**
- **Real support contact email in legal pages.** Three placeholders: `[add support email before launch]` (`privacy/page.tsx:48,68`, `terms/page.tsx:63`).
- **GDPR / CCPA data export.** Searched, no endpoint.
- **CAN-SPAM physical address in email footer.** Not present.
- Privacy and Terms "Last updated" dates say `May 13, 2025` (`privacy/page.tsx:7`, `terms/page.tsx:7`) but the current session date is 2026-05-18. If launching in 2026, refresh the date or it looks stale.

**Risky**
- Legal pages have not had a human lawyer review (per their own banner). Fine for friends pilot, risky for public launch.

**Recommendations**
- Replace placeholder support emails with a real address (even a forwarder to your personal email). Required before any user can plausibly contact you.
- Add a postal address (PO box is fine) to email footer.
- Have a lawyer skim the privacy and terms before any HN post.

### 7. Marketing site

**Found**
- Single-page landing at `/`: Hero, Problem, Agent (how it works), Module Showcase (Weather/News/Quote/Markets cards), Pricing, Footer. `src/components/marketing/LandingPageContent.tsx:534-549`.
- Metadata for SEO including open graph image at `/api/og` (`src/app/(marketing)/page.tsx:9-24`).
- Sitemap and robots configured.
- Static favicon, icon.png, apple-touch-icon.png in `public/`.

**Missing**
- **No FAQ.**
- **No real testimonials.** Stats bar only (`LandingPageContent.tsx:132-154`).
- **No actual email screenshot or rendered sample.** The showcase cards are stylized previews of section data, not the real email layout that arrives.
- **No `/og.png` static file.** Twitter metadata points at `/og.png` (`src/app/(marketing)/page.tsx:22`), and `public/` only contains `favicon.ico`, `icon.png`, `apple-touch-icon.png`. Open Graph image via `/api/og` (dynamic) is fine; Twitter card image will 404.
- **No PWA web manifest.**

**Risky**
- Footer copyright says `2025` (`LandingPageContent.tsx:507`). Current session date is 2026; will look stale day one.

**Recommendations**
- Drop a static rendered HTML sample of the email into `public/sample.html` and link to it; or render a screenshot.
- Add an FAQ that pre-answers "what does it cost", "what happens to my data", "how do I cancel", "what if my brief is missing something", "can I change my delivery time".

### 8. Observability and ops

**Found**
- Health endpoint that always returns `{ok}` regardless of dependency state (`src/app/api/health/route.ts:6-7`).
- Stripe webhook signature verification and per-step logs (`src/app/api/stripe/webhook/route.ts`).
- Cron secret verification with `timingSafeEqual` (`src/app/api/cron/send-briefs/route.ts:33-40`).
- 72 `console.log` / `console.error` calls across `src/app/api/` (counted via grep). Vercel captures these to function logs but there is no aggregation or alerting.

**Missing**
- **No error tracking.** Searched for Sentry, Highlight, PostHog, Plausible, Google Analytics. None present in `package.json:11-65`.
- **No application analytics.**
- **No cron failure alerting.** A failed cron returns 500 (`src/app/api/cron/send-briefs/route.ts:112-118`) but you only see it if you look.
- **No Resend webhook signature verification** because there's no Resend webhook at all.

**Risky**
- The health endpoint is content-free. A "200 OK" tells you the function executed but nothing about Supabase, Resend, Stripe, or Anthropic being reachable.

**Recommendations**
- Add Sentry (one env var, two import lines, instant value) before pilot.
- Make `/api/health` check Supabase and Resend connectivity.
- Wire a simple "if attempted > 0 and succeeded < attempted then ping me" alert on the cron output.

### 9. Security

**Found**
- All API routes I read check `supabase.auth.getUser` before doing anything (`src/app/api/modules/route.ts:38`, `src/app/api/modules/[id]/route.ts:24`, `src/app/api/user/settings/route.ts:34`, `src/app/api/email/test-send/route.ts:17`, etc.).
- RLS enabled on `profiles`, `modules`, `email_logs` with sensible "own row only" policies (`supabase/migrations/001_initial_schema.sql:94-137`).
- HMAC-signed unsubscribe tokens with timing-safe verification (`src/lib/unsubscribe.ts:30-49`).
- Cron secret comparison is timing-safe (`src/app/api/cron/send-briefs/route.ts:33-40`).
- Prompt-injection sanitizer with patterns for "ignore previous instructions" variants (`src/lib/security/sanitize.ts:7-22`).
- IANA timezone validation server-side (`src/lib/validation/timezone.ts:9-24`).
- Per-user app-level rate limits on the expensive paths: module create (20/hour), checkout (5/hour), preview (3/day), test-send (3/day), resend (6-hour cooldown), onboarding test email (3/hour).
- `next.config.mjs:9-58` sets HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, and a (report-only) CSP.

**Missing**
- **No disposable email blocklist.** Searched `disposable`, `mailinator`, `yopmail`, `tempmail`. Nothing.
- **No app-level rate limit on signup, login, or password reset.** Supabase handles its own rate limiting but you may want explicit guardrails.
- **No rate limit on the unsubscribe POST.** Probably fine (token-protected) but a denial-of-discovery isn't impossible.
- **No rate limit on settings PATCH** (`src/app/api/user/settings/route.ts:30-59`).

**Risky**
- CSP is set to `Content-Security-Policy-Report-Only` (`next.config.mjs:43`) and allows `'unsafe-inline'` and `'unsafe-eval'` in script-src. Until you enforce it, it's documentation, not defense.
- Two middleware files: `/middleware.ts` (root, has redirect logic for `/dashboard` protection and "redirect logged-in users away from /login") and `/src/middleware.ts` (just session refresh). Under Next.js's src/ convention, `/src/middleware.ts` wins. The root file is dead code. The dashboard pages are still protected because each one calls `redirect('/login')` server-side, but a logged-in user can visit `/login` and see the form (no redirect away). Verify this in production behavior.
- The non-production debug route `src/app/api/debug/pipeline/route.ts:10-12` is gated by `NODE_ENV`. The static-dev preview route `src/app/api/email/preview-static-dev/route.ts:1-95` is not gated and has no auth. Comment on line 1-3 says "delete after design sign-off." If shipping, gate or delete.

**Recommendations**
- Delete the root `/middleware.ts` to remove the misleading dead code.
- Gate or delete `src/app/api/email/preview-static-dev/route.ts`.
- Add a basic disposable email blocklist (a single import + `if (BLOCKED_DOMAINS.has(domain)) reject`) before public launch.

### 10. Data and backups

**Found**
- Schema is on Supabase Postgres, all migrations idempotent and forward-only.
- The `daily_cache` (`supabase/migrations/007_daily_cache.sql`) and `search_cache` (`010_search_cache.sql`) tables hold ephemeral data; cleanup happens via `cleanExpiredSearchCache` in the cron (`src/app/api/cron/send-briefs/route.ts:109-111`).

**Missing**
- **No user-facing data export.** GDPR / CCPA on request would require ad hoc Supabase exports.
- Cannot determine from code: which Supabase plan tier, point-in-time recovery, daily snapshots.
- Cannot determine: presence of test data in production DB.

**Recommendations**
- Confirm Supabase plan tier includes daily backups before any paid signups.
- Build a `/api/user/export` route that returns the user's profile + modules + email_logs as JSON for GDPR readiness (small lift).

### 11. Support and feedback

**Found**
- Nothing.

**Missing**
- **No support email anywhere in the app or marketing site.** Searched `support@`, `help@`, `contact@`, `feedback@`. Nothing matches.
- No feedback widget.
- No status page.
- No FAQ or help docs.

**Recommendations**
- At minimum, set up a Google Workspace mailbox at `support@dailybriefmail.com` or use `support@dailybriefmail.com` forwarding to your personal Gmail. Then drop it into the email footer, legal pages, and a single sentence on the landing page. 30 minutes total.

### 12. Performance and hosting

**Found**
- Deployed via Vercel (`.vercel/` directory present, recent commits include "defer createBrowserClient", "lazy stripe proxy", "defer Stripe and Anthropic", "defer Resend"; clearly tuning for cold start).
- Custom domain `dailybriefmail.com` referenced everywhere (`src/lib/email/send.ts:57`, `src/app/sitemap.ts:4`, `src/app/layout.tsx:20`). SSL is implicit on Vercel.
- Cron `maxDuration` set to 60 seconds on send-briefs (`src/app/api/cron/send-briefs/route.ts:17`) and warm-cache.
- No `<Image>` usage on the landing page; SVGs and icon fonts only (lighter).
- Heavy client deps: framer-motion, dnd-kit, several Radix components, but only as needed.

**Missing**
- Nothing critical for friends pilot.

**Risky**
- The 60-second cron `maxDuration` plus a single 12 UTC firing window concentrates load. If 30+ users hit the pipeline simultaneously and each runs a 4-6 second Claude call + Resend send, you can plausibly land near the limit. Already structured with `Promise.allSettled` so a slow user won't block others, but you should watch the cron output during the pilot.

**Recommendations**
- Once on Pro, raise `maxDuration` to 300s and switch the cron schedule to every 15 minutes; uncomment the per-user `isSendTime` check.

## Top 10 things to ship before friends pilot

Ranked by user-impact. Each ordered so they can be tackled in sequence.

1. **Fix the cron timing mismatch.** The product literally promises a custom delivery time and does not deliver it. Either uncomment `isSendTime` and run cron every 15 minutes (requires Pro tier on Vercel) or, as a temporary hack, document in onboarding that the brief currently arrives near 7 AM ET. Effort: S to M. File: `src/app/api/cron/send-briefs/route.ts:85-90` and `vercel.json:7-10`.
2. **Password reset.** Without it, any pilot user who forgets their password is stuck. Effort: S. Files: `src/components/auth/AuthForm.tsx:191` (replace `#` link), add Supabase `auth.resetPasswordForEmail` flow and `/auth/reset-password/page.tsx`.
3. **Real support email in legal + email footer.** Replace `[add support email before launch]` placeholders. Effort: XS. Files: `src/app/(marketing)/privacy/page.tsx:48,68`, `src/app/(marketing)/terms/page.tsx:63`, `src/components/email/DailyBriefEmail.tsx:896-930`.
4. **Physical address + List-Unsubscribe header in email.** CAN-SPAM and Gmail bulk-sender compliance. Effort: S. Files: `src/lib/email/send.ts:56-61` (add `headers: { 'List-Unsubscribe': '<mailto:unsubscribe@…>, <https://…/unsubscribe?token=…>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }`), and address text in `src/components/email/DailyBriefEmail.tsx:896-930`.
5. **Welcome email at signup.** Right now the only welcome-style email is the onboarding "spam test." Effort: S. Add a new `WelcomeEmail.tsx` and trigger from a `handle_new_user` follow-up or a route called from `AuthForm.handleSubmit`.
6. **`invoice.payment_failed` webhook handler.** Without it, a failed renewal silently flips the user to free a week later with no warning. Effort: S. File: `src/app/api/stripe/webhook/route.ts:44-145`, add a case that sets `subscription_status = 'past_due'` and triggers a dunning email.
7. **Resend bounce / complaint webhook.** Today a hard bounce keeps trying daily. Effort: M. Add `src/app/api/resend/webhook/route.ts`, verify signature (Resend uses Svix), flip `is_active = false` on bounce, suppress on complaint.
8. **From-address consistency + delete preview-static-dev route.** Pick `brief@` or `noreply@` and use it in both `src/lib/email/send.ts:57` and `src/components/dashboard/PreviewClient.tsx:466`. Delete or auth-gate `src/app/api/email/preview-static-dev/route.ts`.
9. **Remove root `middleware.ts` and add session-aware redirect for `/login` and `/signup`.** The protection logic that's currently dead in the root middleware (`/middleware.ts:38-50`) should either be revived in `src/middleware.ts` or the dead file removed. Effort: XS.
10. **Wire Sentry (free tier).** One env var, two import lines, immediate visibility into the first hundred users. Effort: XS to S. Files: add `instrumentation.ts` Sentry init and a global error handler.

## Top 10 things to ship before public launch

Assumes the friends-pilot list is done.

1. **FAQ + landing-page email sample.** Add a real screenshot (or rendered HTML embed) of the email and a 6-question FAQ. Files: `src/components/marketing/LandingPageContent.tsx`.
2. **Disposable-email blocklist on signup.** Single function in `src/lib/auth/`, called from a server route or a Supabase database webhook. Add `src/components/auth/AuthForm.tsx` client-side hint.
3. **GDPR data export endpoint.** `GET /api/user/export` returns profile + modules + email_logs JSON. Effort: S.
4. **Dunning email sequence + payment-success email.** Triggered from the new `invoice.payment_failed` and `invoice.paid` webhook cases.
5. **Lawyer-reviewed privacy and terms.** Remove the amber "Legal Review Required" banners (`privacy/page.tsx:94-98`, `terms/page.tsx:82-85`) once a real attorney has signed off. Update `Last updated` dates.
6. **Enforced CSP (not report-only) and remove unsafe-eval.** `next.config.mjs:43`. Audit what actually needs unsafe-inline; the dashboard's Stripe redirect and Supabase auth do, but the script can be hashed or nonce-attached.
7. **Stripe Tax setup.** Add `automatic_tax: { enabled: true }` and `tax_id_collection: { enabled: true }` to checkout session params in `src/app/api/stripe/checkout/route.ts:61-77`. Add address collection.
8. **Persistent onboarding resume.** Write `onboarding_step` to the DB at each step transition (`src/components/onboarding/OnboardingModal.tsx` `setStep` call sites) and load it on `OnboardingGate` mount.
9. **Real health check + minimal status page.** Make `/api/health` ping Supabase + Resend + Anthropic. Stand up `/status` or even a simple incidents tweet.
10. **Tune middleware matcher and remove unused Pro/Unlimited scaffolding.** The `unlimited` plan partially exists (`src/lib/stripe/plans.ts:39-53`, `src/lib/stripe/products.ts`) but `STRIPE_UNLIMITED_PRICE_ID` is commented in `.env.example:12`. Either ship it or remove the dead branches.

## Surprises and red flags

**Pleasant**
- The brief generation pipeline is the most thought-through area. `src/lib/email/pipeline.ts:96-282` has a four-tier cache strategy (daily warm cache, 24-hour static cache for quotes/facts, 12-hour search cache for live data, in-request prefetch), explicit fallbacks for weather when Open-Meteo is down (`pipeline.ts:161-165`), and a dedicated news refinement pass with retry on under-delivery (`pipeline.ts:198-234`).
- Email render has section-level error fallbacks rather than failing the whole email (`src/components/email/DailyBriefEmail.tsx:132-141`).
- Stripe checkout handles stale customer IDs across live/test mode by attempting `customers.retrieve` first and clearing the DB on a `resource_missing` error (`src/app/api/stripe/checkout/route.ts:82-102`). Surprisingly careful.
- Citation-artifact stripping is double-applied: once in news validation, again at render (`src/components/email/DailyBriefEmail.tsx:190-197`). "Defense in depth" comment is exactly right.
- Server-side IANA timezone validation via `Intl.DateTimeFormat` round-trip (`src/lib/validation/timezone.ts:13-23`) is a clever cheap check.
- The whole "move me to your primary inbox" onboarding step is real product thinking. It is the highest-impact deliverability move you can make for a new sender domain.

**Unpleasant**
- **Dual middleware.** Root `middleware.ts` looks like it does auth gating; it doesn't, because Next.js with `src/` uses `src/middleware.ts`. Easy way to convince yourself protection exists when it doesn't.
- **The cron schedule lie.** Users picking a delivery time today are not getting that time. The TODO comment is honest about it (`src/app/api/cron/send-briefs/route.ts:85-90`) but the UI is not.
- **`/api/email/preview-static-dev`** is a no-auth route that renders the full email template with fixture data. File comment says "delete after design sign-off" (`src/app/api/email/preview-static-dev/route.ts:1-3`). Still present.
- **From-address inconsistency** between code (`brief@`) and the preview UI (`noreply@`).
- **"Last updated: May 13, 2025" on privacy and terms** with current session date 2026-05-18.
- **`process.env.FINNHUB_API_KEY`** is referenced in `src/lib/fetchers/markets.ts:32` but is not in `.env.example` or `src/lib/env.ts:5-14`. Markets module will silently fall back to Claude search if unset.
- **Marketing footer says "2025. All rights reserved."** (`src/components/marketing/LandingPageContent.tsx:507`).
- **Two `PLANS` definitions** with conflicting truth: `src/lib/stripe/plans.ts:12-54` (canonical, with point limits and the Unlimited tier) and `src/lib/stripe/products.ts:1-23` (older "Free / Pro only" version used by the landing page). The landing page imports from `products.ts` (`src/components/marketing/LandingPageContent.tsx:20`) so the displayed Pro features come from the older list.
- **The dashboard "Forgot password?" link** is the only TODO-style placeholder I noticed where `href="#"` will actually break user expectations on click.

## Things I could not determine from code alone

- Is `STRIPE_PRO_PRICE_ID` populated in production with a live-mode price ID?
- Is the live-mode Stripe webhook endpoint actually configured at `https://dailybriefmail.com/api/stripe/webhook` with the right signing secret?
- Is `dailybriefmail.com` DNS actually pointing to Vercel? Is SSL active?
- Is the Resend domain `dailybriefmail.com` verified with SPF, DKIM, DMARC records in DNS? (Code uses `brief@dailybriefmail.com` so the domain must be set up in Resend.)
- What Supabase plan tier is the project on, and does that include daily backups + point-in-time recovery?
- Is there test data in the production `profiles`, `modules`, or `email_logs` tables?
- Is email confirmation actually enabled in the Supabase Auth dashboard? The code branches on `!data.session` (`src/components/auth/AuthForm.tsx:39-42`) which only happens when confirmation is on.
- Are Google OAuth and Microsoft Azure OAuth providers actually configured with the correct redirect URIs in the Supabase Auth dashboard?
- Does the Vercel project sit on Hobby or Pro? The cron-once-a-day TODO suggests Hobby; if so, cron can only fire daily (which is what's set up), but `maxDuration` 60s also implies Hobby. Pro raises both.
- Is the `CRON_SECRET` value at least 32 chars (env schema requires this `src/lib/config/env.ts:33`) on Vercel?
- Is the `OPENWEATHER_API_KEY` env var (named in `.env.example:16`) used anywhere? Search returned no result, but it could be referenced via runtime env access in third-party code. Worth removing or wiring up.
- Is the `NEWS_API_KEY` env var (named in `.env.example:17`) used anywhere? Search returned no result.
