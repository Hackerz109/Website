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
  // set_price / adjust_price
  price_mode: z.enum(["fixed", "percent"]).nullable(),
  price_direction: z.enum(["increase", "decrease", "set"]).nullable(),
  price_value: z.number().nullable(),
  // set_stock / adjust_stock
  stock_direction: z.enum(["increase", "decrease", "set"]).nullable(),
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

// JSON Schema (not zod) — this is what actually gets sent to Gemini's
// responseSchema so generation is constrained at the model level. Kept in
// sync with CommandIntentSchema by hand; the zod parse below is the safety
// net if the two ever drift.
const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ACTIONS as unknown as string[] },
    filter: {
      type: "object",
      properties: {
        brand: { type: ["string", "null"] },
        category: { type: ["string", "null"] },
        keywords: { type: ["array", "null"], items: { type: "string" } },
        size_text: { type: ["string", "null"] },
        name_hint: { type: ["string", "null"] },
      },
      required: ["brand", "category", "keywords", "size_text", "name_hint"],
    },
    price_mode: { type: ["string", "null"], enum: ["fixed", "percent", null] },
    price_direction: { type: ["string", "null"], enum: ["increase", "decrease", "set", null] },
    price_value: { type: ["number", "null"] },
    stock_direction: { type: ["string", "null"], enum: ["increase", "decrease", "set", null] },
    stock_value: { type: ["number", "null"] },
    new_description: { type: ["string", "null"] },
    new_category: { type: ["string", "null"] },
    stock_threshold: { type: ["number", "null"] },
    summary: { type: "string" },
    clarification: { type: ["string", "null"] },
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

const SYSTEM_INSTRUCTION = `You are the command-understanding layer for an electrical goods shop's admin console. You NEVER touch a database and you NEVER execute anything — your only job is to convert one admin command into a JSON object matching the given schema. Nothing else reads or acts on your output except a strict validator and a search/preview step, so precision matters more than confidence.

Store context: an Indian electrical products shop selling wires, switches, fans, lights, MCBs, appliances etc. Product names commonly look like "Havells Lifeline FR 1.0 sq mm Copper Wire" or "Anchor Roma 6A Switch" — i.e. Brand + Product line + Size/Rating + generic noun.

Rules:
- Pick exactly one "action":
  - "search" — admin wants to see/find products, no change requested.
  - "low_stock" — admin wants products below some stock threshold. Default stock_threshold to 10 if the admin didn't give a number.
  - "set_price" — set price to an exact new amount. price_mode "fixed", price_direction "set", price_value = the target rupee amount.
  - "adjust_price" — change price by an amount or percent. price_mode "fixed" (rupees) or "percent". price_direction "increase" or "decrease". price_value = the magnitude (always positive; direction carries the sign).
  - "set_stock" — set stock to an exact number. stock_direction "set", stock_value = target quantity.
  - "adjust_stock" — add or remove units. stock_direction "increase" or "decrease", stock_value = magnitude (always positive).
  - "update_description" — new_description = the requested new text (only if the admin actually dictated or clearly implied new text; otherwise use "unclear" and ask what the new description should say).
  - "update_category" — new_category = the target category name.
  - "unclear" — the command doesn't map cleanly to any action above, is empty, or is missing a value you cannot infer (e.g. "increase Havells prices" with no amount). Set "clarification" to a short, specific question.
- "filter" narrows which products the action applies to. Fill in whatever the admin implied:
  - brand: a brand name if mentioned (e.g. "Havells", "Polycab", "Anchor").
  - category: a product category/type if mentioned (e.g. "wire", "switch", "fan", "MCB"), as a plain generic noun.
  - size_text: any size/rating/spec token mentioned, verbatim-ish (e.g. "1mm", "1.5 sq mm", "6A", "9W", "1200mm"). Do not try to normalize units yourself — just capture what was said.
  - keywords: any other distinguishing words worth matching against product name/description (e.g. "copper", "FR", "lifeline"). Omit brand/category/size words here — they already have their own fields.
  - name_hint: if the admin named something close to a full product name, put your best reconstruction of it here.
  - Any field you have no information for must be null (or [] is not used — use null for keywords too if none).
- "summary" is one short plain-English sentence restating the request, for display to the admin above the preview — e.g. "Increase Havells wire prices by ₹50" or "Show products with stock below 10".
- Never invent a specific rupee/percent/quantity value that wasn't stated or clearly implied. If a needed value is missing, use action "unclear".
- Numbers: price_value and stock_value are always positive magnitudes; increase/decrease/set is carried separately in price_direction/stock_direction.
- If the admin's message is a vague chat message unrelated to product management (greeting, thanks, unrelated question), use action "unclear" with a brief clarification like "I can help with product prices, stock, descriptions, and categories — try a command like 'increase Havells wire prices by 5%'."`;

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

export type ParseCommandResult = { ok: true; intent: CommandIntent } | { ok: false; error: string };

/** Calls Gemini to turn one free-text admin command into a structured
 * intent. Pure NLU — no DB access happens in this function or anywhere it
 * calls into. */
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

  const validated = CommandIntentSchema.safeParse(parsedJson);
  if (!validated.success) {
    console.error("[ai-console] Gemini response failed schema validation", validated.error.message);
    return { ok: false, error: "Couldn't understand that command — try rephrasing it." };
  }

  return { ok: true, intent: validated.data };
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
