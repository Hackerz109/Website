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
function qtyCap(item: Pick<CartItem, "stock" | "unlimited">) {
  return item.unlimited ? UNLIMITED_QTY_CAP : item.stock;
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
          if (existing) {
            return {
              items: s.items.map((i) =>
                lineKey(i.id, i.variantId) === key
                  ? { ...i, quantity: Math.min(qtyCap(i), i.quantity + qty) }
                  : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: Math.min(qtyCap(item), qty) }] };
        }),
      remove: (id, variantId = null) =>
        set((s) => ({
          items: s.items.filter((i) => lineKey(i.id, i.variantId) !== lineKey(id, variantId)),
        })),
      setQty: (id, qty, variantId = null) =>
        set((s) => ({
          items: s.items.map((i) =>
            lineKey(i.id, i.variantId) === lineKey(id, variantId)
              ? { ...i, quantity: Math.max(1, Math.min(qtyCap(i), qty)) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "shop-cart",
      version: 4,
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
        return persisted;
      },
    },
  ),
);

export function formatMoney(cents: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(cents / 100);
}