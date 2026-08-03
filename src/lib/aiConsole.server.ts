/**
 * AI Product Console — command understanding, server-side only.
 *
 * SECURITY MODEL (read this before changing anything):
 * Gemini is used for exactly one thing here — turning a free-text admin
 * command into a small, strictly-typed JSON "intent" object. It is never
 * given database access, never asked to write SQL, and never asked to
 * produce anything that gets `eval`'d or executed directly. The intent it
 * returns is just data: an action name plus filter/value fields. All of the
 * actual product matching, preview building, and database writes happen in
 * plain TypeScript in src/lib/productCommands.ts, which only the browser
 * (RLS-protected, admin-only-write) Supabase client ever touches.
 *
 * So even if Gemini were tricked into returning a malicious-looking intent
 * (e.g. an absurd percentage, or a filter matching every product), the
 * worst case is a large-but-legitimate-shaped preview that the admin still
 * has to explicitly confirm — never an arbitrary DB operation.
 *
 * Model: gemini-3.6-flash (GA as of July 2026). Override with the
 * GEMINI_MODEL env var if Google ships a better/cheaper fit later — this
 * is a short structured-extraction call, not a heavy reasoning task, so a
 * flash-tier model is the right pick on cost alone.
 */
import { z } from "zod";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
// Intent shape — the ONLY thing Gemini is allowed to produce.
// ---------------------------------------------------------------------------

const ACTIONS = [
  "search",
  "low_stock",
  "set_price",
  "adjust_price",
  "set_stock",
  "adjust_stock",
  "update_description",
  "update_category",
  "unclear",
] as const;

export const CommandFilterSchema = z.object({
  brand: z.string().nullable(),
  category: z.string().nullable(),
  // Free-text keywords the product's name/description should contain
  // (e.g. ["copper", "wire"]). Kept separate from brand/category so the
  // matcher can weight them differently.
  keywords: z.array(z.string()).nullable(),
  // A size/spec token as the admin typed or implied it, e.g. "1mm", "1.5 sq mm",
  // "90m", "20W". Left as free text — normalization happens in TS, not here.
  size_text: z.string().nullable(),
  // If the admin referred to one specific product by something close to
  // its full name, put the best-guess full/partial name here.
  name_hint: z.string().nullable(),
});
export type CommandFilter = z.infer<typeof CommandFilterSchema>;

export const CommandIntentSchema = z.object({
  action: z.enum(ACTIONS),
  filter: CommandFilterSchema,
  // set_price / adjust_price. "none" (rather than null) when the action
  // isn't a price action — Gemini's schema validator can reject an enum
  // field that's also marked nullable, so these three fields use an
  // explicit "none" sentinel instead of null.
  price_mode: z.enum(["fixed", "percent", "none"]),
  price_direction: z.enum(["increase", "decrease", "set", "none"]),
  price_value: z.number().nullable(),
  // set_stock / adjust_stock
  stock_direction: z.enum(["increase", "decrease", "set", "none"]),
  stock_value: z.number().nullable(),
  // update_description
  new_description: z.string().nullable(),
  // update_category
  new_category: z.string().nullable(),
  // low_stock
  stock_threshold: z.number().nullable(),
  // A short, human-readable restatement of what the admin asked for, shown
  // in the chat above the preview (e.g. "Increase Havells wire prices by ₹50").
  summary: z.string(),
  // Set when action is "unclear" (or Gemini is genuinely unsure) — shown to
  // the admin instead of a preview.
  clarification: z.string().nullable(),
});
export type CommandIntent = z.infer<typeof CommandIntentSchema>;

// One admin message can contain several distinct instructions at once
// ("set the Havells fan stock to 5 and the Anchor switch price to 120") —
// Gemini now always returns an ARRAY of intents, one per distinct
// instruction, even when there's only one (a single-item array). This is
// the only shape change from the original one-intent-per-command design;
// everything downstream (productMatch.ts, productCommands.ts) still only
// ever sees one CommandIntent at a time, via buildPreview(intent).
export const CommandIntentListSchema = z.array(CommandIntentSchema).min(1);
export type CommandIntentList = z.infer<typeof CommandIntentListSchema>;

