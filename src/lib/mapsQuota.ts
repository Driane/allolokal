// Quota journalier par appareil pour les APIs Google Maps (localStorage).
// Protège contre une utilisation anormale côté client sans dépenser le moindre euro.
// Les limites sont par appareil/navigateur, pas globales.

const DAILY_LIMITS = {
  mapLoads:       30,  // chargements de carte (Map component)
  placesRequests: 60,  // suggestions autocomplete d'adresse (debounce 350 ms)
} as const;

const KEY = 'allolokal_maps_quota';

interface QuotaState {
  date:           string;
  mapLoads:       number;
  placesRequests: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function read(): QuotaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s: QuotaState = JSON.parse(raw);
      if (s.date === today()) return s;
    }
  } catch { /* ignore */ }
  return { date: today(), mapLoads: 0, placesRequests: 0 };
}

function save(s: QuotaState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function canLoadMap(): boolean {
  return read().mapLoads < DAILY_LIMITS.mapLoads;
}

export function trackMapLoad(): void {
  const s = read();
  save({ ...s, mapLoads: Math.min(s.mapLoads + 1, DAILY_LIMITS.mapLoads) });
}

export function canUsePlaces(): boolean {
  return read().placesRequests < DAILY_LIMITS.placesRequests;
}

export function trackPlacesRequest(): void {
  const s = read();
  save({ ...s, placesRequests: Math.min(s.placesRequests + 1, DAILY_LIMITS.placesRequests) });
}

export const LIMITS = DAILY_LIMITS;
