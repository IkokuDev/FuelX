import { logger } from '../../lib/logger';
import type { GeocodeProvider, GeocodeResult } from './types';

interface CacheEntry {
  value: GeocodeResult[] | GeocodeResult | null;
  at: number;
}

const CACHE_TTL_MS = 24 * 3600 * 1000;
const MIN_INTERVAL_MS = 1000;

/** Nominatim requires an identifying User-Agent and at most one request per second. */
export function createNominatimProvider(userAgent: string): GeocodeProvider {
  const cache = new Map<string, CacheEntry>();
  let lastRequest = 0;
  let queue: Promise<unknown> = Promise.resolve();

  function fromCache<T>(key: string): T | undefined {
    const hit = cache.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at > CACHE_TTL_MS) {
      cache.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  function toCache(key: string, value: GeocodeResult[] | GeocodeResult | null): void {
    cache.set(key, { value, at: Date.now() });
  }

  /** Serialise every outbound request through a 1 request/second queue. */
  function throttle<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(async () => {
      const wait = MIN_INTERVAL_MS - (Date.now() - lastRequest);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastRequest = Date.now();
      return task();
    });
    queue = run.catch(() => undefined);
    return run;
  }

  const endpoint = 'https://nominatim.openstreetmap.org';

  return {
    name: 'nominatim',
    available: true,
    async search(query: string, limit = 5): Promise<GeocodeResult[]> {
      const key = `s:${query}:${limit}`;
      const cached = fromCache<GeocodeResult[]>(key);
      if (cached) return cached;
      try {
        const url = `${endpoint}/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(query)}`;
        const res = await throttle(() => fetch(url, { headers: { 'User-Agent': userAgent } }));
        if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
        const body = (await res.json()) as { display_name: string; lat: string; lon: string }[];
        const results = body.map((r) => ({
          label: r.display_name,
          lat: Number(r.lat),
          lng: Number(r.lon),
        }));
        toCache(key, results);
        return results;
      } catch (err) {
        logger.warn({ err }, 'Nominatim search failed');
        return [];
      }
    },
    async reverse(lat: number, lng: number): Promise<GeocodeResult | null> {
      const key = `r:${lat.toFixed(4)}:${lng.toFixed(4)}`;
      const cached = fromCache<GeocodeResult | null>(key);
      if (cached !== undefined) return cached;
      try {
        const url = `${endpoint}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
        const res = await throttle(() => fetch(url, { headers: { 'User-Agent': userAgent } }));
        if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
        const body = (await res.json()) as { display_name?: string; lat?: string; lon?: string };
        const result = body.display_name
          ? { label: body.display_name, lat, lng }
          : null;
        toCache(key, result);
        return result;
      } catch (err) {
        logger.warn({ err }, 'Nominatim reverse failed');
        return null;
      }
    },
  };
}