// JSON Schema (not zod) — this is what actually gets sent to Gemini's
// responseSchema so generation is constrained at the model level. Kept in
// sync with CommandIntentSchema by hand; the zod parse below is the safety
// net if the two ever drift.
//
// IMPORTANT: the classic generateContent REST endpoint (used below) expects
// the older OpenAPI-3.0-style schema: uppercase type names ("STRING",
// "OBJECT", "NUMBER", "ARRAY") plus a separate `nullable: true` flag — NOT
// JSON-Schema-style type arrays like ["string","null"] (that syntax belongs
// to Google's newer, separate Interactions API and gets rejected here with
// a 400). Enum fields also avoid `nullable: true` (some Gemini versions
// reject enum+nullable together) — they use an explicit "none" value
// instead wherever null would otherwise be needed.
const GEMINI_INTENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    action: { type: "STRING", enum: ACTIONS as unknown as string[] },
    filter: {
      type: "OBJECT",
      properties: {
        brand: { type: "STRING", nullable: true },
        category: { type: "STRING", nullable: true },
        keywords: { type: "ARRAY", items: { type: "STRING" }, nullable: true },
        size_text: { type: "STRING", nullable: true },
        name_hint: { type: "STRING", nullable: true },
      },
      required: ["brand", "category", "keywords", "size_text", "name_hint"],
    },
    price_mode: { type: "STRING", enum: ["fixed", "percent", "none"] },
    price_direction: { type: "STRING", enum: ["increase", "decrease", "set", "none"] },
    price_value: { type: "NUMBER", nullable: true },
    stock_direction: { type: "STRING", enum: ["increase", "decrease", "set", "none"] },
    stock_value: { type: "NUMBER", nullable: true },
    new_description: { type: "STRING", nullable: true },
    new_category: { type: "STRING", nullable: true },
    stock_threshold: { type: "NUMBER", nullable: true },
    summary: { type: "STRING" },
    clarification: { type: "STRING", nullable: true },
  },
  required: [
    "action",
    "filter",
    "price_mode",
    "price_direction",
    "price_value",
    "stock_direction",
    "stock_value",
    "new_description",
    "new_category",
    "stock_threshold",
    "summary",
    "clarification",
  ],
};

// Top-level response is now always an ARRAY of intents — one element per
// distinct instruction found in the admin's message (a single instruction
// still comes back as a one-item array). See CommandIntentListSchema above
// for the zod-side validation of this same shape.
const GEMINI_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: GEMINI_INTENT_SCHEMA,
};

const SYSTEM_INSTRUCTION = `You are the command-understanding layer for an electrical goods shop's admin console. You NEVER touch a database and you NEVER execute anything — your only job is to convert one admin message into a JSON ARRAY of intent objects matching the given schema, one object per distinct instruction. Nothing else reads or acts on your output except a strict validator and a search/preview step, so precision matters more than confidence.

Store context: an Indian electrical products shop selling wires, switches, fans, lights, MCBs, appliances etc. Product names commonly look like "Havells Lifeline FR 1.0 sq mm Copper Wire" or "Anchor Roma 6A Switch" — i.e. Brand + Product line + Size/Rating + generic noun.

Multiple instructions in one message:
- An admin message can contain several distinct instructions at once, e.g. "set the Havells fan stock to 5, put the Anchor switch price at ₹120, and increase Polycab wire prices by 5%". Return one array item PER distinct instruction, in the order the admin gave them — each with its own filter and its own action/value fields, evaluated independently.
- Only split when the admin actually names separate actions or separate targets. A single instruction that happens to match many products (e.g. "increase all Havells wire prices by 5%") is still ONE array item — split by how many separate things the admin asked for, never by how many products an item will end up matching.
- If the message is just one instruction, return an array with exactly one item — always an array, never a bare object.
- Cap yourself at 8 items even if the message lists more; extract the first 8 in order.
- Each array item gets its own preview that the admin reviews and confirms separately, so when a clause is genuinely ambiguous between "one instruction" and "two", prefer splitting it — an extra preview card the admin can cancel is safer than silently merging two different requests together.

Rules for EACH item in the array:
- Pick exactly one "action":
  - "search" — admin wants to see/find products, no change requested.
  - "low_stock" — admin wants products below some stock threshold. Default stock_threshold to 10 if the admin didn't give a number.
  - "set_price" — set price to an exact new amount. price_mode "fixed", price_direction "set", price_value = the target rupee amount.
  - "adjust_price" — change price by an amount or percent. price_mode "fixed" (rupees) or "percent". price_direction "increase" or "decrease". price_value = the magnitude (always positive; direction carries the sign).
  - "set_stock" — set stock to an exact number. stock_direction "set", stock_value = target quantity.
  - "adjust_stock" — add or remove units. stock_direction "increase" or "decrease", stock_value = magnitude (always positive).
  - "update_description" — new_description = the requested new text (only if the admin actually dictated or clearly implied new text; otherwise use "unclear" and ask what the new description should say).
  - "update_category" — new_category = the target category name.
  - "unclear" — this particular instruction doesn't map cleanly to any action above, is empty, or is missing a value you cannot infer (e.g. "increase Havells prices" with no amount). Set "clarification" to a short, specific question. One item being unclear doesn't affect the others in the array.
- "filter" narrows which products THIS item's action applies to. Fill in whatever the admin implied for this instruction specifically:
  - brand: only a known electrical-goods manufacturer/company name (e.g. "Havells", "Polycab", "Anchor", "V-Guard", "Finolex", "Crompton", "Orient", "Legrand", "Bajaj"). If a proper noun in the command doesn't clearly read as a manufacturer, don't guess — put it in name_hint instead (it might be a product line, model name, or nickname rather than a brand).
  - category: a product category/type if mentioned (e.g. "wire", "switch", "fan", "MCB"), as a plain generic noun.
  - size_text: any size/rating/spec token mentioned, verbatim-ish (e.g. "1mm", "1.5 sq mm", "6A", "9W", "1200mm"). Do not try to normalize units yourself — just capture what was said.
  - keywords: any other distinguishing words worth matching against product name/description (e.g. "copper", "FR", "lifeline"), and ALWAYS including color or other variant-specific words if mentioned (e.g. "white", "black", "2-way") — these matter for narrowing down to one specific variant of a product that comes in several. Omit brand/category/size words here — they already have their own fields.
  - name_hint: if the admin named something close to a full product name, put your best reconstruction of it here.
  - Any field you have no information for must be null (use null for keywords too if none) — EXCEPT price_mode, price_direction, and stock_direction, which are never null: use the literal string "none" for whichever of these don't apply to the chosen action (e.g. a "search" or "update_description" command should have price_mode "none", price_direction "none", stock_direction "none").
- "summary" is one short plain-English sentence restating THIS item's request, for display to the admin above its own preview — e.g. "Increase Havells wire prices by ₹50" or "Show products with stock below 10".
- Never invent a specific rupee/percent/quantity value that wasn't stated or clearly implied. If a needed value is missing for one item, use action "unclear" for that item only — don't let it block the other items in the array.
- Numbers: price_value and stock_value are always positive magnitudes; increase/decrease/set is carried separately in price_direction/stock_direction. Both default to "none" whenever the action isn't a price/stock action.
- If the admin's entire message is a vague chat message unrelated to product management (greeting, thanks, unrelated question), return a single-item array with action "unclear" and a brief clarification like "I can help with product prices, stock, descriptions, and categories — try a command like 'increase Havells wire prices by 5%'."`;

