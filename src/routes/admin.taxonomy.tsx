import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/taxonomy")({ component: AdminTaxonomy });

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminTaxonomy() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories & Brands</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage these here, then pick from them when creating or editing a product.
        </p>
      </div>
      <TaxonomyManager table="categories" title="Categories" withSlug />
      <TaxonomyManager table="brands" title="Brands" />
    </div>
  );
}

type Row = { id: string; name: string; slug?: string };

function TaxonomyManager({
  table,
  title,
  withSlug = false,
}: {
  table: "categories" | "brands";
  title: string;
  withSlug?: boolean;
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: rows } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("name");
      if (error) throw error;
      return data as Row[];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: [table] });
    // Product forms/filters read these too — keep everything in sync.
    qc.invalidateQueries({ queryKey: ["taxonomy-options"] });
    qc.invalidateQueries({ queryKey: ["products", "public"] });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    const payload: Record<string, string> = { name };
    if (withSlug) payload.slug = slugify(name);
    const { error } = await supabase.from(table).insert(payload);
    if (error) return toast.error(error.message.includes("duplicate") ? `"${name}" already exists` : error.message);
    setNewName("");
    toast.success(`${title.slice(0, -1)} added`);
    refresh();
  }

  async function rename(row: Row) {
    const name = editValue.trim();
    if (!name) return;
    const payload: Record<string, string> = { name };
    if (withSlug) payload.slug = slugify(name);
    const { error } = await supabase.from(table).update(payload).eq("id", row.id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    toast.success("Renamed — note: products already using this won't relabel until you re-save them in the product form");
    refresh();
  }

  async function del(row: Row) {
    if (!confirm(`Delete "${row.name}"? Products using it will just show no ${title.slice(0, -1).toLowerCase()}, not get deleted.`)) return;
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={`New ${title.slice(0, -1).toLowerCase()} name`}
        />
        <Button onClick={add}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="mt-4 divide-y rounded-xl border">
        {(rows ?? []).map((row) => (
          <div key={row.id} className="flex items-center gap-2 px-4 py-2.5">
            {editingId === row.id ? (
              <>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && rename(row)}
                  className="h-8"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => rename(row)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{row.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingId(row.id);
                    setEditValue(row.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(row)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
        {(rows ?? []).length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No {title.toLowerCase()} yet — add one above.
          </div>
        )}
      </div>
    </div>
  );
}
