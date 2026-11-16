import { env } from '../../config/env';
import { haversineRoutingProvider } from './haversine';
import { createOrsRoutingProvider } from './ors';
import type { RouteEstimate, RouteOptions, RoutingProvider } from './types';

export type { RouteEstimate, RouteOptions, RoutingProvider };

let cached: RoutingProvider | null = null;

export function getRoutingProvider(): RoutingProvider {
  if (cached) return cached;
  cached =
    env.ROUTING_DRIVER === 'ors' && env.ORS_API_KEY
      ? createOrsRoutingProvider(env.ORS_API_KEY)
      : haversineRoutingProvider;
  return cached;
}
