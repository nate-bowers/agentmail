# Daily Brief — Architecture & Data Flow

This document explains the complete flow from user configuration to delivered email. It serves as a reference for developers and for AI context in future sessions.

---

## Part 1: User Configures Their Brief

### 1. Adding a module

The user opens the dashboard builder Sheet (`src/components/dashboard/ModuleSheet.tsx`) or goes through onboarding. They select a module type (e.g. `news`) and fill out the configuration form.

Each module has a config form in `src/components/modules/forms/[Name]Form.tsx`. These forms use React Hook Form + Zod validation. The config is a plain JSON object validated by the module's `configSchema`.

Example news config:
```json
{
  "topics": ["artificial intelligence", "startups"],
  "customQuery": "Focus on Series A funding rounds",
  "sources": ["TechCrunch", "The Information"],
  "excludeTopics": "crypto",
  "articleCount": 5
}
```

### 2. Saving the module

On form submit, the frontend POSTs to `/api/modules`:
```json
{
  "module_type": "news",
  "config": { "...above..." },
  "display_order": 2
}
```

### 3. API validation and storage (`src/app/api/modules/route.ts`)

The API route:
- Verifies the user session via Supabase auth
- Validates the request body with Zod
- Calls `getModulePoints(module_type, config)` to calculate point cost
- Checks the user has enough remaining points (3 free / 12 Pro)
- Inserts into the `modules` table: `{ user_id, module_type, config (jsonb), display_order, points, is_enabled }`

### 4. Config storage

The config is stored as a raw JSONB blob in Postgres. It is never interpreted server-side except by:
- The module's `buildSearchInstruction(config)` function (called at generation time)
- The Claude prompt builder (`src/lib/email/generate.ts`)

This means config fields can be extended freely without Postgres schema migrations.

---

## Part 2: The Scheduler Fires

### 1. Cron trigger

