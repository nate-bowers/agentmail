# Launch Readiness — Manual TODOs

Generated 2026-05-21 after a five-batch hardening pass. The codebase is
materially more launch-ready than five commits ago — every item below is
something I could not finish from inside the codebase, either because it
touches an external system, requires a schema change, or is a content gap
that needs you to write the copy / make a product call.

See the `feat:` commits from `4b529ef..edfb1df` for everything that was
shipped in code.

---

## What blocks public launch

These three are the ones I'd fix before pointing real traffic at the site.

### 1. Stripe webhook events not subscribed
The webhook handler now understands `invoice.payment_failed` and
`invoice.paid`, but Stripe will only deliver them if you subscribe.

- Stripe Dashboard → Developers → Webhooks → your endpoint → "+ Select events"
- Add: `invoice.payment_failed`, `invoice.paid`
- Verify the existing three are still selected: `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`
- Test with card `4000 0000 0000 0341` in test mode — succeeds at first,
  fails on renewal. Confirm the downgrade-to-free transition fires.

### 2. Distributed rate limiting
`src/lib/security/rateLimit.ts` is in-memory and resets per Vercel
instance — effectively no limit on serverless. The endpoints that need
real protection before public launch are:

- `/api/auth/forgot-password` — open to anyone, can probe for valid emails
- `/api/email/preview-html` — burns Claude tokens, currently unlimited
- `/api/email/test-send` — burns Resend sends
- `/api/email/welcome-email` — can be hit repeatedly per user
- `/api/onboarding/send-test-email`

Recommended: provision Upstash Redis (free tier covers our scale),
`pnpm add @upstash/ratelimit @upstash/redis`, swap `rateLimit()` to use
`Ratelimit.slidingWindow`. Total work is one helper file + 5 call-site
edits.

### 3. External uptime monitor
`/api/health` exists and returns boolean + latency for Supabase, Resend,
and Anthropic. Nothing is polling it.

- Sign up for UptimeRobot / Better Stack / Cronitor
- Point a 5-minute HTTP check at `https://dailybriefmail.com/api/health`
- Alert on `status !== "ok"` or HTTP `503`
- Optional: pass `?token=$HEALTH_DEBUG_TOKEN` to get full error detail
  in the alert body

---

## Required Vercel environment variables

Verify each of these is set in **Production** (and ideally Preview).

| Var | Required? | Notes |
|-----|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server-only |
| `ANTHROPIC_API_KEY` | yes | |
| `RESEND_API_KEY` | yes | restricted send-only key is fine |
| `RESEND_WEBHOOK_SECRET` | yes | from Resend dashboard, starts `whsec_` |
| `STRIPE_SECRET_KEY` | yes | |
| `STRIPE_WEBHOOK_SECRET` | yes | from Stripe dashboard |
| `STRIPE_PRO_PRICE_ID` | yes | |
| `UNSUBSCRIBE_SECRET` | yes | any 32+ char random string |
| `CRON_SECRET` | yes | any 32+ char random string |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://dailybriefmail.com` |
| `BUSINESS_MAILING_ADDRESS` | yes | CAN-SPAM physical address |
| `ALERT_EMAIL` | recommended | where cron failure alerts go |
| `HEALTH_DEBUG_TOKEN` | optional | enables full detail on `/api/health?token=...` |

---

## DNS / Email infrastructure

### Set up `support@dailybriefmail.com`
The new privacy/terms pages and the cron alert path reference this address.
Set up either a real mailbox or forwarding (Cloudflare Email Routing or
Google Workspace).

### Optional: separate sender for test sends
The current behavior is "any hard bounce deactivates the user." This is
the right floor, but a clean fix is provisioning `test.dailybriefmail.com`
as a separate Resend sender domain and routing `test-send`/`resend`
routes through it. Then real-traffic reputation never gets near the test
flow. Skip unless you see false-positive deactivations in the wild.

---

## Stripe configuration

