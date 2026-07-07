"use client";

import type { Itinerary, ItineraryLeg } from "@/lib/routing";
import { formatTime, formatDuration, legIcon, legModeName } from "@/lib/format";

function LegBadge({ leg }: { leg: ItineraryLeg }) {
  if (leg.mode === "WALK") {
    return <span className="text-base" title="A piedi">🚶</span>;
  }
  const bg = leg.routeColor ? `#${leg.routeColor}` : "#2563eb";
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-base">{legIcon(leg)}</span>
      <span
        className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-semibold text-white"
        style={{ backgroundColor: bg }}
      >
        {leg.routeShortName ?? "?"}
      </span>
    </span>
  );
}

function LegTimeline({ itinerary }: { itinerary: Itinerary }) {
  return (
    <ol className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3 flex flex-col gap-2">
      {itinerary.legs.map((leg, idx) => (
        <li key={idx} className="flex gap-3 text-sm">
          <span className="w-11 shrink-0 font-mono text-xs pt-0.5 text-gray-500 dark:text-gray-400">
            {formatTime(leg.departureSeconds)}
          </span>
          <span className="shrink-0 pt-0.5">{legIcon(leg)}</span>
          <div className="min-w-0">
            <p className="font-medium">
              {leg.mode === "WALK" ? (
                <>Cammina fino a {leg.toStopName}</>
              ) : (
                <>
                  {legModeName(leg)} {leg.routeShortName} da {leg.fromStopName} a {leg.toStopName}
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDuration(leg.arrivalSeconds - leg.departureSeconds)} · arrivo{" "}
              {formatTime(leg.arrivalSeconds)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

interface Props {
  itineraries: Itinerary[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSave: (itinerary: Itinerary) => void;
  savedMessage: string | null;
}

export default function ItineraryList({ itineraries, selectedIndex, onSelect, onSave, savedMessage }: Props) {
  if (itineraries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-500 dark:text-gray-400">
        <p className="font-medium mb-1">Nessun itinerario trovato 😕</p>
        <p>Prova a cambiare orario o a scegliere fermate più centrali.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {itineraries.map((it, idx) => {
        const selected = idx === selectedIndex;
        return (
          <li key={idx}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(idx)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(idx)}
              className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                selected
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

              {selected && (
                <>
                  <LegTimeline itinerary={it} />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSave(it);
                      }}
                      className="rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      💾 Salva viaggio
                    </button>
                    {savedMessage && <span className="text-sm text-green-600">{savedMessage}</span>}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Salva il viaggio per verificare dopo l&apos;arrivo se hai diritto a un indennizzo per ritardo.
                  </p>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
