"use client";

import StopAutocomplete, { type StopOption } from "./StopAutocomplete";

interface Props {
  from: StopOption | null;
  to: StopOption | null;
  geoActive: boolean;
  geoError: string | null;
  date: string;
  time: string;
  loading: boolean;
  onFromChange: (stop: StopOption | null) => void;
  onToChange: (stop: StopOption | null) => void;
  onUseMyPosition: () => void;
  onClearGeo: () => void;
  onSwap: () => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onNow: () => void;
  onSubmit: () => void;
}

export default function JourneySearchForm({
  from,
  to,
  geoActive,
  geoError,
  date,
  time,
  loading,
  onFromChange,
  onToChange,
  onUseMyPosition,
  onClearGeo,
  onSwap,
  onDateChange,
  onTimeChange,
  onNow,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
    >
      {geoActive ? (
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Da</span>
          <div className="flex items-center justify-between rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-sm">
            <span>📍 La mia posizione</span>
            <button
              type="button"
              onClick={onClearGeo}
              aria-label="Rimuovi la mia posizione"
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <StopAutocomplete label="Da" placeholder="Fermata di partenza" value={from} onChange={onFromChange} />
          </div>
          <button
            type="button"
            onClick={onUseMyPosition}
            title="Usa la mia posizione"
            aria-label="Usa la mia posizione"
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            📍
          </button>
        </div>
      )}
      {geoError && <p className="text-xs text-red-600">{geoError}</p>}

      <div className="flex justify-center -my-1.5">
        <button
          type="button"
          onClick={onSwap}
          disabled={geoActive}
          title={geoActive ? "Disattiva la posizione per invertire" : "Inverti partenza e arrivo"}
          aria-label="Inverti partenza e arrivo"
          className="rounded-full border border-gray-300 dark:border-gray-700 w-8 h-8 flex items-center justify-center text-sm bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 z-10"
        >
          ⇅
        </button>
      </div>

      <StopAutocomplete label="A" placeholder="Fermata di arrivo" value={to} onChange={onToChange} />

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ora</label>
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onNow}
          title="Imposta data e ora attuali"
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 whitespace-nowrap"
        >
          Adesso
        </button>
      </div>

      <button
        type="submit"
        disabled={(!from && !geoActive) || !to || loading}
        className="w-full rounded-lg bg-blue-600 text-white font-medium py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        {loading ? "Cerco il percorso…" : "Cerca percorso"}
      </button>
    </form>
  );
}
