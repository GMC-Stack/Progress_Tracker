"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import JourneySearchForm from "@/components/JourneySearchForm";
import ItineraryList from "@/components/ItineraryList";
import MyJourneys from "@/components/MyJourneys";
import type { StopOption } from "@/components/StopAutocomplete";
import type { Itinerary } from "@/lib/routing";
import {
  addRecentSearch,
  getJourneysServerSnapshot,
  getJourneysSnapshot,
  getRecentServerSnapshot,
  getRecentSnapshot,
  setJourneys,
  subscribeStorage,
  type RecentSearch,
  type SavedJourney,
} from "@/lib/storage";

const TransitMap = dynamic(() => import("@/components/TransitMap"), { ssr: false });

type GeoPoint = { lat: number; lon: number };
type Tab = "search" | "journeys";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("search");
  const [from, setFrom] = useState<StopOption | null>(null);
  const [to, setTo] = useState<StopOption | null>(null);
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const savedMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recent = useSyncExternalStore(subscribeStorage, getRecentSnapshot, getRecentServerSnapshot);
  const journeys = useSyncExternalStore(subscribeStorage, getJourneysSnapshot, getJourneysServerSnapshot);

  function useMyPosition() {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("La geolocalizzazione non è disponibile su questo dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setFrom(null);
      },
      () => setGeoError("Non riesco a rilevare la posizione. Controlla i permessi del browser."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function resetToNow() {
    setDate(todayISO());
    setTime(nowHHMM());
  }

  async function handleSubmit(fromOverride?: StopOption, toOverride?: StopOption) {
    const effectiveFrom = fromOverride ?? from;
    const effectiveTo = toOverride ?? to;
    if ((!effectiveFrom && !geo) || !effectiveTo) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: geo ?? { stopId: effectiveFrom!.stop_id },
          to: { stopId: effectiveTo.stop_id },
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
        if (effectiveFrom && effectiveTo && (data.itineraries ?? []).length > 0) {
          addRecentSearch(effectiveFrom, effectiveTo);
        }
      }
    } catch {
      setError("Impossibile contattare il server. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function runRecent(search: RecentSearch) {
    setGeo(null);
    setFrom(search.from);
    setTo(search.to);
    handleSubmit(search.from, search.to);
  }

  function saveJourney(itinerary: Itinerary) {
    const journey: SavedJourney = {
      id: crypto.randomUUID(),
      savedAt: Date.now(),
      date,
      fromName: itinerary.legs[0]?.fromStopName ?? from?.stop_name ?? "Partenza",
      toName: itinerary.legs[itinerary.legs.length - 1]?.toStopName ?? to?.stop_name ?? "Arrivo",
      departureSeconds: itinerary.departureSeconds,
      arrivalSeconds: itinerary.arrivalSeconds,
      transfers: itinerary.transfers,
      legs: itinerary.legs.map((leg) => ({
        mode: leg.mode,
        routeShortName: leg.routeShortName,
        routeType: leg.routeType,
        fromStopName: leg.fromStopName,
        toStopName: leg.toStopName,
        departureSeconds: leg.departureSeconds,
        arrivalSeconds: leg.arrivalSeconds,
      })),
    };
    setJourneys([journey, ...journeys]);
    setSavedMessage("Viaggio salvato ✓");
    if (savedMessageTimer.current) clearTimeout(savedMessageTimer.current);
    savedMessageTimer.current = setTimeout(() => setSavedMessage(null), 3000);
  }

  function updateJourneys(next: SavedJourney[]) {
    setJourneys(next);
  }

  const selected = itineraries[selectedIndex] ?? null;

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">DoveVado</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pianificatore di percorsi per il trasporto pubblico di Milano
          </p>
        </div>
        <nav className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setTab("search")}
            className={`px-4 py-2 font-medium ${
              tab === "search" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            🔍 Cerca percorso
          </button>
          <button
            type="button"
            onClick={() => setTab("journeys")}
            className={`px-4 py-2 font-medium ${
              tab === "journeys" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            🎫 I miei viaggi{journeys.length > 0 ? ` (${journeys.length})` : ""}
          </button>
        </nav>
      </header>

      {tab === "journeys" ? (
        <main className="flex-1 p-4 max-w-2xl w-full mx-auto">
          <MyJourneys journeys={journeys} onUpdate={updateJourneys} />
        </main>
      ) : (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4 p-4 min-h-0">
          <div className="flex flex-col gap-4 min-h-0 overflow-auto">
            <JourneySearchForm
              from={from}
              to={to}
              geoActive={geo !== null}
              geoError={geoError}
              date={date}
              time={time}
              loading={loading}
              onFromChange={setFrom}
              onToChange={setTo}
              onUseMyPosition={useMyPosition}
              onClearGeo={() => setGeo(null)}
              onSwap={swap}
              onDateChange={setDate}
              onTimeChange={setTime}
              onNow={resetToNow}
              onSubmit={() => handleSubmit()}
            />

            {recent.length > 0 && !searched && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Ricerche recenti</p>
                <div className="flex flex-col gap-1.5">
                  {recent.map((r) => (
                    <button
                      key={`${r.from.stop_id}-${r.to.stop_id}`}
                      type="button"
                      onClick={() => runRecent(r)}
                      className="text-left text-sm rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 hover:border-blue-300 bg-white dark:bg-gray-950"
                    >
                      🕘 {r.from.stop_name} → {r.to.stop_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg p-3">{error}</p>
            )}

            {searched && !error && !loading && (
              <ItineraryList
                itineraries={itineraries}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onSave={saveJourney}
                savedMessage={savedMessage}
              />
            )}
          </div>

          <div className="min-h-[400px] lg:min-h-0">
            <TransitMap itinerary={selected} />
          </div>
        </main>
      )}
    </div>
  );
}
