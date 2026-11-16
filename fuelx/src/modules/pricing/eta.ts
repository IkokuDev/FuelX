/**
 * ETA in whole minutes, rounded up to the next 5 (plan section 10).
 * driverToStationMin defaults to 15 when no eligible driver is known.
 */
export function estimateEtaMinutes(input: {
  driverToStationMin?: number;
  fillSealMinutes: number;
  tripKm: number;
  avgSpeedKmh: number;
}): number {
  const driverToStationMin = input.driverToStationMin ?? 15;
  const tripMin = (input.tripKm / input.avgSpeedKmh) * 60;
  const raw = driverToStationMin + input.fillSealMinutes + tripMin;
  return Math.ceil(raw / 5) * 5;
}
