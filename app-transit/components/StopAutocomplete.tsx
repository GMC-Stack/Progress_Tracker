"use client";

import { useRef, useState } from "react";

export interface StopOption {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface Props {
  label: string;
  placeholder: string;
  value: StopOption | null;
  onChange: (stop: StopOption | null) => void;
}

export default function StopAutocomplete({ label, placeholder, value, onChange }: Props) {
  const [query, setQuery] = useState(value?.stop_name ?? "");
  const [options, setOptions] = useState<StopOption[]>([]);
  const [open, setOpen] = useState(false);
  const [syncedStopId, setSyncedStopId] = useState(value?.stop_id ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if ((value?.stop_id ?? null) !== syncedStopId) {
    setSyncedStopId(value?.stop_id ?? null);
    setQuery(value?.stop_name ?? "");
  }

  function handleInput(text: string) {
    setQuery(text);
    onChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setOptions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/stops/search?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      setOptions(data.stops ?? []);
      setOpen(true);
    }, 250);
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && options.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          {options.map((opt) => (
            <li key={opt.stop_id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-800"
                onClick={() => {
                  onChange(opt);
                  setQuery(opt.stop_name);
                  setOpen(false);
                }}
              >
                {opt.stop_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
