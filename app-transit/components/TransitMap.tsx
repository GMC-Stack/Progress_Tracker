"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { Itinerary } from "@/lib/routing";

const MILAN_CENTER: [number, number] = [45.4642, 9.19];

const stopIcon = L.divIcon({
  className: "",
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#1d4ed8;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    // animate: false — l'animazione può proseguire dopo lo smontaggio della
    // mappa (cambio tab) e far esplodere Leaflet con "_leaflet_pos undefined"
    if (points.length === 1) {
      map.setView(points[0], 15, { animate: false });
    } else {
      map.fitBounds(points, { padding: [40, 40], animate: false });
    }
  }, [map, points]);
  return null;
}

export default function TransitMap({ itinerary }: { itinerary: Itinerary | null }) {
  const points = useMemo(() => {
    if (!itinerary) return [];
    const result: { id: string; lat: number; lon: number }[] = [];
    for (const leg of itinerary.legs) {
      result.push({ id: leg.fromStopId, lat: leg.fromLat, lon: leg.fromLon });
      result.push({ id: leg.toStopId, lat: leg.toLat, lon: leg.toLon });
    }
    return result;
  }, [itinerary]);

  const latLngs: [number, number][] = points.map((p) => [p.lat, p.lon]);

  return (
    <MapContainer center={MILAN_CENTER} zoom={13} scrollWheelZoom className="h-full w-full rounded-xl overflow-hidden">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {itinerary?.legs.map((leg, idx) => (
        <Polyline
          key={idx}
          positions={[
            [leg.fromLat, leg.fromLon],
            [leg.toLat, leg.toLon],
          ]}
          pathOptions={{
            color: leg.mode === "WALK" ? "#9ca3af" : leg.routeColor ? `#${leg.routeColor}` : "#2563eb",
            dashArray: leg.mode === "WALK" ? "6 6" : undefined,
            weight: 4,
          }}
        />
      ))}
      {points.map((p, idx) => (
        <Marker key={`${p.id}-${idx}`} position={[p.lat, p.lon]} icon={stopIcon} />
      ))}
      <FitBounds points={latLngs} />
    </MapContainer>
  );
}
