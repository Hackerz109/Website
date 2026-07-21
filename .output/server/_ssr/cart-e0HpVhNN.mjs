import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cart-e0HpVhNN.js
function lineKey(id, variantId) {
	return `${id}::${variantId ?? ""}`;
}
var useCart = create()(persist((set) => ({
	items: [],
	add: (item, qty = 1) => set((s) => {
		const key = lineKey(item.id, item.variantId);
		if (s.items.find((i) => lineKey(i.id, i.variantId) === key)) return { items: s.items.map((i) => lineKey(i.id, i.variantId) === key ? {
			...i,
			quantity: Math.min(i.stock, i.quantity + qty)
		} : i) };
		return { items: [...s.items, {
			...item,
			quantity: Math.min(item.stock, qty)
		}] };
	}),
	remove: (id, variantId = null) => set((s) => ({ items: s.items.filter((i) => lineKey(i.id, i.variantId) !== lineKey(id, variantId)) })),
	setQty: (id, qty, variantId = null) => set((s) => ({ items: s.items.map((i) => lineKey(i.id, i.variantId) === lineKey(id, variantId) ? {
		...i,
		quantity: Math.max(1, Math.min(i.stock, qty))
	} : i) })),
	clear: () => set({ items: [] })
}), {
	name: "shop-cart",
	version: 3,
	migrate: (persisted, version) => {
		if (version < 3 && persisted?.items) persisted.items = persisted.items.map((i) => ({
			category_id: null,
			brand_id: null,
			...i
		}));
		return persisted;
	}
}));
function formatMoney(cents, currency = "INR") {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency
	}).format(cents / 100);
}
//#endregion
export { useCart as n, formatMoney as t };
