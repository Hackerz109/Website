import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/delivery-IvurY_5s.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function pinIcon(L, color) {
	return L.divIcon({
		className: "",
		html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
		iconSize: [22, 22],
		iconAnchor: [11, 22]
	});
}
/** Thin imperative wrapper around Leaflet + OpenStreetMap tiles (no API key
* required). Uses raw Leaflet rather than react-leaflet so it has zero
* dependency on the app's React version — this project is on React 19 and
* react-leaflet's peer range is a moving target. */
function LeafletMap({ center, zoom = 13, markers = [], circles = [], onMapClick, height = 360, className = "", fitToContent = false }) {
	const containerRef = (0, import_react.useRef)(null);
	const mapRef = (0, import_react.useRef)(null);
	const layerGroupRef = (0, import_react.useRef)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	const clickHandlerRef = (0, import_react.useRef)(onMapClick);
	clickHandlerRef.current = onMapClick;
	const markersRef = (0, import_react.useRef)(markers);
	markersRef.current = markers;
	const circlesRef = (0, import_react.useRef)(circles);
	circlesRef.current = circles;
	(0, import_react.useEffect)(() => {
		if (!containerRef.current || mapRef.current) return;
		let cancelled = false;
		import("../_libs/leaflet.mjs").then((n) => /* @__PURE__ */ __toESM(n.t())).then((L) => {
			if (cancelled || !containerRef.current || mapRef.current) return;
			const map = L.map(containerRef.current).setView([center.lat, center.lng], zoom);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
				maxZoom: 19
			}).addTo(map);
			map.on("click", (e) => {
				clickHandlerRef.current?.(e.latlng.lat, e.latlng.lng);
			});
			mapRef.current = map;
			layerGroupRef.current = L.layerGroup().addTo(map);
			setReady(true);
		});
		return () => {
			cancelled = true;
			mapRef.current?.remove();
			mapRef.current = null;
			layerGroupRef.current = null;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current;
		const group = layerGroupRef.current;
		if (!ready || !map || !group) return;
		import("../_libs/leaflet.mjs").then((n) => /* @__PURE__ */ __toESM(n.t())).then((L) => {
			group.clearLayers();
			const bounds = [];
			for (const c of circlesRef.current) {
				L.circle([c.lat, c.lng], {
					radius: c.radiusKm * 1e3,
					color: c.color || "#2454e5",
					fillColor: c.color || "#2454e5",
					fillOpacity: .08,
					weight: 1.5
				}).bindTooltip(c.label || `${c.radiusKm} km zone`).addTo(group);
				bounds.push([c.lat, c.lng]);
			}
			for (const m of markersRef.current) {
				const marker = L.marker([m.lat, m.lng], {
					icon: pinIcon(L, m.color || "#2454e5"),
					draggable: !!m.draggable
				}).addTo(group);
				if (m.label) marker.bindTooltip(m.label);
				if (m.draggable && m.onDragEnd) marker.on("dragend", () => {
					const pos = marker.getLatLng();
					m.onDragEnd(pos.lat, pos.lng);
				});
				bounds.push([m.lat, m.lng]);
			}
			if (fitToContent && bounds.length > 0) if (bounds.length === 1) map.setView(bounds[0], map.getZoom());
			else map.fitBounds(bounds, { padding: [32, 32] });
		});
	}, [
		ready,
		markers,
		circles,
		fitToContent
	]);
	(0, import_react.useEffect)(() => {
		if (!ready || !mapRef.current) return;
		mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom());
	}, [
		ready,
		center.lat,
		center.lng
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: containerRef,
		className: `leaflet-map-container overflow-hidden rounded-lg border ${className}`,
		style: {
			height,
			width: "100%"
		}
	});
}
/** Resolves with the browser's current position, or null if permission was
* denied / unavailable / unsupported. Never rejects — callers should treat
* null as "fall back to manual address entry", not as an error. */
function getBrowserLocation() {
	return new Promise((resolve) => {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			resolve(null);
			return;
		}
		navigator.geolocation.getCurrentPosition((pos) => resolve({
			lat: pos.coords.latitude,
			lng: pos.coords.longitude
		}), () => resolve(null), {
			enableHighAccuracy: true,
			timeout: 1e4,
			maximumAge: 6e4
		});
	});
}
/** Best-effort reverse geocode via OpenStreetMap Nominatim (free, no API
* key). Purely a convenience to prefill the address field — the field
* always stays editable, so failures here are silent. For high-volume
* production traffic, proxy this through your own server with a proper
* User-Agent and caching per Nominatim's usage policy. */
async function reverseGeocode(lat, lng) {
	try {
		const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
		if (!res.ok) return null;
		return (await res.json())?.display_name ?? null;
	} catch {
		return null;
	}
}
async function getDeliveryInfo() {
	const { data, error } = await supabase.rpc("get_delivery_info");
	if (error || !data) return null;
	return data;
}
async function calculateDeliveryCharge(lat, lng, subtotalCents) {
	const { data, error } = await supabase.rpc("calculate_delivery_charge", {
		p_lat: lat,
		p_lng: lng,
		p_subtotal_cents: subtotalCents
	});
	if (error || !data) return {
		eligible: false,
		charge_cents: null,
		message: "Couldn't calculate delivery charges right now."
	};
	return data;
}
//#endregion
export { reverseGeocode as a, getDeliveryInfo as i, calculateDeliveryCharge as n, getBrowserLocation as r, LeafletMap as t };