1. Webhook events subscribed (see Blocker #1 above).
2. **Smart Retries** is enabled by default — leave it.
3. **Customer Portal** is configured: Settings → Billing → Customer portal.
   Confirm cancellation, payment method update, and invoice download are
   all enabled.
4. Run the full dunning loop in test mode at least once.

---

## Vercel platform settings

- Confirm both cron entries exist: Settings → Crons should show
  `/api/cron/warm-cache` (04:00 UTC) and **two** entries for
  `/api/cron/send-briefs` (12:00 UTC and 16:00 UTC). Hobby plan caps cron
  count — Pro removes that.
- If the morning cron starts timing out: bump `maxDuration` on
  `/api/cron/send-briefs` from `60` to `300`. Requires Pro plan.
- Verify Sentry is wired and `SENTRY_DSN` is set. Sample rate is 10% on
  traces — errors are full-rate.

---

## Content / product gaps

### Help / support page
There is no `/help` or `/faq` page. The only "contact" affordance is a
`mailto:` link in the marketing TopNav. You'll be the support desk on
day 1 without one.

- Recommended: `/help` page with 8–12 FAQs (delivery time, modules,
  pricing, unsubscribe, data export, account deletion) + a contact form
  that POSTs to a notification webhook.

### Dunning email
The Stripe webhook now logs `invoice.payment_failed` events with a TODO.
A user-facing "your card was declined" email template needs writing.

- Template should live at `src/components/email/PaymentFailedEmail.tsx`
- Add a `sendPaymentFailedEmail(userId, attemptCount, nextAttempt)`
  helper in `src/lib/email/sendPaymentFailed.ts`
- Call it from the `invoice.payment_failed` branch of the Stripe webhook

### Custom OG image
The twitter card now uses `/api/og` (already wired), which works but
renders dynamically. A hand-designed 1200×630 PNG would feel sharper.
Drop into `public/og.png` and revert the twitter card image to
`'/og.png'` in `src/app/(marketing)/page.tsx`.

### Age gate
Both legal pages claim 13+ but no UI checkbox is shown at signup. Either
add a single line on the signup form ("I'm 13 or older") or remove the
claim from the legal copy.

### Send-history UI
`email_logs` has RLS read access for each user, but no dashboard page
surfaces it. Users will eventually ask "did today's send fail?" — give
them a `/dashboard/history` page that lists the last 30 entries with
status and timestamp.

---

## Schema migrations to consider

Three improvements I deliberately didn't ship because each requires a DB
migration you'll want to apply yourself.

### A. Stripe webhook event-id idempotency
**Table:** `stripe_processed_events (event_id text primary key, processed_at timestamptz default now())`

The handler currently relies on the idempotency of our DB updates. That
holds for the existing handlers but breaks for any future handler that
isn't naturally idempotent. INSERT on `event_id` with `on conflict do
nothing` short-circuits duplicate events.

### B. Unsubscribe token versioning
**Column:** `profiles.unsubscribe_version int default 1`

Today's tokens are deterministic and non-expiring. A leaked token works
forever. Embed the version in the HMAC payload and bump the column when
revoking.

### C. DB-backed rate limit (if not using Upstash)
**Table:** `rate_limit_attempts (key text, window_start timestamptz, count int)`

Alternative to Blocker #2 if you'd rather stay on Supabase. The Upstash
route is faster and recommended.

---

## Final pre-launch checklist

- [ ] Stripe test-mode dunning loop end-to-end
- [ ] All env vars present in Vercel Production
- [ ] Signup → welcome → first brief tested on a fresh account
- [ ] Unsubscribe link tested from a real Gmail inbox (one-click + page)
- [ ] At least one external monitor pointed at `/api/health`
- [ ] `support@dailybriefmail.com` mailbox exists and is monitored
- [ ] Webhook events subscribed in Stripe Dashboard
- [ ] `ALERT_EMAIL` set and verified (send yourself a test failure alert)
- [ ] Crons visible in Vercel Settings → Crons (3 entries)
- [ ] `/help` page exists OR you've accepted the support load

---

## Polish items I left in place (flag if you disagree)

These appeared in the audit but I judged the cost of fixing outweighed
the value. Surface anything you want me to revisit.

- All-modules-disabled empty state on dashboard
- `static_cache` table cleanup with date-prefix deletes (slow leak)
- Mix of raw hex (`#666`, `#999`, `#bbb`) vs brand tokens — visual debt,
  no functional issue
- Pause-brief toggle confirm dialog — single click is fine, undoable
- Dead routes: `/dashboard/builder`, `src/components/dashboard/ModuleCard.tsx`

---

## What shipped this pass

Five batches, 36 files modified. Summary by commit:

- **`4b529ef`** — Stripe dunning handlers, cron idempotency by local date,
  catch-up cron at 16:00 UTC, leak fixes in cron + cron-test responses,
  constant-time secret + prod-gate on `/api/cron/test`.
- **`d8a2c23`** — Truncation check on Claude output, per-section
  `?? []` guards in `DailyBriefEmail.tsx`, `isErrorPayload` strips
  null/non-object payloads, welcome-flag revert on Resend error,
  hard-bounce-only deactivation, PostgREST injection fix in Resend
  webhook lookup.
- **`9a8a92e`** — `next` redirect validation in `/auth/callback`,
  `delete` action removed from token-only unsubscribe path, `/api/health`
  returns redacted shape to unauth callers, `/api/email/preview-static-dev`
  prod gate.
- **`64e29ef`** — Em-dash purge across user-facing copy, 44px mobile tap
  targets on `Button` and `Input`, Medium pill in the verbosity selector,
  persistent X close on OnboardingModal, debug `console.log` removal,
  typed-email confirm + server signOut on account delete.
- **`edfb1df`** — OG image broken ref fixed, robots.ts blocks
  non-production Vercel envs, mobile sign-in restored in TopNav,
  reset-password skeleton instead of pre-validation form flash.
