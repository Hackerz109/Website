# AI Product Console

A new, additive admin module: a WhatsApp-style chat page where you type a
product-management command in plain English, and it shows you exactly what
would change — before anything is saved.

Nothing in `admin.products.tsx`, the WhatsApp bot, or any other existing
feature was modified beyond two small additive edits (noted below).

## How it works

```
Your command
    ↓
Gemini (server-side): text → structured intent JSON   ← the ONLY thing AI does
    ↓
productMatch.ts + productCommands.ts: fuzzy-match real products, compute
old/new values                                          ← plain TypeScript, no AI
    ↓
Preview shown in chat: products affected, old → new values, count
    ↓
You tap Confirm
    ↓
productCommands.ts writes to Supabase (same admin-only RLS as
admin.products.tsx already enforces)
    ↓
Product/list pages re-fetch automatically (same React Query cache
invalidation admin.products.tsx already uses)
```

**Gemini never touches the database.** It only ever returns a small JSON
object like `{ action: "adjust_price", filter: { brand: "Havells", ... },
price_mode: "percent", price_value: 5, ... }`. All product search, the
preview math, and every write are ordinary TypeScript functions running
through the same Supabase client and RLS policies your other admin pages
already use — there's no code path where AI output reaches the database
directly.

## New files

| File | What it does |
|---|---|
| `src/lib/aiConsole.server.ts` | Server-only. Calls Gemini with a fixed JSON schema, validates the response with zod. Never imports Supabase. |
| `src/lib/productMatch.ts` | Pure functions: brand/category/keyword/size-text scoring. No network or DB calls — this is what makes "Havells 1mm" match "Havells Lifeline FR 1.0 sq mm Copper Wire" (it treats `mm` and `sq mm` as equivalent when scoring, since that's how the size is spoken in the shop, and requires exact numeric agreement). |
| `src/lib/productCommands.ts` | The "safe predefined functions" layer: fetches products+variants, builds previews, and applies confirmed changes. This is what plays the role of the `searchProduct()` / `updatePrice()` / etc. functions from the spec — see mapping below. |
| `src/routes/api.ai-console.ts` | API route. Verifies the caller is a signed-in admin (same `user_roles` check pattern as `api.refund-razorpay-payment.ts`), rate-limits, then calls Gemini. Holds the only place `GEMINI_API_KEY` is read. |
| `src/routes/admin.ai-console.tsx` | The chat page itself. |

### Function-name mapping

The brief listed `searchProduct()`, `updateStock()`, `updatePrice()`,
`updateDescription()`, `updateCategory()`, `getLowStockProducts()`. I split
each into a **preview** step and an **apply** step (so nothing writes until
you confirm) rather than one function that does both:

- `searchProduct()` → `searchProductLines()` (internal to `buildPreview`) — also powers the plain "show/find" command and the low-stock query.
- `updatePrice()` → `buildPreview()` (kind `"price"`) + `applyPriceRows()`
- `updateStock()` → `buildPreview()` (kind `"stock"`) + `applyStockRows()`
- `updateDescription()` → `buildPreview()` (kind `"description"`) + `applyDescriptionRows()`
- `updateCategory()` → `buildPreview()` (kind `"category"`) + `applyCategoryRows()`
- `getLowStockProducts()` → `buildPreview()` (kind `"low_stock"`)

## Edited files (additive only)

- **`src/routes/admin.tsx`** — added one nav entry ("AI Console") and one icon import. No existing nav items touched.
- **`src/lib/rateLimit.server.ts`** — added `"user"` as a third `IdentifierType` (alongside existing `"email"`/`"ip"`/`"device"`) and one new `ai_console` scope to `RATE_LIMIT_CONFIGS`. Every existing scope's config is untouched.
- **`src/routeTree.gen.ts`** — manually registered the two new routes, same manual-patch situation documented at the top of that file already (the Vite plugin doesn't reliably pick up new route files). Full rebuild-from-scratch is also safe any time; these are just additive entries.

## Setup required before this works

Add an environment variable to wherever your `RAZORPAY_KEY_SECRET` /
`BREVO_SMTP_*` variables already live (your Vercel/Cloudflare project
settings — same place, since this is a TanStack Start server route, not a
Supabase edge function):

```
GEMINI_API_KEY=your-key-from-Google-AI-Studio
```

Get a key at [aistudio.google.com](https://aistudio.google.com/apikey).
Optional: `GEMINI_MODEL` to override the default (`gemini-3.6-flash`, the
current stable flash model as of July 2026) if Google ships something
better/cheaper later — no code change needed, just set the env var.

Nothing else needs configuring — the admin-only check reuses your existing
`user_roles` table, and rate limiting reuses your existing `rate_limits`
table.

## Safety notes

- **Admin-gated twice over**: the API route checks `user_roles` before
  spending a Gemini call, *and* every actual write still goes through the
  same "admin update products/product_variants" RLS policies as the rest of
  the admin panel. A bug in the new code can't grant a non-admin write
  access — RLS is the real enforcement either way.
- **Rate-limited**: 60 commands/hour per admin, 120/hour per IP, mainly to
  cap Gemini API cost if something goes wrong (e.g. a runaway retry loop),
  not for security. Locks release after 5 minutes.
- **The preview is the real safety net.** Fuzzy matching is inherently
  imperfect — the point of "Found 32 products… old avg ₹1200 → new avg
  ₹1250, [Confirm] [Cancel]" is that you always see what would change,
  including a scrollable list of the actual product names, before
  confirming. If a command ever matches something unexpected, just tap
  Cancel — nothing is written until Confirm.
- **Description/category updates apply the same text/category to every
  matched product.** That's intentional (so "move all Havells fans to
  Fans" works in one command), but means a too-broad brand/category filter
  on a description update could overwrite more products' descriptions than
  intended — the preview lists every product it would touch, so check it
  before confirming, especially for a description change.
- Existing open items from `SECURITY_REVIEW.md` (no CSP header yet, `npm
  audit` not run) are unrelated to this module and still outstanding.

## Known limitations

- Size matching only recognizes common electrical units (mm, sq mm, cm, m,
  W, A, V, L, kg, hp, rpm, Hz, etc.) baked into `productMatch.ts`. If you
  sell something with an unusual unit that doesn't parse, the command will
  still work but won't get the size-match confidence boost — it'll still
  work off brand/category/keywords, just less precisely.
- One command = one intent. "Increase Havells wire prices by 5% and also
  restock the 1.5mm ones" would only act on the first part — ask as two
  separate commands.
- Conversation memory is short (last 6 turns) — enough for a quick
  follow-up like "do the same for Polycab", not a long multi-step
  negotiation.
