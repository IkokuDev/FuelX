export interface InitializeInput {
  reference: string;
  amountKobo: number;
  email: string;
  metadata: Record<string, unknown>;
}

export interface InitializeResult {
  authorizationUrl: string;
  reference: string;
}

export interface VerifyResult {
  status: 'success' | 'failed' | 'abandoned';
  amountKobo: number;
  paidAt?: Date;
}

export interface PaymentProvider {
  name: 'mock' | 'paystack';
  initialize(input: InitializeInput): Promise<InitializeResult>;
  verify(reference: string): Promise<VerifyResult>;
  verifyWebhook(rawBody: Buffer, signature: string): boolean;
}
