/**
 * Typed realtime event map shared by the server and the browser client so the
 * payload shapes cannot drift (plan section 9).
 */
export interface OfferNewPayload {
  offerId: string;
  orderId: string;
  expiresAt: string;
  litres: number;
  fuelType: string;
  pickup: { name: string; lat: number; lng: number };
  dropoffArea: string;
  dropoffApprox: { lat: number; lng: number };
  distanceToStationKm: number;
  tripKm: number;
  earningKobo: number;
}

export interface OfferIdPayload {
  offerId: string;
}

export interface OrderStatusPayload {
  orderId: string;
  status: string;
  at: string;
  note?: string;
}

export interface OrderLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  heading?: number;
  remainingKm: number;
  etaMinutes: number;
  at: string;
}

export interface OrderSealedPayload {
  orderId: string;
  sealCodes: string[];
  photoUrls: string[];
}

export interface WalletUpdatePayload {
  balanceKobo: number;
  ownerId: string;
}

export interface AdminDriverPayload {
  driverId: string;
  lat: number;
  lng: number;
  isOnline: boolean;
  currentOrderId: string | null;
}

export type AdminOrderPayload = Record<string, unknown>;

export interface ServerToClientEvents {
  'offer:new': (payload: OfferNewPayload) => void;
  'offer:expired': (payload: OfferIdPayload) => void;
  'offer:cancelled': (payload: OfferIdPayload) => void;
  'order:status': (payload: OrderStatusPayload) => void;
  'order:location': (payload: OrderLocationPayload) => void;
  'order:sealed': (payload: OrderSealedPayload) => void;
  'wallet:update': (payload: WalletUpdatePayload) => void;
  'admin:order': (payload: AdminOrderPayload) => void;
  'admin:driver': (payload: AdminDriverPayload) => void;
  'admin:alert': (payload: { message: string; orderId?: string }) => void;
}

export interface ClientToServerEvents {
  'driver:location': (
    payload: {
      lat: number;
      lng: number;
      heading?: number;
      speedKmh?: number;
      accuracyM?: number;
      ts?: number;
    },
    ack?: (res: { ok: boolean; error?: string }) => void,
  ) => void;
  'order:subscribe': (
    payload: { orderId: string },
    ack?: (res: { ok: boolean; snapshot?: unknown; error?: string }) => void,
  ) => void;
  'order:unsubscribe': (payload: { orderId: string }) => void;
}

export type ServerEventName = keyof ServerToClientEvents;
