import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** When true (default false), typing a value with no matching option lets
   * the shopper use exactly what they typed instead of being stuck with
   * only the fixed list — used for City, where the list is a helpful
   * shortlist rather than an exhaustive one. State keeps this off since
   * every valid state is already in the list. */
  allowCustomValue?: boolean;
  className?: string;
}

/** Searchable dropdown: a text box filters the option list as the shopper
 * types, instead of scrolling a long plain <select>. Built on the existing
 * Command + Popover primitives already in the design system. */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No match found.",
  allowCustomValue = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {allowCustomValue && search.trim() ? (
                <button
                  type="button"
                  className="flex w-full items-center px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  Use "{search.trim()}"
                </button>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={(v) => {
                    onChange(v === value ? value : options.find((o) => o.toLowerCase() === v.toLowerCase()) ?? v);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