// ---------------------------------------------------------------------------
// Conversation context — short, since this only needs to disambiguate things
// like "do the same for the 1.5mm one" referring to the previous command.
// ---------------------------------------------------------------------------

export type ConsoleTurn = { role: "admin" | "assistant"; text: string };

function buildContents(command: string, history: ConsoleTurn[]) {
  const trimmedHistory = history.slice(-6); // last few turns is plenty of context
  const contents = trimmedHistory.map((turn) => ({
    role: turn.role === "admin" ? "user" : "model",
    parts: [{ text: turn.text }],
  }));
  contents.push({ role: "user", parts: [{ text: command }] });
  return contents;
}

export type ParseCommandResult = { ok: true; intents: CommandIntent[] } | { ok: false; error: string };

// Hard ceiling on how many instructions one message can produce, independent
// of whatever Gemini was told — protects the preview UI and the eventual
// batch of DB writes from an absurdly long message, same spirit as the
// existing 500-char command length cap in api.ai-console.ts.
const MAX_INTENTS_PER_COMMAND = 8;

/** Calls Gemini to turn one free-text admin command into one or more
 * structured intents (one per distinct instruction in the message). Pure
 * NLU — no DB access happens in this function or anywhere it calls into. */
export async function parseCommandWithGemini(command: string, history: ConsoleTurn[]): Promise<ParseCommandResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[ai-console] GEMINI_API_KEY is not set");
    return { ok: false, error: "The AI console isn't configured yet — ask your developer to set GEMINI_API_KEY." };
  }

  const body = {
    contents: buildContents(command, history),
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[ai-console] Gemini fetch threw", err);
    return { ok: false, error: "Couldn't reach the AI service — check your connection and try again." };
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[ai-console] Gemini API error", res.status, errText);
    if (res.status === 429) return { ok: false, error: "The AI service is rate-limited right now — try again in a moment." };
    return { ok: false, error: "The AI service couldn't process that command right now." };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "The AI service returned something unexpected." };
  }

  const text = extractText(data);
  if (!text) {
    console.error("[ai-console] Gemini response had no text part", JSON.stringify(data).slice(0, 500));
    return { ok: false, error: "The AI service didn't return a usable response." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    console.error("[ai-console] Gemini response wasn't valid JSON:", text.slice(0, 500));
    return { ok: false, error: "Couldn't understand that command — try rephrasing it." };
  }

  // Backward-compat: if an older/odd model response ever comes back as a
  // bare object instead of a one-item array, treat it as a single intent
  // rather than failing outright.
  const asArray = Array.isArray(parsedJson) ? parsedJson : [parsedJson];

  const validated = CommandIntentListSchema.safeParse(asArray);
  if (!validated.success) {
    console.error("[ai-console] Gemini response failed schema validation", validated.error.message);
    return { ok: false, error: "Couldn't understand that command — try rephrasing it." };
  }

  return { ok: true, intents: validated.data.slice(0, MAX_INTENTS_PER_COMMAND) };
}

function extractText(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const candidates = (data as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const content = (candidates[0] as Record<string, unknown>)?.content;
  const parts = (content as Record<string, unknown>)?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const first = parts[0] as Record<string, unknown>;
  return typeof first.text === "string" ? first.text : null;
}
