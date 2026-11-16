import { haversineKm, type LatLng } from '../../lib/geo';
import type { RouteEstimate, RouteOptions, RoutingProvider } from './types';

/** Default provider: straight-line distance scaled by a road factor. No keys. */
export const haversineRoutingProvider: RoutingProvider = {
  name: 'haversine',
  async route(from: LatLng, to: LatLng, opts: RouteOptions): Promise<RouteEstimate> {
    return { distanceKm: haversineKm(from, to) * opts.roadFactor };
  },
};
