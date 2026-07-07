"use client";

import { useState } from "react";
import type { SavedJourney } from "@/lib/storage";
import type { CompensationResult } from "@/lib/compensation";
import { formatTime, formatDuration, legIcon, parseHHMMToSeconds } from "@/lib/format";

interface Props {
  journeys: SavedJourney[];
  onUpdate: (journeys: SavedJourney[]) => void;
}

function buildClaimText(journey: SavedJourney, result: CompensationResult): string {
  const lines = [
    `Richiesta di indennizzo per ritardo — ${result.operator}`,
    ``,
    `Riferimento: ${result.policyName}`,
    `Data del viaggio: ${journey.date}`,
    `Tratta: ${journey.fromName} → ${journey.toName}`,
    `Arrivo previsto: ${formatTime(journey.arrivalSeconds)}`,
    `Arrivo effettivo: ${journey.actualArrivalTime}`,
    `Ritardo: ${result.delayMinutes} minuti`,
    ``,
    `Indennizzo richiesto: ${result.tier?.description} (valore ${result.tier?.amountEur.toFixed(2)} €)`,
    ``,
    `Dettaglio del viaggio:`,
    ...journey.legs.map(
      (leg) =>
        `- ${formatTime(leg.departureSeconds)} ${leg.mode === "WALK" ? "a piedi" : `linea ${leg.routeShortName ?? "?"}`}: ${leg.fromStopName} → ${leg.toStopName}`
    ),
  ];
  return lines.join("\n");
}

function JourneyCard({
  journey,
  onChange,
  onDelete,
}: {
  journey: SavedJourney;
  onChange: (j: SavedJourney) => void;
  onDelete: () => void;
}) {
  const [actualTime, setActualTime] = useState(journey.actualArrivalTime ?? "");
  const [result, setResult] = useState<CompensationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function check() {
    const actualSeconds = parseHHMMToSeconds(actualTime);
    if (actualSeconds === null) {
      setError("Inserisci l'orario di arrivo effettivo (es. 18:45).");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/compensation/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannedArrivalSeconds: journey.arrivalSeconds,
          actualArrivalSeconds: actualSeconds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore durante la verifica.");
        return;
      }
      setResult(data.result);
      onChange({ ...journey, actualArrivalTime: actualTime });
    } catch {
      setError("Impossibile contattare il server. Riprova.");
    } finally {
      setChecking(false);
    }
  }

  const updatedJourney = { ...journey, actualArrivalTime: actualTime };
  const claimText = result?.eligible ? buildClaimText(updatedJourney, result) : null;

  return (
    <li className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {journey.fromName} → {journey.toName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {journey.date} · {formatTime(journey.departureSeconds)} → {formatTime(journey.arrivalSeconds)} ·{" "}
            {formatDuration(journey.arrivalSeconds - journey.departureSeconds)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          title="Elimina viaggio"
          aria-label="Elimina viaggio"
          className="text-gray-400 hover:text-red-500 text-sm shrink-0"
        >
          🗑
        </button>
      </div>

      <div className="flex items-center gap-1 text-sm flex-wrap">
        {journey.legs.map((leg, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span>{legIcon(leg)}</span>
            {leg.mode === "TRANSIT" && <span className="text-xs font-medium">{leg.routeShortName}</span>}
            {idx < journey.legs.length - 1 && <span className="text-gray-300">›</span>}
          </span>
        ))}
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Arrivo effettivo
          </label>
          <input
            type="time"
            value={actualTime}
            onChange={(e) => {
              setActualTime(e.target.value);
              setResult(null);
              setCopied(false);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={check}
          disabled={checking || actualTime === ""}
          className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-40 hover:bg-blue-700"
        >
          {checking ? "Verifico…" : "Verifica indennizzo"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && !result.eligible && (
        <p className="text-sm rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
          Ritardo di {result.delayMinutes} min: sotto la soglia minima di indennizzo (15 min). Nessun
          rimborso previsto — meglio così! 🎉
        </p>
      )}

      {result && result.eligible && result.tier && claimText && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 p-3 flex flex-col gap-2">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            ✅ Hai diritto a un indennizzo: {result.tier.description} ({result.tier.amountEur.toFixed(2)} €)
            — ritardo di {result.delayMinutes} min
          </p>
          <div className="flex gap-2 flex-wrap">
            <a
              href={`mailto:?subject=${encodeURIComponent(
                `Richiesta indennizzo ${result.operator} — viaggio del ${journey.date}`
              )}&body=${encodeURIComponent(claimText)}`}
              className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700"
            >
              ✉️ Invia richiesta via email
            </a>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(claimText);
                setCopied(true);
              }}
              className="rounded-lg border border-green-600 text-green-700 dark:text-green-400 px-3 py-1.5 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-950"
            >
              {copied ? "Copiato ✓" : "📋 Copia testo richiesta"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function MyJourneys({ journeys, onUpdate }: Props) {
  if (journeys.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        <p className="text-2xl mb-2">🎫</p>
        <p className="font-medium mb-1">Nessun viaggio salvato</p>
        <p>
          Cerca un percorso e tocca «Salva viaggio»: dopo l&apos;arrivo potrai verificare qui se hai
          diritto a un indennizzo per ritardo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {journeys.map((j) => (
          <JourneyCard
            key={j.id}
            journey={j}
            onChange={(updated) => onUpdate(journeys.map((x) => (x.id === updated.id ? updated : x)))}
            onDelete={() => onUpdate(journeys.filter((x) => x.id !== j.id))}
          />
        ))}
      </ul>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        ⚠️ Verifica dimostrativa basata sulle soglie della Carta della Mobilità ATM (≥15 min: biglietto
        ordinario; ≥30 min: biglietto giornaliero). La richiesta va inoltrata tramite i canali ufficiali
        dell&apos;operatore; l&apos;app prepara il testo precompilato.
      </p>
    </div>
  );
}
