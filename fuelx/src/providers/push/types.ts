export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushProvider {
  name: string;
  send(subscription: PushSubscriptionKeys, payload: PushPayload): Promise<void>;
}
