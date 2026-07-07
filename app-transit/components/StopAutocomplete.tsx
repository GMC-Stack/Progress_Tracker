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
  const [highlight, setHighlight] = useState(-1);
  const [syncedStopId, setSyncedStopId] = useState(value?.stop_id ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if ((value?.stop_id ?? null) !== syncedStopId) {
    setSyncedStopId(value?.stop_id ?? null);
    setQuery(value?.stop_name ?? "");
  }

  function select(opt: StopOption) {
    onChange(opt);
    setQuery(opt.stop_name);
    setOpen(false);
    setHighlight(-1);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setOptions([]);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.focus();
  }

  function handleInput(text: string) {
    setQuery(text);
    onChange(null);
    setHighlight(-1);
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? options.length - 1 : h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(options[highlight >= 0 ? highlight : 0]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => options.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          aria-label={label}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={clear}
            aria-label={`Cancella campo ${label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm leading-none"
          >
            ✕
          </button>
        )}
      </div>
      {open && options.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          {options.map((opt, idx) => (
            <li key={opt.stop_id}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-800 ${
                  idx === highlight ? "bg-blue-50 dark:bg-gray-800" : ""
                }`}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => select(opt)}
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
