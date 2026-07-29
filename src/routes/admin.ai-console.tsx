import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, CheckCircle2, XCircle, TrendingUp, TrendingDown, PackageSearch, Bot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { CommandIntent, ConsoleTurn } from "@/lib/aiConsole.server";
import {
  buildPreview,
  applyPriceRows,
  applyStockRows,
  applyDescriptionRows,
  applyCategoryRows,
  priceSummary,
  stockSummary,
  formatMoney,
  type ConsolePreview,
  type ActionableConsolePreview,
} from "@/lib/productCommands";

export const Route = createFileRoute("/admin/ai-console")({ component: AiConsole });

// ---------------------------------------------------------------------------
// Chat message model
// ---------------------------------------------------------------------------

type Msg =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "text"; text: string; tone?: "error" | "success" }
  | { id: string; kind: "preview"; preview: ActionableConsolePreview; status: "pending" | "confirmed" | "cancelled"; summary?: string };

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `m${msgCounter}-${Date.now()}`;
}

const SUGGESTIONS = [
  "Show low stock",
  "Update all Havells products",
  "Increase wire prices by 3%",
  "Increase Havells Lifeline 1mm wire price by ₹50",
  "Add 20 rolls of Havells 1.5mm wire to stock",
];

const NEEDS_CONFIRM: ActionableConsolePreview["kind"][] = ["price", "stock", "description", "category"];

async function requestIntent(command: string, history: ConsoleTurn[]): Promise<{ intent: CommandIntent } | { error: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Please sign in again." };

  try {
    const res = await fetch("/api/ai-console", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ command, history }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body?.error ?? "Something went wrong." };
    return { intent: body.intent as CommandIntent };
  } catch {
    return { error: "Network error — please try again." };
  }
}

