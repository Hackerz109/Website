import { useState } from "react";
import { Wand2, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { parseSmartSpecifications, type ParsedSpec } from "@/lib/parseSmartSpecifications";

const PLACEHOLDER = `Paste specs in any format, for example:

Brand
SummerCool

Model
Bandhan

Capacity
65 Litres

...or "Brand: SummerCool / Capacity: 65L", or rows copied straight from Excel.`;

/**
 * Lets an admin paste specifications in whatever format they have on hand
 * (Excel rows, a pipe table, "Key: Value" text, or alternating lines) and
 * turns it into clean, editable specification rows before saving.
 *
 * Specs stay stored as a plain key/value list (JSON), so any product —
 * in any category — can have its own set of fields without any database
 * changes.
 */
export function SmartSpecImporter({ onImport }: { onImport: (specs: ParsedSpec[]) => void }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ParsedSpec[] | null>(null);

  function handleParse() {
    const parsed = parseSmartSpecifications(raw);
    if (parsed.length === 0) {
      toast.error("Couldn't find any specifications in that text — try pasting it differently.");
      return;
    }
    setPreview(parsed);
  }

  function updatePreview(i: number, field: "key" | "value", val: string) {
    if (!preview) return;
    setPreview(preview.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  }

  function removeRow(i: number) {
    if (!preview) return;
    setPreview(preview.filter((_, idx) => idx !== i));
  }

  function addRow() {
    setPreview([...(preview ?? []), { key: "", value: "" }]);
  }

  function reset() {
    setRaw("");
    setPreview(null);
  }

  function handleConfirm() {
    const clean = (preview ?? []).filter((p) => p.key.trim());
    if (clean.length === 0) {
      toast.error("Add at least one specification before importing.");
      return;
    }
    onImport(clean);
    toast.success(`Imported ${clean.length} specification${clean.length === 1 ? "" : "s"}.`);
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Wand2 className="mr-1 h-3 w-3" /> Smart import
      </Button>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart Specification Importer</DialogTitle>
          <DialogDescription>
            Paste specs from Excel, a table, or plain text — we'll convert them into clean
            specification rows automatically.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-3">
            <Label>Paste your specifications</Label>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Preview — edit anything before importing</Label>
              <Button type="button" size="sm" variant="outline" onClick={addRow}>
                <Plus className="mr-1 h-3 w-3" /> Add row
              </Button>
            </div>
            <div className="rounded-lg border border-border">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-border bg-secondary/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>Specification</span>
                <span>Details</span>
                <span />
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto p-3">
                {preview.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <Input value={p.key} onChange={(e) => updatePreview(i, "key", e.target.value)} placeholder="Specification" />
                    <Input value={p.value} onChange={(e) => updatePreview(i, "value", e.target.value)} placeholder="Details" />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeRow(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {preview.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">No rows left — add one above.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!preview ? (
            <Button type="button" onClick={handleParse} disabled={!raw.trim()}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Convert
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setPreview(null)}>
                Back
              </Button>
              <Button type="button" onClick={handleConfirm}>
                <Check className="mr-1.5 h-4 w-4" /> Add to specifications
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
