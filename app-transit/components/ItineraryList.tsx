"use client";

import type { Itinerary, ItineraryLeg } from "@/lib/routing";

function formatTime(seconds: number): string {
  const s = ((seconds % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

function LegBadge({ leg }: { leg: ItineraryLeg }) {
  if (leg.mode === "WALK") {
    return <span className="text-lg" title="A piedi">🚶</span>;
  }
  const bg = leg.routeColor ? `#${leg.routeColor}` : "#2563eb";
  return (
    <span
      className="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: bg }}
    >
      {leg.routeShortName ?? "?"}
    </span>
  );
}

interface Props {
  itineraries: Itinerary[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function ItineraryList({ itineraries, selectedIndex, onSelect }: Props) {
  if (itineraries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 p-4">
        Nessun itinerario trovato per questa ricerca.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {itineraries.map((it, idx) => (
        <li key={idx}>
          <button
            type="button"
            onClick={() => onSelect(idx)}
            className={`w-full text-left rounded-xl border p-4 transition-colors ${
              idx === selectedIndex
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                : "border-gray-200 dark:border-gray-800 hover:border-blue-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">
                {formatTime(it.departureSeconds)} → {formatTime(it.arrivalSeconds)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDuration(it.arrivalSeconds - it.departureSeconds)} · {it.transfers}{" "}
                {it.transfers === 1 ? "cambio" : "cambi"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {it.legs.map((leg, legIdx) => (
                <span key={legIdx} className="flex items-center gap-1.5">
                  <LegBadge leg={leg} />
                  {legIdx < it.legs.length - 1 && <span className="text-gray-300">›</span>}
                </span>
              ))}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
