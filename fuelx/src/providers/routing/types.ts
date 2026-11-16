import type { LatLng } from '../../lib/geo';

export interface RouteOptions {
  /** Multiplier applied to the straight-line distance to approximate roads. */
  roadFactor: number;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMin?: number;
}

export interface RoutingProvider {
  name: string;
  route(from: LatLng, to: LatLng, opts: RouteOptions): Promise<RouteEstimate>;
}
