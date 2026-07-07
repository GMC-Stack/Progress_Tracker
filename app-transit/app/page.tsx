"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import JourneySearchForm from "@/components/JourneySearchForm";
import ItineraryList from "@/components/ItineraryList";
import type { StopOption } from "@/components/StopAutocomplete";
import type { Itinerary } from "@/lib/routing";

const TransitMap = dynamic(() => import("@/components/TransitMap"), { ssr: false });

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Home() {
  const [from, setFrom] = useState<StopOption | null>(null);
  const [to, setTo] = useState<StopOption | null>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSubmit() {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { stopId: from.stop_id },
          to: { stopId: to.stop_id },
          date,
          time,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore durante la ricerca del percorso.");
        setItineraries([]);
      } else {
        setItineraries(data.itineraries ?? []);
        setSelectedIndex(0);
      }
    } catch {
      setError("Impossibile contattare il server. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  const selected = itineraries[selectedIndex] ?? null;

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">DoveVado</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pianificatore di percorsi per il trasporto pubblico di Milano
        </p>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 p-4 min-h-0">
        <div className="flex flex-col gap-4 min-h-0 overflow-auto">
          <JourneySearchForm
            from={from}
            to={to}
            date={date}
            time={time}
            loading={loading}
            onFromChange={setFrom}
            onToChange={setTo}
            onDateChange={setDate}
            onTimeChange={setTime}
            onSubmit={handleSubmit}
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg p-3">{error}</p>
          )}

          {searched && !error && (
            <ItineraryList itineraries={itineraries} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
          )}
        </div>

        <div className="min-h-[400px] lg:min-h-0">
          <TransitMap itinerary={selected} />
        </div>
      </main>
    </div>
  );
}
