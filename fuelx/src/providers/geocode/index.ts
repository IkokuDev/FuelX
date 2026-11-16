import { env } from '../../config/env';
import { createNominatimProvider } from './nominatim';
import type { GeocodeProvider } from './types';

export type { GeocodeProvider, GeocodeResult } from './types';

const noneProvider: GeocodeProvider = {
  name: 'none',
  available: false,
  async search() {
    return [];
  },
  async reverse() {
    return null;
  },
};

let cached: GeocodeProvider | null = null;

export function getGeocodeProvider(): GeocodeProvider {
  if (cached) return cached;
  cached = env.GEOCODE_DRIVER === 'nominatim' ? createNominatimProvider(env.GEOCODE_USER_AGENT) : noneProvider;
  return cached;
}
