import { haversineKm, type LatLng } from '../../lib/geo';
import { logger } from '../../lib/logger';
import type { RouteEstimate, RouteOptions, RoutingProvider } from './types';

/**
 * OpenRouteService routing. Falls back to the haversine estimate on any error so
 * a quote never fails because of a routing outage.
 */
export function createOrsRoutingProvider(apiKey: string): RoutingProvider {
  return {
    name: 'ors',
    async route(from: LatLng, to: LatLng, opts: RouteOptions): Promise<RouteEstimate> {
      try {
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;
        const res = await fetch(url, { headers: { Authorization: apiKey } });
        if (!res.ok) throw new Error(`ORS responded ${res.status}`);
        const body = (await res.json()) as {
          features?: { properties?: { summary?: { distance: number; duration: number } } }[];
        };
        const summary = body.features?.[0]?.properties?.summary;
        if (!summary) throw new Error('ORS returned no route');
        return { distanceKm: summary.distance / 1000, durationMin: summary.duration / 60 };
      } catch (err) {
        logger.warn({ err }, 'ORS routing failed, falling back to haversine');
        return { distanceKm: haversineKm(from, to) * opts.roadFactor };
      }
    },
  };
}
