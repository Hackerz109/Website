import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const NONE = "__none__";

export function TaxonomySelect({
  table,
  label,
  value,
  onChange,
}: {
  table: "categories" | "brands";
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: options } = useQuery({
    queryKey: ["taxonomy-options", table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  async function createAndSelect() {
    const name = newName.trim();
    if (!name) return setAdding(false);
    const payload: Record<string, string> = { name };
    if (table === "categories") payload.slug = slugify(name);
    const { data, error } = await supabase.from(table).insert(payload).select("id").single();
    if (error) {
      toast.error(error.message.includes("duplicate") ? `"${name}" already exists` : error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["taxonomy-options", table] });
    qc.invalidateQueries({ queryKey: [table] });
    onChange(data.id);
    setNewName("");
    setAdding(false);
  }

  if (adding) {
    return (
      <div>
        <label className="text-sm font-medium">{label}</label>
        <div className="mt-1.5 flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createAndSelect()}
            placeholder={`New ${label.toLowerCase()}`}
            autoFocus
          />
          <Button type="button" size="icon" variant="outline" onClick={createAndSelect}>
            <Check className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => setAdding(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => {
          if (v === "__add_new__") {
            setAdding(true);
            return;
          }
          onChange(v === NONE ? null : v);
        }}
      >
        <SelectTrigger className="mt-1.5">
          <SelectValue placeholder={`No ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">No {label.toLowerCase()}</span>
          </SelectItem>
          {(options ?? []).map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
          <SelectItem value="__add_new__">
            <span className="flex items-center gap-1 text-primary">
              <Plus className="h-3.5 w-3.5" /> Add new {label.toLowerCase()}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