Vercel Cron runs `/api/cron/send-briefs` every minute (see `vercel.json` or the route's `schedule`).

### 2. Finding users to send to (`src/app/api/cron/send-briefs/route.ts`)

The route:
- Verifies the `Authorization: Bearer [CRON_SECRET]` header
- Gets the current UTC time (hour + minute)
- Queries Supabase for users where:
  - `is_active = true`
  - `subscription_status IN ('free', 'active')`
  - `send_time AT TIME ZONE timezone` matches the current UTC hour:minute
- Runs each user's pipeline in parallel via `Promise.allSettled`

### 3. Per-user pipeline

For each matched user:
1. Fetch their enabled modules ordered by `display_order`
2. Build search instructions from each module's config
3. Generate the brief via Claude (web search + JSON output)
4. Render the email HTML via React Email
5. Send via Resend
6. Log the result to `email_logs`

---

## Part 3: Building the Claude Prompt

### 1. Search instructions per module

`buildSearchInstructions()` in `src/lib/modules/index.ts` loops over the user's enabled modules. For each:
- Parses and validates the config with the module's Zod schema
- Sanitizes the config (XSS protection)
- Calls `module.buildSearchInstruction(config)` which returns a natural-language string

Example — news module with the config above returns:
> "Search for the top 5 news articles from the last 24 hours about: artificial intelligence, startups. Specifically focus on: Series A funding rounds. Prefer these sources: TechCrunch, The Information. Exclude any articles about: crypto. For each return: headline, source name, and a 2-sentence summary."

### 2. Assembling the prompt (`src/lib/email/generate.ts`)

`buildPrompt()` constructs a single Claude message containing:

```
[CRITICAL INSTRUCTIONS]
Respond only in valid JSON. No markdown. No text before or after.
Include all sections in the order listed. Do not omit sections.
[verbosity instructions based on email theme]

TASKS:
1. [weather] Search for the current weather in Atherton, CA...
2. [news] Search for the top 5 news articles about AI and startups...
3. [quote] Generate a stoic quote from Marcus Aurelius or Seneca...
[etc. for each module in display_order]

[intro instruction: write a personalized 2-3 sentence intro]

[JSON SCHEMA — full shape for all 22 module types]
Only include sections for these modules: weather, news, quote.
Sections must appear in that exact order.
```

The prompt also includes verbosity directives based on the user's email theme:
- `succinct`: "Be concise. 1 sentence max per summary."
- `medium` (default): "2 sentences per summary is ideal."
- `wordy`: "3-4 sentences. Include context and nuance."

### 3. Claude API call

```ts
client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  messages: [{ role: 'user', content: prompt }],
})
```

Claude executes web searches internally (multiple tool calls happen inside the API call). Our code only sees the final text response.

### 4. Extracting the response

The response is a `content` array. We filter for `type === 'text'` blocks and join them. `extractJSON()` strips any accidental markdown fences and finds the outermost `{ }` to isolate the JSON string.

---

## Part 4: Parsing and Validating the Output

### 1. JSON extraction

`extractJSON(raw)` in `src/lib/email/generate.ts`:
1. Tries to match ` ```json ... ``` ` fences first
2. Falls back to finding the first `{` and last `}` to slice out the JSON object

### 2. Parsing

`JSON.parse(cleaned)` converts to a JavaScript object. If this throws, the error is logged and propagated — a `[generate]` log entry with the raw response appears in Vercel logs for debugging.

### 3. Section fallbacks in the email

If Claude returns a section with `data.error = true` (set manually by Claude when it can't fulfil a request), or if a section is missing/malformed, the email renders a `SectionErrorFallback` component: a soft gray box saying "X data is unavailable today." This ensures one failed section never crashes the whole email.

### 4. Parsed shape

```json
{
  "intro": "Good morning Nate. It's shaping up to be a warm Wednesday...",
  "sections": [
    {
      "type": "weather",
      "data": {
        "locations": [
          { "name": "Atherton, CA", "tempF": 72, "condition": "Sunny",
            "humidity": "58%", "high": 76, "low": 61 },
          { "name": "Nashville, TN", "tempF": 68, "condition": "Partly Cloudy",
            "humidity": "71%", "high": 74, "low": 58 }
        ]
      }
    },
    {
      "type": "news",
      "data": {
        "articles": [
          { "headline": "...", "source": "TechCrunch", "summary": "..." }
        ]
      }
    },
    {
      "type": "quote",
      "data": { "text": "...", "author": "Marcus Aurelius" }
    }
  ]
}
```

---

## Part 5: Rendering the HTML Email

### 1. Props

The parsed brief is passed to `DailyBriefEmail` (`src/components/email/DailyBriefEmail.tsx`) along with:
- `userName` — used for the greeting
- `date` — formatted as "Wednesday, May 13, 2026"
- `theme` — the user's `email_theme` setting (resolves to an `EmailTheme` from `src/lib/email/themes.ts`)
- `unsubscribeToken` — HMAC-signed token for the one-click unsubscribe link
- `intro` — the personalized intro paragraph (empty string if theme disables it)

### 2. Why inline styles only

`DailyBriefEmail` uses `@react-email/components` primitives (`<Body>`, `<Container>`, `<Section>`, `<Text>`, etc.). **All styles are inline CSS** — not Tailwind, not external stylesheets. This is non-negotiable for email rendering: email clients (especially Outlook, Gmail on Android) strip `<style>` blocks and external CSS. Inline styles are the only reliable way to control email appearance.

### 3. Theme colors

Every color in the email is derived from `getTheme(theme).colors`:
```ts
const { colors: c } = getTheme(theme ?? 'light');
// c.text, c.muted, c.accent, c.border, c.bg, c.containerBg, c.positive, c.negative
```

No hardcoded hex values appear anywhere in the email template. This is what makes theme switching work — the same component renders correctly for all 5 themes.

### 4. Section dispatch

Inside `DailyBriefEmail`, each section in `brief.sections` is dispatched:
```tsx
{section.type === 'weather' && <WeatherSection data={section.data} c={c} />}
{section.type === 'news' && <NewsSection data={section.data} c={c} />}
// ... all 22 module types
```

Each section renderer receives `data` and `c` (theme colors). If `data?.error` is truthy, it renders `<SectionErrorFallback label="..." c={c} />` instead.

### 5. HTML rendering

`render()` from `@react-email/render` converts the React tree to a self-contained HTML string:
- All styles are inlined by the renderer
- No external CSS, no JavaScript
- Compatible with Gmail, Apple Mail, Outlook, and mobile clients
- Typically 30–80 KB depending on content length

---

## Part 6: Sending the Email

### 1. Resend API call (`src/lib/email/send.ts`)

```ts
resend.emails.send({
  from: 'Daily Brief <noreply@dailybriefmail.com>',
  to: user.email,
  subject: `Your Brief — ${formattedDate}`,
  html: renderedHTML,
})
```

### 2. Delivery infrastructure

Resend handles delivery, bounce processing, and open tracking. The `dailybriefmail.com` domain is configured with DKIM/SPF records in DNS.

### 3. Email log

Win or lose, the result is written to `email_logs`:
```json
{
  "user_id": "...",
  "sent_at": "2026-05-13T07:00:00Z",
  "status": "success",
  "error_message": null,
  "modules_included": ["weather", "news", "quote"],
  "generation_tokens": 2841
}
```

If sending fails, the error is logged but `Promise.allSettled` in the cron ensures other users' sends proceed unaffected.

---

## Part 7: The Consistent Email Format

### Fixed skeleton

Every email has the same structure regardless of content:

```
[Header — logo, date, greeting]
[Intro paragraph — personalized, skipped if theme = 'succinct']
[Section 1 — divider + section heading + content]
[Section 2]
[...]
[Footer — unsubscribe, privacy, terms]
```

Sections always appear in the user's `display_order` from the database.

### Section anatomy

Every section block:
1. Thin horizontal `<Hr />` divider
2. Section heading in `headingStyle(c)`: 13px, uppercase, letter-spacing 0.08em, muted color
3. Section content (varies by module)

Consistent padding: 24px top, 16px bottom for each section.

### Typography scale

| Usage | Size | Weight | Color |
|---|---|---|---|
| Section label | 11–13px | 600 | `c.muted` |
| Content heading | 18px | 600 | `c.text` |
| Body text | 15px | 400 | `c.text` |
| Muted/meta | 13px | 400 | `c.muted` |
| Small detail | 12px | 400 | `c.muted` |

### Spacing rhythm

- Between sections: 24px (from `<Hr />` margin)
- Between heading and content: 8px
- Between list items: 8px
- Between cards (e.g. news articles): 12px

### Width

600px max-width, always `mx-auto`. This is the email industry standard that renders correctly in all clients. Mobile email clients reflow to screen width automatically.

### Fallback safety

Every dynamic value has a fallback:
- `userName || 'there'`
- `date || new Date().toLocaleDateString()`
- Every section renders `<SectionErrorFallback />` if `data?.error` is truthy

---

## Part 8: How to Add a New Module (Checklist)

Follow these steps in order. Each step has exactly one file to create or edit.

### 1. Create the module definition

**File:** `src/lib/modules/[name].ts`

```ts
import { z } from 'zod';
import type { ModuleDefinition } from '@/types';

export const configSchema = z.object({
  // ... fields with .default() values where possible
});

export type MyConfig = z.infer<typeof configSchema>;

export const myModule: ModuleDefinition<typeof configSchema> = {
  type: 'my_module',           // must match DB enum-style string
  label: 'My Module',
  description: 'One sentence.',
  icon: 'IconName',            // exact Lucide icon name
  defaultConfig: { ... } satisfies MyConfig,
  configSchema,
  buildSearchInstruction(config) {
    return `Search for ... Return: ...`;
  },
};
```

### 2. Register in the module index

**File:** `src/lib/modules/index.ts`
- Import the new module export
- Add `[myModule.type]: myModule` to `MODULE_REGISTRY`
- Add the type to `MODULE_DISPLAY_ORDER` at the right position
- Add to `POPULAR_MODULE_TYPES` or `NEW_MODULE_TYPES` as appropriate

### 3. Set the point cost

**File:** `src/lib/modules/points.ts`
- Add `my_module: N` to `MODULE_POINTS`
- Or, if the cost varies by config, add a case to `getModulePoints()`

### 4. Create the config form

**File:** `src/components/modules/forms/MyModuleForm.tsx`

```tsx
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { configSchema, type MyConfig } from '@/lib/modules/my_module';
// ... form primitives

export function MyModuleForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<MyConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: { /* ... */ },
  });
  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as ...)}>
      {/* ... fields */}
    </form>
  );
}
```

Note: `zodResolver(configSchema) as any` is required when Zod schemas use `.default()` fields, due to a type mismatch between Zod v4's input/output distinction and `@hookform/resolvers` v5.

### 5. Wire up the form in ModuleSheet

**File:** `src/components/dashboard/ModuleSheet.tsx`
- Import the new form component
- Add the icon to `ICON_MAP`
- Add a dispatch line: `{selectedType === 'my_module' && <MyModuleForm ... />}`

### 6. Add to the Claude JSON schema

**File:** `src/lib/email/generate.ts`
- Add to the `GeneratedSection` union type
- Add a schema example line to the `buildPrompt()` JSON template string

### 7. Add email rendering

**File:** `src/components/email/DailyBriefEmail.tsx`
- Add any new data interfaces at the top
- Create a `MyModuleSection({ data, c })` function
  - Always check `if (data?.error) return <SectionErrorFallback ... />`
  - Use only inline styles referencing `c` (the theme colors object)
  - Never hardcode hex colors
- Add to the section dispatch: `{section.type === 'my_module' && <MyModuleSection ... />}`

### 8. Update recommendations (optional)

**File:** `src/lib/dashboard/recommendations.ts`
- Add the new module to `getModuleRecommendations()` logic if it should be suggested in specific contexts

### 9. Verify end-to-end

1. Run the dev server: `npm run dev`
2. Add the new module via the dashboard
3. Go to `/dashboard/preview` and generate a preview
4. Confirm the section renders correctly in the email frame
5. Send a test email via the preview page controls
6. Check the email renders in your actual inbox (tests real email client rendering)
7. Run `npm run build` to confirm no TypeScript errors

---

## Database Schema Reference

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Supabase auth user ID |
| email | text | |
| full_name | text | nullable |
| timezone | text | IANA timezone string |
| send_time | time | HH:MM:SS |
| is_active | boolean | whether daily sends are active |
| subscription_status | text | 'free', 'active', 'canceled', 'past_due' |
| email_theme | text | theme ID, default 'light' |
| has_onboarded | boolean | whether onboarding was completed |
| onboarding_step | integer | last completed step |
| test_sends_today | integer | rate limit counter |
| test_sends_date | date | resets daily |

### `modules`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK → profiles.id |
| module_type | text | e.g. 'weather', 'news' |
| config | jsonb | arbitrary config object |
| display_order | integer | sort order in email |
| is_enabled | boolean | soft disable without deleting |
| points | integer | point cost at time of creation |

### `email_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | |
| sent_at | timestamptz | |
| status | text | 'success' or 'failed' |
| error_message | text | nullable |
| modules_included | text[] | array of module types |
| generation_tokens | integer | nullable, total tokens used |

---

## Environment Variables

| Variable | Used in | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Admin operations (delete user, rate limit updates) |
| `ANTHROPIC_API_KEY` | server only | Claude API calls |
| `RESEND_API_KEY` | server only | Email sending |
| `CRON_SECRET` | server only | Authenticates Vercel Cron requests |
| `STRIPE_SECRET_KEY` | server only | Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | server only | Verifies Stripe webhook signatures |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | Stripe checkout redirect |
