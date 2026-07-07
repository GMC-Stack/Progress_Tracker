"use client";

import StopAutocomplete, { type StopOption } from "./StopAutocomplete";

interface Props {
  from: StopOption | null;
  to: StopOption | null;
  date: string;
  time: string;
  loading: boolean;
  onFromChange: (stop: StopOption | null) => void;
  onToChange: (stop: StopOption | null) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onSubmit: () => void;
}

export default function JourneySearchForm({
  from,
  to,
  date,
  time,
  loading,
  onFromChange,
  onToChange,
  onDateChange,
  onTimeChange,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
    >
      <StopAutocomplete label="Da" placeholder="Fermata di partenza" value={from} onChange={onFromChange} />
      <StopAutocomplete label="A" placeholder="Fermata di arrivo" value={to} onChange={onToChange} />

      <div className="flex gap-3">
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
      </div>

      <button
        type="submit"
        disabled={!from || !to || loading}
        className="w-full rounded-lg bg-blue-600 text-white font-medium py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        {loading ? "Cerco il percorso…" : "Cerca percorso"}
      </button>
    </form>
  );
}
