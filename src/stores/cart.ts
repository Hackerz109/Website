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
  variantId: string | null;
  variantName: string | null;
  sku: string | null;
};

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
                  ? { ...i, quantity: Math.min(i.stock, i.quantity + qty) }
                  : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: Math.min(item.stock, qty) }] };
        }),
      remove: (id, variantId = null) =>
        set((s) => ({
          items: s.items.filter((i) => lineKey(i.id, i.variantId) !== lineKey(id, variantId)),
        })),
      setQty: (id, qty, variantId = null) =>
        set((s) => ({
          items: s.items.map((i) =>
            lineKey(i.id, i.variantId) === lineKey(id, variantId)
              ? { ...i, quantity: Math.max(1, Math.min(i.stock, qty)) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "shop-cart", version: 2 },
  ),
);

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}