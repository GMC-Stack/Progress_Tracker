/**
 * Persistenza lato client (localStorage) per viaggi salvati e ricerche recenti,
 * esposta come external store così i componenti la leggono con
 * useSyncExternalStore (idratazione SSR-safe, aggiornamenti reattivi).
 */

import type { StopOption } from "@/components/StopAutocomplete";

export interface SavedJourneyLeg {
  mode: "WALK" | "TRANSIT";
  routeShortName?: string;
  routeType?: number;
  fromStopName: string;
  toStopName: string;
  departureSeconds: number;
  arrivalSeconds: number;
}

export interface SavedJourney {
  id: string;
  savedAt: number;
  /** Data del viaggio in formato ISO (yyyy-mm-dd). */
  date: string;
  fromName: string;
  toName: string;
  departureSeconds: number;
  arrivalSeconds: number;
  transfers: number;
  legs: SavedJourneyLeg[];
  /** Orario di arrivo effettivo inserito dall'utente (HH:MM). */
  actualArrivalTime?: string;
}

export interface RecentSearch {
  from: StopOption;
  to: StopOption;
  ts: number;
}

const JOURNEYS_KEY = "dovevado:journeys";
const RECENT_KEY = "dovevado:recent";
const MAX_RECENT = 5;

const EMPTY_JOURNEYS: SavedJourney[] = [];
const EMPTY_RECENT: RecentSearch[] = [];

let journeysCache: SavedJourney[] | null = null;
let recentCache: RecentSearch[] | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeStorage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getJourneysSnapshot(): SavedJourney[] {
  if (journeysCache === null) journeysCache = readJson(JOURNEYS_KEY, EMPTY_JOURNEYS);
  return journeysCache;
}

export function getJourneysServerSnapshot(): SavedJourney[] {
  return EMPTY_JOURNEYS;
}

export function setJourneys(journeys: SavedJourney[]) {
  journeysCache = journeys;
  window.localStorage.setItem(JOURNEYS_KEY, JSON.stringify(journeys));
  emit();
}

export function getRecentSnapshot(): RecentSearch[] {
  if (recentCache === null) recentCache = readJson(RECENT_KEY, EMPTY_RECENT);
  return recentCache;
}

export function getRecentServerSnapshot(): RecentSearch[] {
  return EMPTY_RECENT;
}

export function addRecentSearch(from: StopOption, to: StopOption) {
  const current = getRecentSnapshot().filter(
    (r) => !(r.from.stop_id === from.stop_id && r.to.stop_id === to.stop_id)
  );
  recentCache = [{ from, to, ts: Date.now() }, ...current].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentCache));
  emit();
}