function AiConsole() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [history, setHistory] = useState<ConsoleTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function invalidateStoreFront() {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products", "public"] });
    qc.invalidateQueries({ queryKey: ["product"] });
  }

  async function send(rawCommand: string) {
    const command = rawCommand.trim();
    if (!command || thinking) return;

    setMessages((m) => [...m, { id: nextId(), kind: "user", text: command }]);
    setInput("");
    setThinking(true);

    const result = await requestIntent(command, history);
    setHistory((h) => [...h, { role: "admin", text: command }].slice(-6));

    if ("error" in result) {
      setMessages((m) => [...m, { id: nextId(), kind: "text", text: result.error, tone: "error" }]);
      setThinking(false);
      return;
    }

    const intent = result.intent;
    const preview = await buildPreview(intent);
    setThinking(false);

    if (preview.kind === "clarification" || preview.kind === "empty") {
      setMessages((m) => [...m, { id: nextId(), kind: "text", text: preview.message }]);
      setHistory((h) => [...h, { role: "assistant", text: preview.message }].slice(-6));
      return;
    }

    const summary = intent.summary || undefined;
    setMessages((m) => [...m, { id: nextId(), kind: "preview", preview, status: "pending", summary }]);
    if (summary) setHistory((h) => [...h, { role: "assistant", text: summary }].slice(-6));
  }

  async function confirm(id: string) {
    setMessages((m) => m.map((msg) => (msg.id === id && msg.kind === "preview" ? { ...msg, status: "confirmed" } : msg)));
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.kind !== "preview") return;
    const { preview } = msg;

    let result: { ok: number; failed: number; firstError?: string } | null = null;
    if (preview.kind === "price") result = await applyPriceRows(preview.rows);
    else if (preview.kind === "stock") result = await applyStockRows(preview.rows);
    else if (preview.kind === "description") result = await applyDescriptionRows(preview.rows);
    else if (preview.kind === "category") result = await applyCategoryRows(preview.rows, preview.newCategoryId);
    if (!result) return;

    invalidateStoreFront();

    if (result.failed === 0) {
      const text = `✅ Updated ${result.ok} product${result.ok === 1 ? "" : "s"}.`;
      setMessages((m) => [...m, { id: nextId(), kind: "text", text, tone: "success" }]);
      toast.success(text);
    } else {
      const text = `Updated ${result.ok}, but ${result.failed} failed${result.firstError ? ` (${result.firstError})` : ""}.`;
      setMessages((m) => [...m, { id: nextId(), kind: "text", text, tone: "error" }]);
      toast.error(text);
    }
  }

  function cancel(id: string) {
    setMessages((m) => m.map((msg) => (msg.id === id && msg.kind === "preview" ? { ...msg, status: "cancelled" } : msg)));
    setMessages((m) => [...m, { id: nextId(), kind: "text", text: "Cancelled — no changes made." }]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="h-5 w-5 text-primary" /> AI Product Console
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell it what to change in plain English — it'll show you exactly what would change before anything is saved.
        </p>
      </div>

      <div className="flex flex-col rounded-lg border bg-background">
        <div ref={scrollRef} className="flex h-[65vh] min-h-[360px] flex-col gap-3 overflow-y-auto p-3 sm:p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Bot className="h-10 w-10 text-muted-foreground" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Try one of these, or type your own command below.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border bg-secondary/60 px-3 py-1.5 text-xs text-foreground hover:bg-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onConfirm={() => confirm(msg.id)} onCancel={() => cancel(msg.id)} />
          ))}

          {thinking && (
            <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 border-t p-2.5 sm:p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='e.g. "Increase Havells wire prices by 5%"'
            rows={1}
            className="min-h-10 resize-none"
            disabled={thinking}
          />
          <Button size="icon" onClick={() => send(input)} disabled={thinking || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border bg-secondary/60 px-3 py-1.5 text-xs text-foreground hover:bg-secondary"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message rendering
// ---------------------------------------------------------------------------

function MessageBubble({ msg, onConfirm, onCancel }: { msg: Msg; onConfirm: () => void; onCancel: () => void }) {
  if (msg.kind === "user") {
    return (
      <div className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {msg.text}
      </div>
    );
  }

  if (msg.kind === "text") {
    return (
      <div
        className={cn(
          "max-w-[85%] self-start rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm",
          msg.tone === "error" && "bg-destructive/10 text-destructive",
          msg.tone === "success" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          !msg.tone && "bg-secondary text-foreground",
        )}
      >
        {msg.text}
      </div>
    );
  }

  return (
    <div className="max-w-[95%] self-start rounded-2xl rounded-bl-sm border bg-card px-3 py-3 text-sm sm:max-w-[90%] sm:px-4">
      {msg.summary && <p className="mb-2 font-medium">{msg.summary}</p>}
      <PreviewBody preview={msg.preview} />
      {NEEDS_CONFIRM.includes(msg.preview.kind) && msg.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onConfirm}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <XCircle className="mr-1.5 h-4 w-4" /> Cancel
          </Button>
        </div>
      )}
      {msg.status === "confirmed" && <p className="mt-2 text-xs text-muted-foreground">Applied.</p>}
      {msg.status === "cancelled" && <p className="mt-2 text-xs text-muted-foreground">Cancelled.</p>}
    </div>
  );
}

const ROW_DISPLAY_CAP = 8;

function PreviewBody({ preview }: { preview: ActionableConsolePreview }) {
  if (preview.kind === "price") {
    const s = priceSummary(preview.rows);
    const direction = s.newAvgCents >= s.oldAvgCents ? "up" : "down";
    return (
      <div>
        <p className="mb-2 text-muted-foreground">
          Found <span className="font-medium text-foreground">{s.count}</span> product{s.count === 1 ? "" : "s"}
        </p>
        <div className="mb-2 flex items-center gap-2 rounded-md bg-muted px-3 py-2">
          {direction === "up" ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          <span>
            Avg price: {formatMoney(s.oldAvgCents, s.currency)} → <span className="font-medium">{formatMoney(s.newAvgCents, s.currency)}</span>
          </span>
        </div>
        <RowList
          rows={preview.rows}
          render={(r) => (
            <>
              <span className="truncate">{r.displayName}</span>
              <span className="whitespace-nowrap text-muted-foreground">
                {formatMoney(r.oldCents, r.currency)} → <span className="font-medium text-foreground">{formatMoney(r.newCents, r.currency)}</span>
              </span>
            </>
          )}
        />
      </div>
    );
  }

  if (preview.kind === "stock") {
    const s = stockSummary(preview.rows);
    return (
      <div>
        <p className="mb-2 text-muted-foreground">
          Found <span className="font-medium text-foreground">{s.count}</span> product{s.count === 1 ? "" : "s"}
        </p>
        <div className="mb-2 rounded-md bg-muted px-3 py-2">
          Total stock: {s.oldTotal} → <span className="font-medium">{s.newTotal}</span>
        </div>
        <RowList
          rows={preview.rows}
          render={(r) => (
            <>
              <span className="truncate">{r.displayName}</span>
              <span className="whitespace-nowrap text-muted-foreground">
                {r.oldStock} → <span className="font-medium text-foreground">{r.newStock}</span>
              </span>
            </>
          )}
        />
      </div>
    );
  }

  if (preview.kind === "description") {
    return (
      <div>
        <p className="mb-2 text-muted-foreground">
          New description for <span className="font-medium text-foreground">{preview.rows.length}</span> product{preview.rows.length === 1 ? "" : "s"}:
        </p>
        <p className="mb-2 rounded-md bg-muted px-3 py-2 italic">"{preview.newDescription}"</p>
        <RowList rows={preview.rows} render={(r) => <span className="truncate">{r.displayName}</span>} />
      </div>
    );
  }

  if (preview.kind === "category") {
    return (
      <div>
        <p className="mb-2 text-muted-foreground">
          Move <span className="font-medium text-foreground">{preview.rows.length}</span> product{preview.rows.length === 1 ? "" : "s"} to{" "}
          <span className="font-medium text-foreground">{preview.newCategoryName}</span>:
        </p>
        <RowList
          rows={preview.rows}
          render={(r) => (
            <>
              <span className="truncate">{r.displayName}</span>
              <span className="whitespace-nowrap text-muted-foreground">{r.oldCategoryName ?? "(none)"} → {preview.newCategoryName}</span>
            </>
          )}
        />
      </div>
    );
  }

  if (preview.kind === "low_stock") {
    return (
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-muted-foreground">
          <PackageSearch className="h-4 w-4" /> {preview.totalMatched} product{preview.totalMatched === 1 ? "" : "s"} below {preview.threshold} in stock
        </p>
        <RowList
          rows={preview.rows}
          render={(r) => (
            <>
              <span className="truncate">{r.displayName}</span>
              <span className="whitespace-nowrap font-medium text-destructive">{r.stock} left</span>
            </>
          )}
        />
        {preview.totalMatched > preview.rows.length && (
          <p className="mt-1.5 text-xs text-muted-foreground">and {preview.totalMatched - preview.rows.length} more…</p>
        )}
      </div>
    );
  }

  // search
  return (
    <div>
      <p className="mb-2 text-muted-foreground">
        {preview.totalMatched} product{preview.totalMatched === 1 ? "" : "s"} found
      </p>
      <RowList
        rows={preview.rows}
        render={(r) => (
          <>
            <span className="truncate">{r.displayName}</span>
            <span className="whitespace-nowrap text-muted-foreground">
              {formatMoney(r.priceCents, r.currency)} · {r.stock} in stock{!r.active && " · hidden"}
            </span>
          </>
        )}
      />
      {preview.totalMatched > preview.rows.length && (
        <p className="mt-1.5 text-xs text-muted-foreground">and {preview.totalMatched - preview.rows.length} more…</p>
      )}
    </div>
  );
}

function RowList<T>({ rows, render }: { rows: T[]; render: (row: T) => React.ReactNode }) {
  const shown = rows.slice(0, ROW_DISPLAY_CAP);
  const hidden = rows.length - shown.length;
  return (
    <ul className="space-y-1">
      {shown.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3 border-b border-dashed py-1 last:border-0">
          {render(r)}
        </li>
      ))}
      {hidden > 0 && <li className="pt-1 text-xs text-muted-foreground">and {hidden} more…</li>}
    </ul>
  );
}
