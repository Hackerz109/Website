import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  image_url: string | null;
  quantity: number;
  stock: number;
  unlimited: boolean;
  variantId: string | null;
  variantName: string | null;
  sku: string | null;
  category_id: string | null;
  brand_id: string | null;
};

// Unlimited items have no real ceiling, but the cart still needs some cap
// to keep quantities sane. Exported so the product page and cart page
// import this instead of each hardcoding their own copy of the number —
// one source of truth means the UI's displayed max can never drift out of
// sync with what actually gets clamped into cart state.
export const UNLIMITED_QTY_CAP = 999;

// Coerces to a finite number, falling back when the input is missing,
// null, NaN, or even a non-numeric type like a string ("12") that's crept
// in from a bad read somewhere. Cart items live in localStorage
// indefinitely, so a line added before some field existed (or corrupted
// by a prior bug) can carry all sorts of bad shapes into arithmetic here
// — and a single non-finite value poisons every Math.min/Math.max that
// touches it into NaN forever, which is what a permanently "frozen" cart
// line actually was: quantity (or the stock-derived cap) had silently
// stopped being a real number and no button could ever move it off that.
// Exported so every place that touches a persisted cart value — the store
// itself, and any component rendering one, like QuantityInput — runs the
// exact same coercion instead of each guarding it slightly differently,
// which is how this class of bug slipped through before: the store
// clamped safely internally, but the cart page read `stock` straight off
// the item to compute the on-screen max, bypassing this coercion entirely.
export function toFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// The real ceiling for a line's quantity: unlimited items use the fixed
// cap above, everything else uses its own (coerced) stock count. This is
// the ONLY place that should ever decide a line's cap — both the clamping
// below and the cart page's quantity stepper call this instead of each
// reading `stock` off the item directly, so the number a shopper sees can
// never drift from the number actually enforced.
export function qtyCap(item: Pick<CartItem, "stock" | "unlimited">) {
  if (item.unlimited) return UNLIMITED_QTY_CAP;
  return Math.max(0, toFiniteNumber(item.stock, UNLIMITED_QTY_CAP));
}

// A cart "line" is identified by product + variant together, since the same
// product can be in the cart multiple times with different variants.
function lineKey(id: string, variantId: string | null) {
  return `${id}::${variantId ?? ""}`;
}

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string, variantId?: string | null) => void;
  setQty: (id: string, qty: number, variantId?: string | null) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const key = lineKey(item.id, item.variantId);
          const existing = s.items.find((i) => lineKey(i.id, i.variantId) === key);
          const safeQty = toFiniteNumber(qty, 1);
          if (existing) {
            return {
              items: s.items.map((i) =>
                lineKey(i.id, i.variantId) === key
                  ? { ...i, quantity: Math.max(1, Math.min(qtyCap(i), toFiniteNumber(i.quantity, 0) + safeQty)) }
                  : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: Math.max(1, Math.min(qtyCap(item), safeQty)) }] };
        }),
      remove: (id, variantId = null) =>
        set((s) => ({
          items: s.items.filter((i) => lineKey(i.id, i.variantId) !== lineKey(id, variantId)),
        })),
      setQty: (id, qty, variantId = null) =>
        set((s) => ({
          items: s.items.map((i) =>
            lineKey(i.id, i.variantId) === lineKey(id, variantId)
              ? { ...i, quantity: Math.max(1, Math.min(qtyCap(i), toFiniteNumber(qty, toFiniteNumber(i.quantity, 1)))) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "shop-cart",
      version: 6,
      migrate: (persisted: any, version) => {
        if (version < 3 && persisted?.items) {
          persisted.items = persisted.items.map((i: any) => ({
            category_id: null,
            brand_id: null,
            ...i,
          }));
        }
        if (version < 4 && persisted?.items) {
          persisted.items = persisted.items.map((i: any) => ({
            unlimited: false,
            ...i,
          }));
        }
        // Self-heal any line left with a missing/non-finite stock or
        // quantity — the root cause of a line whose buttons looked
        // permanently frozen (see qtyCap/toFiniteNumber above).
        if (version < 5 && persisted?.items) {
          persisted.items = persisted.items.map((i: any) => {
            const stock = i.unlimited ? UNLIMITED_QTY_CAP : Math.max(0, toFiniteNumber(i.stock, 1));
            const cap = i.unlimited ? UNLIMITED_QTY_CAP : stock;
            const quantity = Math.max(1, Math.min(cap, toFiniteNumber(i.quantity, 1)));
            return { ...i, stock, quantity };
          });
        }
        // Belt-and-suspenders cleanup: drop any line that isn't a real,
        // addressable product line at all (no usable id — e.g. a row a
        // past bug wrote without one). A line like this can't be removed
        // by its delete button either, since remove() matches lines by
        // id, so without this it would sit in the cart forever looking
        // permanently "stuck" no matter what the shopper clicks.
        if (version < 6 && persisted?.items) {
          persisted.items = persisted.items.filter((i: any) => typeof i?.id === "string" && i.id.length > 0);
        }
        return persisted;
      },
    },
  ),
);

export function formatMoney(cents: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(cents / 100);
}