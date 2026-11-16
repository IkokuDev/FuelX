export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance between two points in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Metres between two points. */
export function haversineM(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * 1000;
}

export function toGeoPoint(p: LatLng): GeoPoint {
  return { type: 'Point', coordinates: [p.lng, p.lat] };
}

export function fromGeoPoint(g: GeoPoint): LatLng {
  return { lat: g.coordinates[1], lng: g.coordinates[0] };
}

export function isValidLatLng(p: LatLng): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

/**
 * Whether a point lies within `maxKm` of `centre`. Used for the service area.
 * Uses a haversine distance so it is consistent with the pricing engine.
 */
export function isWithinRadiusKm(point: LatLng, centre: LatLng, maxKm: number): boolean {
  return haversineKm(point, centre) <= maxKm;
}

export function withinGeofenceM(a: LatLng, b: LatLng, maxMetres: number): boolean {
  return haversineM(a, b) <= maxMetres;
}

export function roundLatLng(p: LatLng, decimals = 6): LatLng {
  const f = 10 ** decimals;
  return { lat: Math.round(p.lat * f) / f, lng: Math.round(p.lng * f) / f };
}
