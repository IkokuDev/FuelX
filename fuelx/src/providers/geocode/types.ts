export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export interface GeocodeProvider {
  name: string;
  available: boolean;
  search(query: string, limit?: number): Promise<GeocodeResult[]>;
  reverse(lat: number, lng: number): Promise<GeocodeResult | null>;
}
