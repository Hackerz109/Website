import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./leaflet-map.css";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  color?: string;
  label?: string;
  draggable?: boolean;
  onDragEnd?: (lat: number, lng: number) => void;
};

export type MapCircle = {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
  color?: string;
  label?: string;
};

interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  circles?: MapCircle[];
  onMapClick?: (lat: number, lng: number) => void;
  height?: number | string;
  className?: string;
  fitToContent?: boolean;
}

function pinIcon(L: typeof import("leaflet"), color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

/** Thin imperative wrapper around Leaflet + OpenStreetMap tiles (no API key
 * required). Uses raw Leaflet rather than react-leaflet so it has zero
 * dependency on the app's React version — this project is on React 19 and
 * react-leaflet's peer range is a moving target. */
export function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  circles = [],
  onMapClick,
  height = 360,
  className = "",
  fitToContent = false,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  // Latest callback/data refs so the (stable, mount-once) map effect and
  // async Leaflet import always see current values without re-running.
  const clickHandlerRef = useRef(onMapClick);
  clickHandlerRef.current = onMapClick;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const circlesRef = useRef(circles);
  circlesRef.current = circles;

  // Mount the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current).setView([center.lat, center.lng], zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
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
    // Intentionally mount once — center/zoom drift after mount is handled
    // by the recenter effect below, not by tearing the map down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)draw markers/circles: on first mount-completion, and whenever the
  // marker/circle props change thereafter.
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!ready || !map || !group) return;

    import("leaflet").then((L) => {
      group.clearLayers();
      const bounds: [number, number][] = [];

      for (const c of circlesRef.current) {
        L.circle([c.lat, c.lng], {
          radius: c.radiusKm * 1000,
          color: c.color || "#2454e5",
          fillColor: c.color || "#2454e5",
          fillOpacity: 0.08,
          weight: 1.5,
        })
          .bindTooltip(c.label || `${c.radiusKm} km zone`)
          .addTo(group);
        bounds.push([c.lat, c.lng]);
      }

      for (const m of markersRef.current) {
        const marker = L.marker([m.lat, m.lng], {
          icon: pinIcon(L, m.color || "#2454e5"),
          draggable: !!m.draggable,
        }).addTo(group);
        if (m.label) marker.bindTooltip(m.label);
        if (m.draggable && m.onDragEnd) {
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            m.onDragEnd!(pos.lat, pos.lng);
          });
        }
        bounds.push([m.lat, m.lng]);
      }

      if (fitToContent && bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], map.getZoom());
        } else {
          map.fitBounds(bounds, { padding: [32, 32] });
        }
      }
    });
  }, [ready, markers, circles, fitToContent]);

  // Recenter imperatively when the caller-provided center changes (e.g.
  // after a successful geolocation lookup) without remounting the map.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom());
  }, [ready, center.lat, center.lng]);

  return (
    <div
      ref={containerRef}
      className={`leaflet-map-container overflow-hidden rounded-lg border ${className}`}
      style={{ height, width: "100%" }}
    />
  );
}
